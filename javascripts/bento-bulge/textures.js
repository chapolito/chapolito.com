import * as THREE from "/javascripts/vendor/three.module.min.js";
import { MAX_CELLS, MAX_VIDEO_SLOTS } from "./shaders.js";

const emptyTexture = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
emptyTexture.needsUpdate = true;

function roundedRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawPlaceholder(ctx, x, y, w, h, cornerRadius) {
  const gradient = ctx.createLinearGradient(x, y, x, y + h);
  gradient.addColorStop(0, "#303030");
  gradient.addColorStop(1, "#242424");
  ctx.fillStyle = gradient;
  roundedRectPath(ctx, x, y, w, h, cornerRadius);
  ctx.fill();
}

function drawContainBackground(ctx, x, y, w, h, cornerRadius) {
  roundedRectPath(ctx, x, y, w, h, cornerRadius);
  ctx.save();
  ctx.clip();
  const gradient = ctx.createRadialGradient(x + w * 0.5, y, 0, x + w * 0.5, y, Math.max(w, h) * 1.2);
  gradient.addColorStop(0, "#2c2336");
  gradient.addColorStop(1, "#14101c");
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function coverDrawRect(x, y, w, h, iw, ih, anchorX, anchorY) {
  const scale = Math.max(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = x + (w - dw) * anchorX;
  const dy = y + (h - dh) * anchorY;
  return { dx, dy, dw, dh };
}

function drawImageCover(ctx, img, x, y, w, h, mediaFit, cornerRadius, anchorX = 0.5, anchorY = 0.5) {
  roundedRectPath(ctx, x, y, w, h, cornerRadius);
  ctx.save();
  ctx.clip();

  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) {
    ctx.restore();
    return;
  }

  if (mediaFit === "fill") {
    ctx.drawImage(img, x, y, w, h);
  } else if (mediaFit === "contain") {
    const scale = Math.min(w / iw, h / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = x + (w - dw) * 0.5;
    const dy = y + (h - dh) * 0.5;
    ctx.drawImage(img, dx, dy, dw, dh);
  } else {
    const { dx, dy, dw, dh } = coverDrawRect(x, y, w, h, iw, ih, anchorX, anchorY);
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  ctx.restore();
}

function drawVideoCover(ctx, video, x, y, w, h, mediaFit, cornerRadius, anchorX = 0.5, anchorY = 0.5) {
  if (!video.videoWidth || !video.videoHeight) return false;
  if (video.readyState < 2 && video.dataset.bentoBulgeBound !== "true") return false;
  roundedRectPath(ctx, x, y, w, h, cornerRadius);
  ctx.save();
  ctx.clip();
  const iw = video.videoWidth;
  const ih = video.videoHeight;
  if (mediaFit === "fill") {
    ctx.drawImage(video, x, y, w, h);
  } else if (mediaFit === "contain") {
    const scale = Math.min(w / iw, h / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = x + (w - dw) * 0.5;
    const dy = y + (h - dh) * 0.5;
    ctx.drawImage(video, dx, dy, dw, dh);
  } else {
    const { dx, dy, dw, dh } = coverDrawRect(x, y, w, h, iw, ih, anchorX, anchorY);
    ctx.drawImage(video, dx, dy, dw, dh);
  }
  ctx.restore();
  return true;
}

function drawStaticCell(ctx, cell, cornerRadius, cellSlots) {
  const { left: x, top: y, width: w, height: h } = cell;
  const useVideoTexture = cell.hasVideo && cellSlots && cellSlots[cell.index] >= 0;

  if (useVideoTexture) {
    return;
  }

  if (cell.mediaFit === "contain") {
    drawContainBackground(ctx, x, y, w, h, cornerRadius);
  }

  let drew = false;
  if (cell.hasImage && cell.img && cell.img.complete) {
    drawImageCover(
      ctx,
      cell.img,
      x,
      y,
      w,
      h,
      cell.mediaFit,
      cornerRadius,
      cell.coverAnchorX,
      cell.coverAnchorY
    );
    drew = true;
  } else if (cell.hasVideo && cell.video) {
    drew = drawVideoCover(
      ctx,
      cell.video,
      x,
      y,
      w,
      h,
      cell.mediaFit,
      cornerRadius,
      cell.coverAnchorX,
      cell.coverAnchorY
    );
  }

  if (!drew) {
    drawPlaceholder(ctx, x, y, w, h, cornerRadius);
  }
}

function isVideoReady(video) {
  if (!video || !video.videoWidth || !video.videoHeight) return false;
  // Keep bound videos slotted through loop seeks (readyState can dip briefly).
  if (video.dataset.bentoBulgeBound === "true") return true;
  return video.readyState >= 2;
}

export { isVideoReady };

export function createVideoTexture(video) {
  const tex = new THREE.VideoTexture(video);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;

  let lastTime = -1;
  const baseUpdate = THREE.VideoTexture.prototype.update;
  tex.update = function () {
    if (video.readyState < video.HAVE_CURRENT_DATA) return;
    if (video.seeking) return;

    const t = video.currentTime;
    // Browsers often decode a blank frame right after a loop seek — hold the last frame.
    if (lastTime >= 0 && t + 0.05 < lastTime && t < 0.08) return;
    lastTime = t;

    baseUpdate.call(this);
  };

  return tex;
}

export function createTextureManager(cornerRadius = 8) {
  const radius = cornerRadius;
  const canvas = document.createElement("canvas");
  const ctx =
    canvas.getContext("2d", { alpha: true, colorSpace: "srgb", willReadFrequently: false }) ||
    canvas.getContext("2d", { alpha: true });
  if (!ctx) {
    throw new Error("[bento-bulge] 2D canvas context unavailable");
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.format = THREE.RGBAFormat;
  texture.premultiplyAlpha = false;
  texture.flipY = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const videoTextures = new Map();
  const frameUnwatchers = [];
  let lastCellSlots = new Float32Array(MAX_CELLS);
  lastCellSlots.fill(-1);
  let atlasBuilt = false;
  let lastSlotCount = 0;
  let lastVideoState = null;
  let videoSlotsDirty = true;
  let rebuildRaf = 0;
  let pendingRebuild = null;
  let onFrameCallback = null;

  function ensureVideoTexture(cell) {
    if (!isVideoReady(cell.video)) return null;

    let tex = videoTextures.get(cell.index);
    if (!tex) {
      tex = createVideoTexture(cell.video);
      videoTextures.set(cell.index, tex);
      cell.video.dataset.bentoBulgeBound = "true";
    }
    return tex;
  }

  function buildVideoSlots(layout, enableVideos, maxConcurrent = MAX_VIDEO_SLOTS) {
    const slots = [];
    const cellSlots = new Float32Array(MAX_CELLS);
    cellSlots.fill(-1);

    if (!enableVideos) {
      return { slots, cellSlots };
    }

    const limit = Math.min(Math.max(1, maxConcurrent), MAX_VIDEO_SLOTS);
    const candidates = layout.cells
      .filter((cell) => cell.hasVideo && cell.video && isVideoReady(cell.video))
      .sort((a, b) => b.width * b.height - a.width * a.height);

    for (const cell of candidates) {
      if (slots.length >= limit) break;

      const tex = ensureVideoTexture(cell);
      if (!tex) continue;

      const video = cell.video;
      const slot = slots.length;
      slots.push({
        slot,
        cellIndex: cell.index,
        texture: tex,
        fitContain: cell.mediaFit === "contain" ? 1 : 0,
        fitFill: cell.mediaFit === "fill" ? 1 : 0,
        width: video.videoWidth,
        height: video.videoHeight
      });
      cellSlots[cell.index] = slot;
    }

    return { slots, cellSlots };
  }

  function rebuildStaticNow(layout, dpr, cellSlots = lastCellSlots) {
    const w = Math.max(1, Math.floor(layout.width * dpr));
    const h = Math.max(1, Math.floor(layout.height * dpr));
    canvas.width = w;
    canvas.height = h;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, layout.width, layout.height);

    layout.cells.forEach((cell) => {
      drawStaticCell(ctx, cell, radius, cellSlots);
    });

    texture.needsUpdate = true;
    atlasBuilt = true;
  }

  function scheduleRebuild(layout, dpr, cellSlots = lastCellSlots) {
    pendingRebuild = { layout, dpr, cellSlots };
    if (rebuildRaf) return;
    rebuildRaf = requestAnimationFrame(() => {
      rebuildRaf = 0;
      if (!pendingRebuild) return;
      const { layout: l, dpr: d, cellSlots: slots } = pendingRebuild;
      pendingRebuild = null;
      rebuildStaticNow(l, d, slots);
    });
  }

  function bindVideoFrameWatchers(cells, cellSlots, onFrame) {
    frameUnwatchers.forEach((stop) => stop());
    frameUnwatchers.length = 0;
    onFrameCallback = onFrame;

    cells
      .filter((cell) => cell.hasVideo && cell.video && cellSlots[cell.index] >= 0)
      .forEach((cell) => {
        const video = cell.video;

        if (typeof video.requestVideoFrameCallback === "function") {
          let active = true;
          const loop = () => {
            if (!active) return;
            onFrame();
            video.requestVideoFrameCallback(loop);
          };
          video.requestVideoFrameCallback(loop);
          frameUnwatchers.push(() => {
            active = false;
          });
          return;
        }

        const handler = () => onFrame();
        video.addEventListener("timeupdate", handler);
        frameUnwatchers.push(() => video.removeEventListener("timeupdate", handler));
      });
  }

  function rebindVideoFrameWatchers(cells) {
    if (!onFrameCallback) return;
    bindVideoFrameWatchers(cells, lastCellSlots, onFrameCallback);
  }

  return {
    canvas,
    texture,
    emptyTexture,

    rebuildStatic(layout, dpr, cellSlots = lastCellSlots) {
      rebuildStaticNow(layout, dpr, cellSlots);
    },

    scheduleRebuild,

    hasAtlas() {
      return atlasBuilt;
    },

    getSlotCount() {
      return lastSlotCount;
    },

    bindVideoFrameWatchers,

    markVideoSlotsDirty() {
      videoSlotsDirty = true;
    },

    getVideoState() {
      return lastVideoState;
    },

    syncVideoSlots(layout, enableVideos, maxConcurrent = MAX_VIDEO_SLOTS) {
      const state = buildVideoSlots(layout, enableVideos, maxConcurrent);
      lastCellSlots = state.cellSlots;
      lastSlotCount = state.slots.length;
      lastVideoState = state;
      videoSlotsDirty = false;
      return state;
    },

    syncVideoSlotsAndAtlas(layout, dpr, enableVideos, maxConcurrent = MAX_VIDEO_SLOTS) {
      if (!videoSlotsDirty && lastVideoState) {
        return lastVideoState;
      }

      const prev = lastCellSlots;
      const state = buildVideoSlots(layout, enableVideos, maxConcurrent);
      const changed = state.cellSlots.some((slot, i) => slot !== prev[i]);
      lastCellSlots = state.cellSlots;
      lastSlotCount = state.slots.length;
      lastVideoState = state;
      videoSlotsDirty = false;
      if (changed) {
        scheduleRebuild(layout, dpr, state.cellSlots);
        rebindVideoFrameWatchers(layout.cells);
      }
      return state;
    },

    dispose() {
      if (rebuildRaf) cancelAnimationFrame(rebuildRaf);
      frameUnwatchers.forEach((stop) => stop());
      frameUnwatchers.length = 0;
      videoTextures.forEach((tex) => tex.dispose());
      videoTextures.clear();
      texture.dispose();
    }
  };
}
