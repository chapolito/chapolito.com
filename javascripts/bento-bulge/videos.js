import { measureCells } from "./cells.js";

/** Attach src from data-src the first time we decide to load a tile video. */
export function ensureVideoSrc(video) {
  if (!video) return;
  const dataSrc = video.dataset.src;
  if (!dataSrc) return;
  if (video.getAttribute("src") === dataSrc) return;
  video.src = dataSrc;
}

/**
 * Stingy home-grid video boot: keep src off until needed, then load the
 * largest tiles first and stagger the rest so they don't fight Three / CSS.
 */
export function promoteGridVideos(layout, pauseIdleVideos = false) {
  const cells = layout.cells
    .filter((cell) => cell.hasVideo && cell.video)
    .sort((a, b) => b.width * b.height - a.width * a.height);

  const immediate = 2;
  const staggerMs = 180;
  const laterBaseMs = 700;

  cells.forEach((cell, index) => {
    const video = cell.video;
    if (video.dataset.bentoPromoted === "true") return;
    video.dataset.bentoPromoted = "true";

    const start = () => {
      ensureVideoSrc(video);
      video.preload = "auto";
      if (pauseIdleVideos) return;
      video.play().catch(() => {});
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
