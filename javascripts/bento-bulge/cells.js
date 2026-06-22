import { MAX_CELLS } from "./shaders.js";

const INSET_PX = 0.5;

function snap(value, dpr) {
  return Math.round(value * dpr) / dpr;
}

/** Maps tile `data-cover-align` / projects `tile.align` to normalized anchor (0–1). */
export function parseCoverAlign(raw) {
  const value = (raw || "center").toLowerCase().trim();
  let x = 0.5;
  let y = 0.5;
  if (value.includes("left")) x = 0;
  else if (value.includes("right")) x = 1;
  if (value.includes("top")) y = 0;
  else if (value.includes("bottom")) y = 1;
  return { x, y };
}

export function measureCells(container, dpr, options = {}) {
  const cellSelector = options.cellSelector || ".tile";
  const imgSelector = options.imgSelector || ".tile__media img";
  const videoSelector = options.videoSelector || ".tile__media video";

  const containerRect = container.getBoundingClientRect();
  const width = Math.max(containerRect.width, 1);
  const height = Math.max(containerRect.height, 1);
  const elements = [...container.querySelectorAll(cellSelector)].slice(0, MAX_CELLS);

  let baselineArea = null;
  const cells = elements.map((el, index) => {
    const rect = el.getBoundingClientRect();
    const left = snap(rect.left - containerRect.left + INSET_PX, dpr);
    const top = snap(rect.top - containerRect.top + INSET_PX, dpr);
    const cellWidth = snap(rect.width - INSET_PX * 2, dpr);
    const cellHeight = snap(rect.height - INSET_PX * 2, dpr);
    const area = cellWidth * cellHeight;

    if (baselineArea === null && cellWidth > 0 && cellHeight > 0) {
      baselineArea = area;
    }

    const img = el.querySelector(imgSelector);
    const video = el.querySelector(videoSelector);
    const fit = el.dataset.fit || "cover";
    const mediaFit = fit === "contain" || fit === "fill" ? fit : "cover";
    const fitHeight = mediaFit === "contain";
    const coverAnchor = parseCoverAlign(el.dataset.coverAlign);

    return {
      el,
      index,
      left,
      top,
      width: cellWidth,
      height: cellHeight,
      normX: left / width,
      normY: top / height,
      normW: cellWidth / width,
      normH: cellHeight / height,
      normCenterX: (left + cellWidth * 0.5) / width,
      normCenterY: (top + cellHeight * 0.5) / height,
      normRadiusX: (cellWidth * 0.5) / width,
      normRadiusY: (cellHeight * 0.5) / height,
      area,
      areaScale: baselineArea ? area / baselineArea : 1,
      hasImage: Boolean(img),
      hasVideo: Boolean(video),
      mediaFit,
      fitHeight,
      coverAnchorX: coverAnchor.x,
      coverAnchorY: coverAnchor.y,
      insetShadow: el.dataset.insetShadow === "true",
      img,
      video,
      veilFromTop:
        el.dataset.id === "horizon-mobile" ||
        el.dataset.id === "portal-voice" ||
        el.dataset.id === "portal-household"
    };
  });

  return {
    width,
    height,
    cells,
    containerRect
  };
}

export function cellAtPoint(cells, containerRect, x, y) {
  let nearest = null;
  let nearestDist = Infinity;

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const left = containerRect.left + cell.left;
    const top = containerRect.top + cell.top;
    const right = left + cell.width;
    const bottom = top + cell.height;

    if (x >= left && x <= right && y >= top && y <= bottom) {
      return cell;
    }

    const dx = Math.max(left - x, 0, x - right);
    const dy = Math.max(top - y, 0, y - bottom);
    const dist = dx * dx + dy * dy;
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = cell;
    }
  }

  return nearest;
}

export function cellsInBulgeRadius(cells, centerX, centerY, radiusPx, maxCount) {
  return cells
    .map((cell) => {
      const cx = cell.left + cell.width * 0.5;
      const cy = cell.top + cell.height * 0.5;
      const dx = cx - centerX;
      const dy = cy - centerY;
      return { cell, dist: Math.sqrt(dx * dx + dy * dy) };
    })
    .filter((entry) => entry.dist <= radiusPx)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, maxCount)
    .map((entry) => entry.cell);
}
