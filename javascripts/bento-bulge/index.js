import { measureCells, cellAtPoint, pointerToNorm } from "./cells.js";
import {
  createBulgeField,
  setCellTarget,
  setCursorTarget,
  updateBulgeField,
  isFieldMorphing,
  isDimMorphing
} from "./field.js";
import { createTextureManager } from "./textures.js";
import { createSurface } from "./surface.js";
import { createDialkit, initParams } from "./dialkit.js";
import { createCustomCursor } from "./cursor.js";
import { getEffectiveDpr } from "./dpr.js";
import { createPerfMonitor, isPerfEnabled, noopPerf } from "./perf.js";

let instance = null;
let whenReadyResolve = null;

const whenReadyPromise = new Promise((resolve) => {
  whenReadyResolve = resolve;
});

export function getBulgeWhenReady() {
  return whenReadyPromise;
}

function resolveWhenReady(api) {
  if (whenReadyResolve) {
    whenReadyResolve(api);
    whenReadyResolve = null;
  }
}

function canUseWebGL(params) {
  if (params.forceWebGL) return { ok: true };

  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    return { ok: false, reason: "coarse pointer or no hover" };
  }
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return { ok: false, reason: "prefers-reduced-motion" };
  }
  if (navigator.deviceMemory && navigator.deviceMemory < 4) {
    return { ok: false, reason: "low device memory" };
  }

  try {
    const test = document.createElement("canvas");
    const gl = test.getContext("webgl2") || test.getContext("webgl");
    if (!gl) return { ok: false, reason: "WebGL unavailable" };
    const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    if (maxTex < 2048) return { ok: false, reason: "texture size too small" };
  } catch {
    return { ok: false, reason: "WebGL context failed" };
  }

  return { ok: true };
}

function clearDomLayers(layout) {
  layout.cells.forEach((cell) => {
    cell.el.style.opacity = "";
    cell.el.classList.remove("is-bulge-dom-hidden");
  });
}

function promoteGridVideos(layout) {
  const cells = layout.cells
    .filter((cell) => cell.hasVideo && cell.video)
    .sort((a, b) => b.width * b.height - a.width * a.height);

  const immediate = 3;
  const staggerMs = 100;

  cells.forEach((cell, index) => {
    const video = cell.video;
    const start = () => {
      video.preload = "auto";
      video.play().catch(() => {});
    };
    if (index < immediate) {
      start();
    } else {
      window.setTimeout(start, (index - immediate) * staggerMs + 500);
    }
  });
}

export function initBentoBulge(options = {}) {
  if (instance) instance.dispose();

  const bento = document.querySelector(options.bento || "#grid");
  const projectsEl = document.querySelector(options.projects || "#portfolio");
  const hoverClass = options.hoverClass || "is-bulge-hovered";
  const onReady = options.onReady || (() => {});
  const cellOpts = {
    cellSelector: options.cellSelector || ".tile",
    imgSelector: options.imgSelector || ".tile__media img",
    videoSelector: options.videoSelector || ".tile__media video"
  };

  if (!bento || !projectsEl) {
    console.warn("[bento-bulge] missing grid container");
    resolveWhenReady(null);
    onReady(null);
    return null;
  }

  const params = initParams();
  params.cornerRadius = options.cornerRadius ?? params.cornerRadius ?? 8;
  const perf = isPerfEnabled() ? createPerfMonitor() : noopPerf;

  const customCursor = createCustomCursor();
  let onParamsChange = function () {};

  const capability = canUseWebGL(params);
  if (!capability.ok) {
    console.info("[bento-bulge] fallback:", capability.reason);
    const dialkit = createDialkit(document.body, params, () => onParamsChange());
    initFallbackHover(bento, cellOpts.cellSelector, hoverClass);
    const fallbackApi = { dispose: () => { customCursor.dispose(); dialkit.dispose(); perf.dispose(); }, params };
    resolveWhenReady(fallbackApi);
    onReady(fallbackApi);
    return fallbackApi;
  }

  const dpr = getEffectiveDpr(params);
  let layout = measureCells(bento, dpr, cellOpts);

  if (layout.width < 1 || layout.height < 1) {
    const retries = options._retries || 0;
    if (retries < 60) {
      requestAnimationFrame(() => {
        initBentoBulge({ ...options, _retries: retries + 1 });
      });
      return null;
    }
    console.warn("[bento-bulge] grid has no measurable size");
    const dialkit = createDialkit(document.body, params, () => onParamsChange());
    const failApi = { dispose: () => { customCursor.dispose(); dialkit.dispose(); perf.dispose(); }, params, dialkit };
    resolveWhenReady(failApi);
    onReady(failApi);
    return failApi;
  }

  promoteGridVideos(layout);

  const dialkit = createDialkit(document.body, params, () => onParamsChange());
  const field = createBulgeField(params);
  const textureManager = createTextureManager(params.cornerRadius);
  const maxVideos = () => params.maxConcurrentVideoTextures;
  const initialVideoState = textureManager.syncVideoSlots(layout, params.enableVideos, maxVideos());
  textureManager.rebuildStatic(layout, dpr);

  let surface;
  try {
    surface = createSurface(bento, layout, params, textureManager.texture, textureManager.emptyTexture);
  } catch (err) {
    console.error("[bento-bulge] WebGL surface failed:", err);
    initFallbackHover(bento, cellOpts.cellSelector, hoverClass);
    const failApi = { dispose: () => { customCursor.dispose(); dialkit.dispose(); perf.dispose(); }, params, dialkit };
    resolveWhenReady(failApi);
    onReady(failApi);
    return failApi;
  }

  let activeCellData = null;
  let hoveredTileEl = null;
  let pointerInside = false;
  let overlayOpen = false;
  let rafScheduled = false;
  let needsRender = false;
  let lastTime = performance.now();
  let running = true;
  let slowFrames = 0;
  let handoffDone = false;
  let readyFired = false;
  let tabVisible = document.visibilityState === "visible";
  let gridVisible = true;
  let cachedRect = null;
  let cachedRectTime = 0;

  function isSystemActive() {
    return running && tabVisible && gridVisible;
  }

  function getBentoRect() {
    const now = performance.now();
    if (!cachedRect || now - cachedRectTime > 32) {
      cachedRect = bento.getBoundingClientRect();
      cachedRectTime = now;
    }
    return cachedRect;
  }

  function invalidateRectCache() {
    cachedRect = null;
  }

  function markDirty() {
    if (!isSystemActive()) return;
    if (needsRender) perf.recordCoalesce();
    needsRender = true;
    perf.recordDirty();
    scheduleFrame();
  }

  function scheduleFrame() {
    if (rafScheduled) return;
    rafScheduled = true;
    requestAnimationFrame(tick);
  }

  function wantsContinuousRender() {
    if (overlayOpen) {
      return (
        isFieldMorphing(field) ||
        field.bulgeAmount > 0.01 ||
        field.projectStrength > 0.01
      );
    }
    return (
      pointerInside ||
      isFieldMorphing(field) ||
      isDimMorphing(field) ||
      field.bulgeAmount > 0.01 ||
      field.projectStrength > 0.01
    );
  }

  function pauseGridVideos() {
    layout.cells.forEach((cell) => {
      if (cell.video && !cell.video.paused) cell.video.pause();
    });
  }

  function resumeGridVideos() {
    if (!params.enableVideos) return;
    layout.cells.forEach((cell) => {
      if (cell.video && cell.video.paused) cell.video.play().catch(() => {});
    });
    markDirty();
  }

  function performHandoff() {
    if (handoffDone) return;
    handoffDone = true;
    bento.classList.add("grid--bulge-active");
    surface.canvas.classList.add("is-bulge-surface-ready");
  }

  function fireReady() {
    if (readyFired) return;
    readyFired = true;
    performHandoff();
    resolveWhenReady(api);
    onReady(api);
  }

  function checkHandoff() {
    if (handoffDone || readyFired) return;
    const hasVideoTiles = layout.cells.some((cell) => cell.hasVideo);
    const videosOk =
      !hasVideoTiles ||
      !params.enableVideos ||
      textureManager.getSlotCount() > 0;
    if (textureManager.hasAtlas() && videosOk) {
      fireReady();
    }
  }

  function drawFrame() {
    if (!overlayOpen) {
      const videoState = textureManager.syncVideoSlotsAndAtlas(
        layout,
        dpr,
        params.enableVideos,
        maxVideos()
      );
      surface.updateVideoSlots(videoState);
    }
    surface.updateFromField(field, params);
    const frameStart = performance.now();
    surface.render();
    const frameMs = performance.now() - frameStart;
    perf.recordRender(frameMs);
    perf.update({
      videos: layout.cells.filter((c) => c.hasVideo && c.video && !c.video.paused).length,
      slots: textureManager.getSlotCount()
    });

    if (frameMs > 20) {
      slowFrames += 1;
      if (slowFrames >= 3 && params.maxConcurrentVideoTextures > 2) {
        params.maxConcurrentVideoTextures = Math.max(2, params.maxConcurrentVideoTextures - 1);
        slowFrames = 0;
      }
    } else {
      slowFrames = 0;
    }

    checkHandoff();
  }

  function tick(now) {
    rafScheduled = false;
    if (!running || !isSystemActive()) return;

    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    updateBulgeField(field, params, dt);

    const continuous = wantsContinuousRender();
    const shouldDraw = continuous || needsRender;
    if (!shouldDraw) return;

    drawFrame();
    needsRender = false;

    if (continuous) {
      scheduleFrame();
    }
  }

  function applyDimOpacityVar() {
    bento.style.setProperty("--bento-dim-opacity", String(params.dimOpacity));
  }

  function handleParamsChange() {
    dialkit.persist();
    applyDimOpacityVar();
    remeasure();
    markDirty();
  }

  onParamsChange = handleParamsChange;
  applyDimOpacityVar();

  function remeasure() {
    layout = measureCells(bento, dpr, cellOpts);
    invalidateRectCache();
    surface.resize(layout);
    const videoState = textureManager.syncVideoSlotsAndAtlas(
      layout,
      dpr,
      params.enableVideos,
      maxVideos()
    );
    surface.updateVideoSlots(videoState);
    surface.updateFromField(field, params);
  }

  function overlayDimAmount() {
    const raw = getComputedStyle(bento).getPropertyValue("--bento-overlay-dim").trim();
    const value = parseFloat(raw);
    return Number.isFinite(value) ? value : 0.35;
  }

  function setOverlayOpen(open) {
    overlayOpen = open;
    pointerInside = false;
    activeCellData = null;
    syncHoveredTileClass(null);
    setCellTarget(field, null, params, layout);
    setCursorTarget(field, { x: 0.5, y: 0.5 }, null, params, layout);
    surface.setOverlayDim(1);
    surface.canvas.style.opacity = open ? String(overlayDimAmount()) : "1";
    surface.updateFromField(field, params);
    markDirty();
    scheduleFrame();
    if (!open) remeasure();
  }

  function syncHoveredTileClass(hit) {
    const next = hit?.el ?? null;
    if (next === hoveredTileEl) return;
    if (hoveredTileEl) hoveredTileEl.classList.remove(hoverClass);
    if (next) next.classList.add(hoverClass);
    hoveredTileEl = next;
  }

  function onPointerMove(event) {
    if (overlayOpen) return;
    const containerRect = getBentoRect();
    const inside =
      event.clientX >= containerRect.left &&
      event.clientX <= containerRect.right &&
      event.clientY >= containerRect.top &&
      event.clientY <= containerRect.bottom;

    pointerInside = inside;
    const hit = cellAtPoint(layout.cells, containerRect, event.clientX, event.clientY);

    if (!inside || !hit) {
      activeCellData = null;
      syncHoveredTileClass(null);
      setCellTarget(field, null, params, layout);
      setCursorTarget(field, { x: 0.5, y: 0.5 }, null, params, layout);
      return;
    }

    activeCellData = hit;
    syncHoveredTileClass(hit);
    setCellTarget(field, hit, params, layout);

    const norm = pointerToNorm(layout, containerRect, event.clientX, event.clientY, surface.camera);
    setCursorTarget(field, norm, hit, params, layout);
  }

  function onPointerLeave() {
    if (overlayOpen) return;
    pointerInside = false;
    activeCellData = null;
    syncHoveredTileClass(null);
    setCellTarget(field, null, params, layout);
  }

  function onPointerMoveWrapped(event) {
    if (overlayOpen) return;
    onPointerMove(event);
    markDirty();
    scheduleFrame();
  }

  function onPointerLeaveWrapped() {
    if (overlayOpen) return;
    onPointerLeave();
    markDirty();
    scheduleFrame();
  }

  function onVisibilityChange() {
    tabVisible = document.visibilityState === "visible";
    if (tabVisible) {
      resumeGridVideos();
      markDirty();
      scheduleFrame();
    } else {
      pauseGridVideos();
      rafScheduled = false;
    }
  }

  function onResizeDebounced() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      remeasure();
      markDirty();
      scheduleFrame();
    }, 120);
  }

  let resizeTimer;

  layout.cells.forEach((cell) => {
    if (cell.img && !cell.img.complete) {
      cell.img.addEventListener("load", () => {
        textureManager.scheduleRebuild(layout, dpr);
        markDirty();
      }, { once: true });
    }
    if (cell.video && cell.video.readyState < 2) {
      cell.video.addEventListener("loadeddata", () => {
        const videoState = textureManager.syncVideoSlotsAndAtlas(
          layout,
          dpr,
          params.enableVideos,
          maxVideos()
        );
        surface.updateVideoSlots(videoState);
        markDirty();
      }, { once: true });
    }
  });

  textureManager.bindVideoFrameWatchers(layout.cells, markDirty);

  document.addEventListener("pointermove", onPointerMoveWrapped, { passive: true });
  document.documentElement.addEventListener("mouseleave", onPointerLeaveWrapped);
  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("resize", onResizeDebounced);
  window.addEventListener("pagehide", dispose);

  const gridObserver = new IntersectionObserver(
    (entries) => {
      gridVisible = entries.some((entry) => entry.isIntersecting);
      if (gridVisible) {
        resumeGridVideos();
        markDirty();
        scheduleFrame();
      } else {
        pauseGridVideos();
        rafScheduled = false;
      }
    },
    { threshold: 0.1 }
  );
  gridObserver.observe(bento);

  const resizeObserver = new ResizeObserver(onResizeDebounced);
  resizeObserver.observe(bento);

  function dispose() {
    if (!running) return;
    running = false;
    rafScheduled = false;
    document.removeEventListener("pointermove", onPointerMoveWrapped);
    document.documentElement.removeEventListener("mouseleave", onPointerLeaveWrapped);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("resize", onResizeDebounced);
    window.removeEventListener("pagehide", dispose);
    gridObserver.disconnect();
    resizeObserver.disconnect();
    clearTimeout(resizeTimer);
    clearDomLayers(layout);
    textureManager.dispose();
    surface.dispose();
    customCursor.dispose();
    dialkit.dispose();
    perf.dispose();
    bento.classList.remove("grid--bulge-active");
    if (instance === api) instance = null;
  }

  surface.updateFromField(field, params);
  surface.updateVideoSlots(initialVideoState);
  needsRender = true;
  scheduleFrame();

  const api = {
    dispose,
    params,
    remeasure,
    setOverlayOpen,
    onParamsChange: handleParamsChange,
    whenReady: whenReadyPromise
  };
  instance = api;
  window.BentoBulge = api;

  window.setTimeout(() => {
    if (readyFired) return;
    if (!textureManager.hasAtlas()) return;
    fireReady();
  }, 2500);

  return api;
}

function initFallbackHover(bento, cellSelector, hoverClass) {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  const cells = bento.querySelectorAll(cellSelector || ".tile");
  let activeCell = null;

  function setHovered(cell) {
    if (cell === activeCell) return;
    if (activeCell) activeCell.classList.remove(hoverClass || "is-bulge-hovered");
    activeCell = cell;
    if (activeCell) activeCell.classList.add(hoverClass || "is-bulge-hovered");
  }

  document.addEventListener("pointermove", (e) => {
    const hit = [...cells].find((cell) => {
      const r = cell.getBoundingClientRect();
      return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    });
    setHovered(hit || null);
  }, { passive: true });

  document.documentElement.addEventListener("mouseleave", () => setHovered(null));
}

export function disposeBentoBulge() {
  if (instance) instance.dispose();
}
