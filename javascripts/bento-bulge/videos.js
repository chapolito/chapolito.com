import { measureCells } from "./cells.js";

/** True once we have a decoded, presentable frame (not the common black first frame). */
export function hasPaintedVideoFrame(video) {
  return video?.dataset.bentoFramePainted === "true";
}

/**
 * Resolves after the video has painted a real frame.
 * `loadeddata` is too early — browsers often expose a black frame first.
 */
export function whenVideoFramePainted(video) {
  if (!video) return Promise.resolve();
  if (hasPaintedVideoFrame(video)) return Promise.resolve();

  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      video.dataset.bentoFramePainted = "true";
      video.classList.add("is-frame-ready");
      resolve();
    };

    const mediaTime = (meta) =>
      typeof meta?.mediaTime === "number" ? meta.mediaTime : video.currentTime;

    // First presented frames at t≈0 are frequently solid black — require past that.
    const isPastBlackFlash = (t) => t > 0.05;

    if (typeof video.requestVideoFrameCallback === "function") {
      let frames = 0;
      const onFrame = (_now, meta) => {
        if (settled) return;
        frames += 1;
        // Skip at least two presented frames AND wait past the black keyframe flash.
        if (frames < 2 || !isPastBlackFlash(mediaTime(meta))) {
          video.requestVideoFrameCallback(onFrame);
          return;
        }
        done();
      };
      video.requestVideoFrameCallback(onFrame);
      return;
    }

    const tryPaint = () => {
      if (video.readyState < 2 || !video.videoWidth) return false;
      if (isPastBlackFlash(video.currentTime) || video.dataset.bentoFramePainted === "true") {
        done();
        return true;
      }
      return false;
    };

    if (tryPaint()) return;

    const onTime = () => {
      if (tryPaint()) {
        video.removeEventListener("timeupdate", onTime);
        video.removeEventListener("playing", onPlaying);
      }
    };
    const onPlaying = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!settled) onTime();
        });
      });
    };

    video.addEventListener("timeupdate", onTime);
    video.addEventListener("playing", onPlaying);
    if (!video.paused) onPlaying();
  });
}

/** Attach src from data-src the first time we decide to load a tile video. */
export function ensureVideoSrc(video) {
  if (!video) return;
  const dataSrc = video.dataset.src;
  if (!dataSrc) return;
  if (video.getAttribute("src") === dataSrc) return;
  video.src = dataSrc;
  watchVideoFrameReady(video);
}

function watchVideoFrameReady(video) {
  if (!video || video.dataset.frameReadyWatch === "true") return;
  video.dataset.frameReadyWatch = "true";
  whenVideoFramePainted(video);
}

/**
 * Stingy home-grid video boot: keep src off until needed, then load the
 * largest tiles first and stagger the rest so they don't fight Three / CSS.
 */
export function promoteGridVideos(layout, pauseIdleVideos = false) {
  const cells = layout.cells
    .filter((cell) => cell.hasVideo && cell.video)
    .sort((a, b) => b.width * b.height - a.width * a.height);

  // Three boots immediately now — promote a few more early without fighting idle load.
  const immediate = 3;
  const staggerMs = 140;
  const laterBaseMs = 350;

  cells.forEach((cell, index) => {
    const video = cell.video;
    if (video.dataset.bentoPromoted === "true") return;
    video.dataset.bentoPromoted = "true";

    const start = () => {
      ensureVideoSrc(video);
      video.preload = "auto";
      if (pauseIdleVideos) return;
      // Play immediately under #222229; fade only after a real frame paints.
      video.play().catch(() => {});
      whenVideoFramePainted(video);
    };

    if (index < immediate) {
      start();
    } else {
      window.setTimeout(start, laterBaseMs + (index - immediate) * staggerMs);
    }
  });
}

export function promoteHomeVideos(bento, options = {}) {
  if (!bento) return;
  const cellOpts = {
    cellSelector: options.cellSelector || ".tile",
    imgSelector: options.imgSelector || ".tile__media img",
    videoSelector: options.videoSelector || ".tile__media video"
  };
  const layout = measureCells(bento, 1, cellOpts);
  promoteGridVideos(layout, options.pauseIdleVideos === true);
}
