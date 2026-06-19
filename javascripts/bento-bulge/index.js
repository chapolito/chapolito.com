import { measureCells, cellAtPoint, pointerToNorm } from "./cells.js";
import {
  createBulgeField,
  setCellTarget,
  setCursorTarget,
  updateBulgeField,
  isFieldMorphing,
  isDimMorphing
} from "./field.js";
import { createTextureManager, isVideoReady } from "./textures.js";
import { createSurface } from "./surface.js";
import { createDialkit, initParams } from "./dialkit.js";
import { createCustomCursor } from "./cursor.js";

let instance = null;

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

export function initBentoBulge(options = {}) {
  if (instance) instance.dispose();

  const bento = document.querySelector(options.bento || "#grid");
  const projectsEl = document.querySelector(options.projects || "#portfolio");
  const hoverClass = options.hoverClass || "is-bulge-hovered";
  const cellOpts = {
    cellSelector: options.cellSelector || ".tile",
    imgSelector: options.imgSelector || ".tile__media img",
    videoSelector: options.videoSelector || ".tile__media video"
  };

  if (!bento || !projectsEl) {
    console.warn("[bento-bulge] missing grid container");
    return null;
  }

  const params = initParams();
  params.cornerRadius = options.cornerRadius ?? params.cornerRadius ?? 8;

  const customCursor = createCustomCursor();
  let onParamsChange = function () {};

  const capability = canUseWebGL(params);
  if (!capability.ok) {
    console.info("[bento-bulge] fallback:", capability.reason);
    const dialkit = createDialkit(document.body, params, () => onParamsChange());
    initFallbackHover(bento, cellOpts.cellSelector, hoverClass);
    return { dispose: () => { customCursor.dispose(); dialkit.dispose(); }, params };
  }

  const dpr = Math.min(window.devicePixelRatio || 1, params.dprCap ?? 2);
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
    return { dispose: () => { customCursor.dispose(); dialkit.dispose(); }, params, dialkit };
  }

  const dialkit = createDialkit(document.body, params, () => onParamsChange());

  const field = createBulgeField(params);
  bento.classList.add("grid--bulge-active");
  const textureManager = createTextureManager(params.cornerRadius);
  const initialVideoState = textureManager.syncVideoSlots(layout, params.enableVideos);
  textureManager.rebuildStatic(layout, dpr);

  let surface;
  try {
    surface = createSurface(bento, layout, params, textureManager.texture, textureManager.emptyTexture);
  } catch (err) {
    console.error("[bento-bulge] WebGL surface failed:", err);
    initFallbackHover(bento, cellOpts.cellSelector, hoverClass);
    return { dispose: () => { customCursor.dispose(); dialkit.dispose(); }, params, dialkit };
  }

  layout.cells.forEach((cell) => {
    if (cell.img && !cell.img.complete) {
      cell.img.addEventListener("load", () => {
        textureManager.rebuildStatic(layout, dpr);
        surface.render();
      }, { once: true });
    }
    if (cell.video && cell.video.readyState < 2) {
      cell.video.addEventListener("loadeddata", () => {
        const videoState = textureManager.syncVideoSlotsAndAtlas(layout, dpr, params.enableVideos);
        surface.updateVideoSlots(videoState);
        surface.render();
      }, { once: true });
    }
  });

  let activeCellData = null;
  let hoveredTileEl = null;
  let pointerInside = false;
  let overlayOpen = false;
  let rafId = 0;
  let lastTime = performance.now();
  let running = true;
  let slowFrames = 0;

  function applyDimOpacityVar() {
    bento.style.setProperty("--bento-dim-opacity", String(params.dimOpacity));
  }

  function handleParamsChange() {
    dialkit.persist();
    applyDimOpacityVar();
    remeasure();
    surface.updateFromField(field, params);
    surface.render();
  }

  onParamsChange = handleParamsChange;
  applyDimOpacityVar();

  function remeasure() {
    layout = measureCells(bento, dpr, cellOpts);
    surface.resize(layout);
    const videoState = textureManager.syncVideoSlotsAndAtlas(layout, dpr, params.enableVideos);
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
    /* CSS owns overlay dim on the canvas; keep shader at full alpha to avoid double-dimming */
    surface.setOverlayDim(1);
    surface.canvas.style.opacity = open ? String(overlayDimAmount()) : "1";
    surface.updateFromField(field, params);
    surface.render();
    if (open) {
      startLoop();
    } else {
      remeasure();
      surface.render();
      startLoop();
    }
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
    const containerRect = bento.getBoundingClientRect();
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

  function tick(now) {
    if (!running) return;
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    if (!params.enableIdleOrganic && field.bulgeAmount < 0.01) {
      field.time = 0;
    }

    updateBulgeField(field, params, dt);

    if (overlayOpen) {
      surface.updateFromField(field, params);
      surface.render();

      const settling =
        isFieldMorphing(field) ||
        field.bulgeAmount > 0.01 ||
        field.projectStrength > 0.01;

      if (settling) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = 0;
      }
      return;
    }

    const videoState = textureManager.syncVideoSlotsAndAtlas(layout, dpr, params.enableVideos);
    surface.updateVideoSlots(videoState);
    surface.updateFromField(field, params);

    const frameStart = performance.now();
    surface.render();
    const frameMs = performance.now() - frameStart;

    if (frameMs > 20) {
      slowFrames += 1;
      if (slowFrames >= 3 && params.maxConcurrentVideoTextures > 2) {
        params.maxConcurrentVideoTextures = Math.max(2, params.maxConcurrentVideoTextures - 1);
        slowFrames = 0;
      }
    } else {
      slowFrames = 0;
    }

    const animating =
      pointerInside ||
      isFieldMorphing(field) ||
      isDimMorphing(field) ||
      field.bulgeAmount > 0.01 ||
      field.projectStrength > 0.01 ||
      params.enableIdleOrganic;

    const needsVideoRefresh =
      params.enableVideos &&
      layout.cells.some((c) => c.hasVideo && c.video && (!isVideoReady(c.video) || !c.video.paused));

    if (animating || needsVideoRefresh) {
      rafId = requestAnimationFrame(tick);
    } else {
      rafId = 0;
    }
  }

  function startLoop() {
    if (!rafId) {
      lastTime = performance.now();
      rafId = requestAnimationFrame(tick);
    }
  }

  function onResize() {
    remeasure();
    startLoop();
  }

  let resizeTimer;
  function onResizeDebounced() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(onResize, 120);
  }

  function onPointerMoveWrapped(event) {
    if (overlayOpen) return;
    onPointerMove(event);
    startLoop();
  }

  function onPointerLeaveWrapped() {
    if (overlayOpen) return;
    onPointerLeave();
  }

  document.addEventListener("pointermove", onPointerMoveWrapped, { passive: true });
  document.documentElement.addEventListener("mouseleave", onPointerLeaveWrapped);
  window.addEventListener("resize", onResizeDebounced);
  window.addEventListener("pagehide", dispose);

  const resizeObserver = new ResizeObserver(onResizeDebounced);
  resizeObserver.observe(bento);

  function dispose() {
    if (!running) return;
    running = false;
    cancelAnimationFrame(rafId);
    document.removeEventListener("pointermove", onPointerMoveWrapped);
    document.documentElement.removeEventListener("mouseleave", onPointerLeaveWrapped);
    window.removeEventListener("resize", onResizeDebounced);
    window.removeEventListener("pagehide", dispose);
    resizeObserver.disconnect();
    clearDomLayers(layout);
    textureManager.dispose();
    surface.dispose();
    customCursor.dispose();
    dialkit.dispose();
    bento.classList.remove("grid--bulge-active");
    if (instance === api) instance = null;
  }

  surface.updateFromField(field, params);
  surface.canvas.style.opacity = "1";
  surface.updateVideoSlots(initialVideoState);
  surface.render();
  startLoop();

  const api = {
    dispose,
    params,
    remeasure,
    setOverlayOpen,
    onParamsChange: handleParamsChange
  };
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
