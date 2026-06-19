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

function drawTileVeil(ctx, x, y, w, h, cornerRadius) {
  roundedRectPath(ctx, x, y, w, h, cornerRadius);
  ctx.save();
  ctx.clip();

  const cx = x + w * 0.5;
  const cy = y + h * 0.5;
  const len = Math.max(w, h);
  const angle = (15 * Math.PI) / 180;
  const dx = Math.sin(angle) * len;
  const dy = -Math.cos(angle) * len;
  const gradient = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
  gradient.addColorStop(0, "rgba(0, 0, 0, 0.72)");
  gradient.addColorStop(0.28, "rgba(0, 0, 0, 0.34)");
  gradient.addColorStop(0.5, "rgba(0, 0, 0, 0)");

  ctx.globalAlpha = 0.18;
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawImageCover(ctx, img, x, y, w, h, fitHeight, cornerRadius) {
  roundedRectPath(ctx, x, y, w, h, cornerRadius);
  ctx.save();
  ctx.clip();

  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) {
    ctx.restore();
    return;
  }

  if (fitHeight) {
    const scale = Math.min(w / iw, h / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = x + (w - dw) * 0.5;
    const dy = y + (h - dh) * 0.5;
    ctx.drawImage(img, dx, dy, dw, dh);
  } else {
    const scale = Math.max(w / iw, h / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = x + (w - dw) * 0.5;
    const dy = y + (h - dh) * 0.5;
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  ctx.restore();
}

function drawVideoCover(ctx, video, x, y, w, h, fitHeight, cornerRadius) {
  if (video.readyState < 2 || !video.videoWidth) return false;
  roundedRectPath(ctx, x, y, w, h, cornerRadius);
  ctx.save();
  ctx.clip();
  const iw = video.videoWidth;
  const ih = video.videoHeight;
  if (fitHeight) {
    const scale = Math.min(w / iw, h / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = x + (w - dw) * 0.5;
    const dy = y + (h - dh) * 0.5;
    ctx.drawImage(video, dx, dy, dw, dh);
  } else {
    const scale = Math.max(w / iw, h / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = x + (w - dw) * 0.5;
    const dy = y + (h - dh) * 0.5;
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

  if (cell.fitHeight) {
    drawContainBackground(ctx, x, y, w, h, cornerRadius);
  }

  let drew = false;
  if (cell.hasImage && cell.img && cell.img.complete) {
    drawImageCover(ctx, cell.img, x, y, w, h, cell.fitHeight, cornerRadius);
    drew = true;
  } else if (cell.hasVideo && cell.video) {
    drew = drawVideoCover(ctx, cell.video, x, y, w, h, cell.fitHeight, cornerRadius);
  }

  if (!drew) {
    drawPlaceholder(ctx, x, y, w, h, cornerRadius);
  }

  drawTileVeil(ctx, x, y, w, h, cornerRadius);
}

function isVideoReady(video) {
  return Boolean(video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0);
}

export { isVideoReady };

export function createVideoTexture(video) {
  const tex = new THREE.VideoTexture(video);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
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

  function buildVideoSlots(layout, enableVideos) {
    const slots = [];
    const cellSlots = new Float32Array(MAX_CELLS);
    cellSlots.fill(-1);

    if (!enableVideos) {
      return { slots, cellSlots };
    }

    layout.cells.forEach((cell) => {
      if (!cell.hasVideo || !cell.video || slots.length >= MAX_VIDEO_SLOTS) return;
      if (!isVideoReady(cell.video)) return;

      const texture = ensureVideoTexture(cell);
      if (!texture) return;

      const video = cell.video;
      const slot = slots.length;
      slots.push({
        slot,
        cellIndex: cell.index,
        texture,
        fitContain: cell.fitHeight ? 1 : 0,
        width: video.videoWidth,
        height: video.videoHeight
      });
      cellSlots[cell.index] = slot;
    });

    return { slots, cellSlots };
  }

  let lastCellSlots = new Float32Array(MAX_CELLS);
  lastCellSlots.fill(-1);

  return {
    canvas,
    texture,
    emptyTexture,

    rebuildStatic(layout, dpr, cellSlots = lastCellSlots) {
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
    },

    syncVideoSlots(layout, enableVideos) {
      const state = buildVideoSlots(layout, enableVideos);
      lastCellSlots = state.cellSlots;
      return state;
    },

    syncVideoSlotsAndAtlas(layout, dpr, enableVideos) {
      const prev = lastCellSlots;
      const state = buildVideoSlots(layout, enableVideos);
      const changed = state.cellSlots.some((slot, i) => slot !== prev[i]);
      lastCellSlots = state.cellSlots;
      if (changed) {
        this.rebuildStatic(layout, dpr, state.cellSlots);
      }
      return state;
    },

    dispose() {
      videoTextures.forEach((tex) => tex.dispose());
      videoTextures.clear();
      texture.dispose();
    }
  };
}
