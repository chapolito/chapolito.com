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

function measureStatement(el) {
  const wrap = el.querySelector(".tile__statement");
  if (!wrap) return null;
  const wrapStyle = getComputedStyle(wrap);
  const lines = [...wrap.querySelectorAll(".tile__statement-line")].map((node) => {
    const style = getComputedStyle(node);
    const fontSize = parseFloat(style.fontSize) || 16;
    const lineHeightRaw = parseFloat(style.lineHeight);
    return {
      text: node.textContent || "",
      font: `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`,
      color: style.color || "#ffffff",
      letterSpacing: style.letterSpacing || "normal",
      lineHeight: Number.isFinite(lineHeightRaw) ? lineHeightRaw : fontSize * 1.12,
      maxWidth: parseFloat(style.maxWidth) || 0
    };
  });
  return {
    lines,
    paddingTop: parseFloat(wrapStyle.paddingTop) || 0,
    paddingRight: parseFloat(wrapStyle.paddingRight) || 0,
    paddingBottom: parseFloat(wrapStyle.paddingBottom) || 0,
    paddingLeft: parseFloat(wrapStyle.paddingLeft) || 0,
    gap: parseFloat(wrapStyle.rowGap || wrapStyle.gap) || 0
  };
}

export function measureCells(container, dpr, options = {}) {
  const cellSelector = options.cellSelector || ".tile";
  const imgSelector = options.imgSelector || ".tile__media img";
  const videoSelector = options.videoSelector || ".tile__media video";

  // Use layout box sizes (ignore CSS transforms like overlay scale(0.95)).
  // getBoundingClientRect during overlay close baked the scaled size into WebGL
  // and left black gutters between tiles once the grid returned to scale(1).
  const width = Math.max(container.clientWidth, 1);
  const height = Math.max(container.clientHeight, 1);
  const containerRect = container.getBoundingClientRect();
  const elements = [...container.querySelectorAll(cellSelector)]
    .filter((el) => getComputedStyle(el).display !== "none")
    .slice(0, MAX_CELLS);

  let baselineArea = null;
  const cells = elements.map((el, index) => {
    const left = snap(el.offsetLeft + INSET_PX, dpr);
    const top = snap(el.offsetTop + INSET_PX, dpr);
    const cellWidth = snap(el.offsetWidth - INSET_PX * 2, dpr);
    const cellHeight = snap(el.offsetHeight - INSET_PX * 2, dpr);
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
    const isStatement = el.dataset.static === "true" || el.classList.contains("tile--statement");

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
      isStatement,
      statement: isStatement ? measureStatement(el) : null,
      img,
      video,
      veilFromTop:
        el.dataset.id === "quest-people" ||
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

export function cellAtPoint(cells, containerRect, x, y, container) {
  let nearest = null;
  let nearestDist = Infinity;

  // Cell left/top are layout (unscaled) coords. Map the pointer out of any CSS transform.
  const layoutW = container?.clientWidth || containerRect.width || 1;
  const layoutH = container?.clientHeight || containerRect.height || 1;
  const scaleX = containerRect.width / layoutW;
  const scaleY = containerRect.height / layoutH;
  const localX = (x - containerRect.left) / (scaleX || 1);
  const localY = (y - containerRect.top) / (scaleY || 1);

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const left = cell.left;
    const top = cell.top;
    const right = left + cell.width;
    const bottom = top + cell.height;

    if (localX >= left && localX <= right && localY >= top && localY <= bottom) {
      return cell;
    }

    const dx = Math.max(left - localX, 0, localX - right);
    const dy = Math.max(top - localY, 0, localY - bottom);
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
