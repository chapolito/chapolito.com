import * as THREE from "/javascripts/vendor/three.module.min.js";
import { MAX_CELLS } from "./shaders.js";

const INSET_PX = 0.5;
const _raycaster = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const _hit = new THREE.Vector3();
const _plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

function snap(value, dpr) {
  return Math.round(value * dpr) / dpr;
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
    const fitHeight = video && (el.dataset.fit === "contain" || video.dataset.fitHeight === "true");

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
      fitHeight,
      img,
      video
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

export function pointerToNorm(layout, containerRect, clientX, clientY, camera) {
  const x = (clientX - containerRect.left) / layout.width;
  const y = (clientY - containerRect.top) / layout.height;

  if (!camera || camera.isOrthographicCamera) {
    return { x, y };
  }

  _ndc.x = x * 2 - 1;
  _ndc.y = -(y * 2 - 1);
  _raycaster.setFromCamera(_ndc, camera);
  if (_raycaster.ray.intersectPlane(_plane, _hit)) {
    return {
      x: _hit.x / layout.width,
      y: 1 - _hit.y / layout.height
    };
  }

  return { x, y };
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
