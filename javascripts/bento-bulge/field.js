import { MAX_CELLS } from "./shaders.js";

export function damp(current, target, lambda, dt) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

export function dampVec2(current, target, lambda, dt) {
  return {
    x: damp(current.x, target.x, lambda, dt),
    y: damp(current.y, target.y, lambda, dt)
  };
}

export function createBulgeField(params) {
  return {
    projectCenter: { x: 0.5, y: 0.5 },
    projectRadius: { x: 0.1, y: 0.1 },
    projectStrength: 0,
    cursorCenter: { x: 0.5, y: 0.5 },
    cursorRadius: { x: 0.05, y: 0.05 },
    cursorStrength: 0,
    bulgeAmount: 0,
    targetProjectCenter: { x: 0.5, y: 0.5 },
    targetProjectRadius: { x: 0.1, y: 0.1 },
    targetProjectStrength: 0,
    targetBulgeAmount: 0,
    cellDimAmounts: new Float32Array(MAX_CELLS),
    cellDimTargets: new Float32Array(MAX_CELLS),
    active: false
  };
}

/** Circular oval hill sized from tile area — not the tile rectangle. */
export function setCellTarget(field, cell, params, layout) {
  field.cellDimTargets.fill(0);

  if (!cell) {
    field.targetProjectStrength = 0;
    field.targetBulgeAmount = 0;
    field.active = false;
    return;
  }

  field.cellDimTargets[cell.index] = 1;

  const planeMin = Math.min(layout.width, layout.height);
  const tileArea = Math.max(cell.width * cell.height, 1);
  const equivRadius = Math.sqrt(tileArea / Math.PI) * (params.hillRadiusScale ?? 1.1);
  const normR = (equivRadius / planeMin) * params.projectSpread;

  field.active = true;
  field.targetBulgeAmount = 1;
  field.targetProjectCenter = {
    x: cell.normCenterX,
    y: cell.normCenterY
  };
  field.targetProjectRadius = {
    x: normR,
    y: normR
  };
  field.targetProjectStrength = 1;
}

/** Broad pointer lift — wide, flat muscle profile; peak stays on the tile center. */
export function setCursorTarget(field, norm, cell, params, layout) {
  if (!cell || !field.active) {
    field.cursorStrength = 0;
    return;
  }

  field.cursorCenter = {
    x: cell.normCenterX,
    y: cell.normCenterY
  };

  const planeMin = Math.min(layout.width, layout.height);
  const cursorRadius = planeMin * (params.cursorSpread ?? 0.65) * 0.42;
  field.cursorRadius = {
    x: cursorRadius / layout.width,
    y: cursorRadius / layout.height
  };

  const dx = (norm.x - cell.normCenterX) * layout.width;
  const dy = (norm.y - cell.normCenterY) * layout.height;
  const dist = Math.hypot(dx, dy);
  const deadZone = Math.max(params.cursorDeadZone ?? 80, 1);
  const proximity = 1 - Math.min(dist / deadZone, 1);
  field.cursorStrength = proximity * proximity;
}

export function updateBulgeField(field, params, dt) {
  const morph = params.morphSpeed;
  const dimMorph = params.dimMorphSpeed ?? morph * 0.35;

  field.projectCenter = dampVec2(field.projectCenter, field.targetProjectCenter, morph, dt);
  field.projectRadius = dampVec2(field.projectRadius, field.targetProjectRadius, morph, dt);
  field.projectStrength = damp(field.projectStrength, field.targetProjectStrength, morph, dt);
  field.bulgeAmount = damp(field.bulgeAmount, field.targetBulgeAmount, morph * 1.2, dt);

  for (let i = 0; i < field.cellDimAmounts.length; i++) {
    field.cellDimAmounts[i] = damp(field.cellDimAmounts[i], field.cellDimTargets[i], dimMorph, dt);
  }
}

export function isDimMorphing(field) {
  for (let i = 0; i < field.cellDimAmounts.length; i++) {
    if (Math.abs(field.cellDimAmounts[i] - field.cellDimTargets[i]) > 0.012) return true;
  }
  return false;
}

export function isFieldMorphing(field) {
  const centerSep = Math.hypot(
    field.projectCenter.x - field.targetProjectCenter.x,
    field.projectCenter.y - field.targetProjectCenter.y
  );
  const radiusSep = Math.hypot(
    field.projectRadius.x - field.targetProjectRadius.x,
    field.projectRadius.y - field.targetProjectRadius.y
  );
  return (
    centerSep > 0.0008 ||
    radiusSep > 0.0008 ||
    Math.abs(field.bulgeAmount - field.targetBulgeAmount) > 0.008 ||
    Math.abs(field.projectStrength - field.targetProjectStrength) > 0.008
  );
}
