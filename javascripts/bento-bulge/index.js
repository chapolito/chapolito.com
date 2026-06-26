import { measureCells, cellAtPoint } from "./cells.js";
import {
  createBulgeField,
  setCellTarget,
  setPressTarget,
  snapPressState,
  snapOverlayDim,
  snapCellDims,
  updateBulgeField,
  isFieldMorphing,
  isDimMorphing
} from "./field.js";
import { createTextureManager, isVideoReady } from "./textures.js";
import { createSurface } from "./surface.js";
import { initParams } from "./dialkit.js";
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

function canUseWebGL() {
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
    cell.el.style.removeProperty("--bento-label-opacity");
    cell.el.style.removeProperty("--bento-label-blur");
    cell.el.classList.remove("is-bulge-dom-hidden");
  });
}

function syncLabelOpacity(layout, field) {
  layout.cells.forEach((cell) => {
    const dim = field.cellDimAmounts[cell.index] ?? 0;
    // Cut the low-opacity tail so blurred text doesn't linger as a smear.
    const opacity = dim < 0.04 ? 0 : dim;
    const blur = opacity <= 0 ? 0 : Math.min(5, (1 - dim) * 5);
    const prevOpacity = cell.el.style.getPropertyValue("--bento-label-opacity");
    const prevBlur = cell.el.style.getPropertyValue("--bento-label-blur");
    const nextOpacity = String(opacity);
    const nextBlur = `${blur}px`;
    if (prevOpacity === nextOpacity && prevBlur === nextBlur) return;
    cell.el.style.setProperty("--bento-label-opacity", nextOpacity);
    cell.el.style.setProperty("--bento-label-blur", nextBlur);
  });
}

function bootDomGridVideos(bento, cellOpts, params) {
  if (!params.enableVideos) return;
  const layout = measureCells(bento, 1, cellOpts);
  promoteGridVideos(layout, params.pauseIdleVideos);
}

function promoteGridVideos(layout, pauseIdleVideos = false) {
  const cells = layout.cells
    .filter((cell) => cell.hasVideo && cell.video)
    .sort((a, b) => b.width * b.height - a.width * a.height);

  const immediate = 3;
  const staggerMs = 100;

  cells.forEach((cell, index) => {
    const video = cell.video;
    video.preload = "auto";
    if (pauseIdleVideos) return;

    const start = () => {
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

  const capability = canUseWebGL();
  if (!capability.ok) {
    console.info("[bento-bulge] fallback:", capability.reason);
    bootDomGridVideos(bento, cellOpts, params);
    initFallbackHover(bento, cellOpts.cellSelector, hoverClass);
    const fallbackApi = {
      dispose: () => {
        customCursor.dispose();
        perf.dispose();
      },
      params,
      // Overlay dim is CSS-only when WebGL is unavailable (see home.css / bento-bulge.css).
      setOverlayOpen() {}
    };
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
    const failApi = {
      dispose: () => {
        customCursor.dispose();
        perf.dispose();
      },
      params,
      setOverlayOpen() {}
    };
    resolveWhenReady(failApi);
    onReady(failApi);
    return failApi;
  }

  promoteGridVideos(layout, params.pauseIdleVideos);

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
    bootDomGridVideos(bento, cellOpts, params);
    initFallbackHover(bento, cellOpts.cellSelector, hoverClass);
    const failApi = {
      dispose: () => {
        customCursor.dispose();
        perf.dispose();
      },
      params,
      setOverlayOpen() {}
    };
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
  let lastPlaybackHitIndex = -1;
  let lastDrawAt = 0;
  let wasContinuous = false;

  const MORPH_MAX_FPS = 60;

  function isSystemActive() {
    return running && tabVisible && (gridVisible || !readyFired);
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

  function markDirty(options = {}) {
    if (!isSystemActive()) return;
    if (!options.force && readyFired && wantsContinuousRender()) {
      perf.recordCoalesce();
      return;
    }
    if (needsRender) {
      perf.recordCoalesce();
      return;
    }
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
    if (!readyFired) return true;
    if (overlayOpen) {
      return (
        isFieldMorphing(field) ||
        Math.abs(field.overlayDim - field.targetOverlayDim) > 0.008
      );
    }
    return isFieldMorphing(field) || isDimMorphing(field);
  }

  function pauseGridVideos() {
    layout.cells.forEach((cell) => {
      if (cell.video && !cell.video.paused) cell.video.pause();
    });
  }

  const IDLE_VIDEO_MS = 1000 / 24;
  let videoLoopTimer = 0;

  function stopVideoLoop() {
    if (videoLoopTimer) {
      clearTimeout(videoLoopTimer);
      videoLoopTimer = 0;
    }
  }

  function scheduleVideoLoop() {
    if (videoLoopTimer || !hasPlayingVideos() || wantsContinuousRender()) return;
    videoLoopTimer = window.setTimeout(() => {
      videoLoopTimer = 0;
      if (!running || !isSystemActive() || !hasPlayingVideos() || wantsContinuousRender()) return;
      needsRender = true;
      scheduleFrame();
      scheduleVideoLoop();
    }, IDLE_VIDEO_MS);
  }

  function syncVideoLoop() {
    if (!hasPlayingVideos() || wantsContinuousRender()) {
      stopVideoLoop();
      return;
    }
    scheduleVideoLoop();
  }

  function hasPlayingVideos() {
    if (!params.enableVideos || overlayOpen) return false;
    return layout.cells.some((cell) => cell.hasVideo && cell.video && !cell.video.paused);
  }

  function syncVideoPlayback(activeHit = activeCellData) {
    if (!params.enableVideos) return;

    if (overlayOpen) {
      pauseGridVideos();
      lastPlaybackHitIndex = -1;
      return;
    }

    const hitIndex = activeHit?.index ?? -1;
    let playbackChanged = hitIndex !== lastPlaybackHitIndex;

    layout.cells.forEach((cell) => {
      if (!cell.video) return;

      if (!params.pauseIdleVideos) {
        if (cell.video.paused) {
          cell.video.play().catch(() => {});
          playbackChanged = true;
        }
        return;
      }

      const isActive = activeHit && cell.index === activeHit.index;
      if (isActive) {
        if (cell.video.paused) {
          cell.video.play().catch(() => {});
          playbackChanged = true;
        }
      } else if (!cell.video.paused) {
        cell.video.pause();
        playbackChanged = true;
      }
    });

    lastPlaybackHitIndex = hitIndex;
    if (playbackChanged) markDirty();
    syncVideoLoop();
  }

  function performHandoff() {
    if (handoffDone) return;
    handoffDone = true;
    bento.classList.add("grid--bulge-active");
    surface.canvas.classList.add("is-bulge-surface-ready");
    syncVideoMedia();
  }

  function syncVideoMedia() {
    if (overlayOpen) return;

    const prevSlots = textureManager.getVideoState()?.cellSlots;
    textureManager.markVideoSlotsDirty();
    const videoState = textureManager.syncVideoSlotsAndAtlas(
      layout,
      dpr,
      params.enableVideos,
      maxVideos()
    );
    const slotsChanged =
      !prevSlots || videoState.cellSlots.some((slot, i) => slot !== prevSlots[i]);
    if (!slotsChanged) {
      syncVideoLoop();
      return;
    }

    syncVideoPlayback();
    surface.updateVideoSlots(videoState);
    markDirty({ force: true });
    syncVideoLoop();
  }

  let syncVideoMediaRaf = 0;
  function scheduleSyncVideoMedia() {
    if (syncVideoMediaRaf) return;
    syncVideoMediaRaf = requestAnimationFrame(() => {
      syncVideoMediaRaf = 0;
      syncVideoMedia();
    });
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
    if (textureManager.hasAtlas()) {
      fireReady();
    }
  }

  function finishBootRender() {
    surface.updateFromField(field, params);
    surface.updateVideoSlots(initialVideoState);
    surface.render();
    checkHandoff();
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
      mode: wantsContinuousRender() ? "morph" : "idle",
      videos: layout.cells.filter((c) => c.hasVideo && c.video && !c.video.paused).length,
      slots: textureManager.getSlotCount()
    });

    if (frameMs > 20) {
      slowFrames += 1;
      if (slowFrames >= 3 && params.maxConcurrentVideoTextures > 2) {
        params.maxConcurrentVideoTextures = Math.max(2, params.maxConcurrentVideoTextures - 1);
        textureManager.markVideoSlotsDirty();
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

    updateBulgeField(field, params, dt, { overlayOpen });
    syncLabelOpacity(layout, field);

    const continuous = wantsContinuousRender();
    if (wasContinuous && !continuous) needsRender = true;
    wasContinuous = continuous;

    const shouldDraw = continuous || needsRender;
    if (!shouldDraw) {
      if (!continuous) syncVideoLoop();
      return;
    }

    const morphThrottle =
      continuous && MORPH_MAX_FPS > 0 && !needsRender;
    const minDrawInterval = morphThrottle ? 1000 / MORPH_MAX_FPS : 0;
    if (morphThrottle && now - lastDrawAt < minDrawInterval) {
      stopVideoLoop();
      scheduleFrame();
      return;
    }

    drawFrame();
    lastDrawAt = now;
    needsRender = false;

    if (continuous) {
      stopVideoLoop();
      scheduleFrame();
    } else {
      syncVideoLoop();
    }
  }

  function applyDimOpacityVar() {
    bento.style.setProperty("--bento-dim-opacity", String(params.dimOpacity));
  }

  applyDimOpacityVar();

  function remeasure() {
    layout = measureCells(bento, dpr, cellOpts);
    invalidateRectCache();
    surface.resize(layout);
    textureManager.markVideoSlotsDirty();
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

  function setOverlayOpen(open, options = {}) {
    const instant = options.instant === true;

    if (open) {
      overlayOpen = true;
      pointerInside = false;
      if (clearHoverTimer) clearTimeout(clearHoverTimer);
      clearHoverTimer = 0;
      setPressTarget(field, false, params);
      snapPressState(field);
      clearHoverBulge();
      snapCellDims(field);
      field.targetOverlayDim = overlayDimAmount();
      snapOverlayDim(field);
      syncLabelOpacity(layout, field);
      surface.updateFromField(field, params);
      syncVideoPlayback(null);
      markDirty();
      scheduleFrame();
      return;
    }

    overlayOpen = false;
    if (clearHoverTimer) clearTimeout(clearHoverTimer);
    clearHoverTimer = 0;
    clearHoverBulge();
    field.targetOverlayDim = 1;
    if (instant) snapOverlayDim(field);
    remeasure();
    surface.updateFromField(field, params);
    scheduleSyncVideoMedia();
    markDirty();
    scheduleFrame();
  }

  function clearHoverBulge() {
    clearHoverTimer = 0;
    activeCellData = null;
    syncHoveredTileClass(null);
    setCellTarget(field, null, params, layout);
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
      if (activeCellData !== null) {
        activeCellData = null;
        syncHoveredTileClass(null);
        syncVideoPlayback(null);
        setCellTarget(field, null, params, layout);
      }
      return;
    }

    const hitChanged = activeCellData?.index !== hit.index;
    activeCellData = hit;
    syncHoveredTileClass(hit);
    if (hitChanged) syncVideoPlayback(hit);
    setCellTarget(field, hit, params, layout);
  }

  function onPointerLeave(event) {
    if (overlayOpen) return;
    // Only clear when the pointer actually leaves the browser window.
    if (event.relatedTarget !== null) return;
    pointerInside = false;
    activeCellData = null;
    syncHoveredTileClass(null);
    syncVideoPlayback(null);
    setCellTarget(field, null, params, layout);
  }

  function onPointerMoveWrapped(event) {
    if (overlayOpen) return;
    onPointerMove(event);
    if (wantsContinuousRender()) {
      if (!rafScheduled) scheduleFrame();
      return;
    }
    markDirty();
  }

  function onPointerLeaveWrapped(event) {
    if (overlayOpen) return;
    onPointerLeave(event);
    if (wantsContinuousRender()) {
      if (!rafScheduled) scheduleFrame();
      return;
    }
    markDirty();
  }

  function onVisibilityChange() {
    tabVisible = document.visibilityState === "visible";
    if (tabVisible) {
      syncVideoPlayback();
      markDirty();
      scheduleFrame();
      syncVideoLoop();
    } else {
      pauseGridVideos();
      stopVideoLoop();
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
  let clearHoverTimer = 0;

  layout.cells.forEach((cell) => {
    if (cell.img && !cell.img.complete) {
      cell.img.addEventListener("load", () => {
        textureManager.scheduleRebuild(layout, dpr);
        markDirty();
      }, { once: true });
    }
    if (!cell.video) return;

    const onVideoReady = () => {
      if (cell.video.dataset.bentoBulgeMediaReady === "true") return;
      if (!isVideoReady(cell.video)) return;
      cell.video.dataset.bentoBulgeMediaReady = "true";
      textureManager.markVideoSlotsDirty();
      scheduleSyncVideoMedia();
    };
    cell.video.addEventListener("loadeddata", onVideoReady, { once: true });
    cell.video.addEventListener("canplay", onVideoReady, { once: true });
    if (isVideoReady(cell.video)) onVideoReady();
  });

  document.addEventListener("pointermove", onPointerMoveWrapped, { passive: true });
  document.documentElement.addEventListener("mouseleave", onPointerLeaveWrapped);
  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("resize", onResizeDebounced);
  window.addEventListener("pagehide", dispose);

  const gridObserver = new IntersectionObserver(
    (entries) => {
      gridVisible = entries.some((entry) => entry.isIntersecting);
      if (gridVisible) {
        scheduleSyncVideoMedia();
        markDirty();
        scheduleFrame();
        syncVideoLoop();
      } else {
        pauseGridVideos();
        stopVideoLoop();
        rafScheduled = false;
      }
    },
    { threshold: 0.1 }
  );
  gridObserver.observe(bento);

  const resizeObserver = new ResizeObserver(onResizeDebounced);
  resizeObserver.observe(bento);

  function setTilePress(tileEl, pressing) {
    if (overlayOpen) return;
    const cell = tileEl ? layout.cells.find((c) => c.el === tileEl) : null;
    if (pressing && cell) {
      activeCellData = cell;
      syncHoveredTileClass(cell);
      setCellTarget(field, cell, params, layout);
    }
    setPressTarget(field, pressing, params);
    markDirty();
    scheduleFrame();
  }

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
    clearTimeout(clearHoverTimer);
    if (syncVideoMediaRaf) cancelAnimationFrame(syncVideoMediaRaf);
    stopVideoLoop();
    clearDomLayers(layout);
    textureManager.dispose();
    surface.dispose();
    customCursor.dispose();
    perf.dispose();
    bento.classList.remove("grid--bulge-active");
    if (instance === api) instance = null;
  }

  const api = {
    dispose,
    params,
    remeasure,
    setOverlayOpen,
    setTilePress,
    syncVideoPlayback,
    whenReady: whenReadyPromise
  };

  surface.updateFromField(field, params);
  syncLabelOpacity(layout, field);
  surface.updateVideoSlots(initialVideoState);
  syncVideoMedia();
  finishBootRender();
  needsRender = true;
  scheduleFrame();
  syncVideoLoop();

  instance = api;
  window.BentoBulge = api;

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
