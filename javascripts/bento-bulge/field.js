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
    bulgeAmount: 0,
    targetProjectCenter: { x: 0.5, y: 0.5 },
    targetProjectRadius: { x: 0.1, y: 0.1 },
    targetProjectStrength: 0,
    targetBulgeAmount: 0,
    pressSpreadAdd: 0,
    targetPressSpreadAdd: 0,
    pressBulgeAdd: 0,
    targetPressBulgeAdd: 0,
    cellDimAmounts: new Float32Array(MAX_CELLS),
    cellDimTargets: new Float32Array(MAX_CELLS),
    pressExtraDim: 0,
    targetPressExtraDim: 0,
    overlayDim: 1,
    targetOverlayDim: 1,
    active: false
  };
}

/** Uniform pixel gap from each tile edge to the rNorm = 1 ellipse (x = y). */
export function setCellTarget(field, cell, params, layout) {
  field.cellDimTargets.fill(0);

  if (!cell) {
    field.targetProjectStrength = 0;
    field.targetBulgeAmount = 0;
    field.active = false;
    return;
  }

  field.cellDimTargets[cell.index] = 1;

  const hillScale = params.hillRadiusScale ?? 1.1;
  const spread = params.projectSpread;
  const tileArea = Math.max(cell.width * cell.height, 1);
  const gapPx = Math.sqrt(tileArea / Math.PI) * Math.max(hillScale - 1, 0);

  field.active = true;
  field.targetBulgeAmount = 1;
  field.targetProjectCenter = {
    x: cell.normCenterX,
    y: cell.normCenterY
  };
  // stored * uProjectSpread reaches tile edge + gapPx on every side.
  field.targetProjectRadius = {
    x: Math.max((cell.normRadiusX + gapPx / layout.width) / spread, 1e-6),
    y: Math.max((cell.normRadiusY + gapPx / layout.height) / spread, 1e-6)
  };
  field.targetProjectStrength = 1;
}

export function snapCellDims(field) {
  field.cellDimTargets.fill(0);
  field.cellDimAmounts.fill(0);
}

export function snapOverlayDim(field) {
  field.overlayDim = field.targetOverlayDim;
}

export function snapPressState(field) {
  field.pressSpreadAdd = field.targetPressSpreadAdd;
  field.pressBulgeAdd = field.targetPressBulgeAdd;
  field.pressExtraDim = field.targetPressExtraDim;
  if (field.active) {
    const engagedBulge = Math.max(0, 1 - field.targetPressBulgeAdd);
    field.bulgeAmount = engagedBulge;
    field.targetBulgeAmount = engagedBulge;
  }
}

export function setPressTarget(field, pressing, params) {
  field.targetPressExtraDim = pressing ? 1 : 0;
  if (pressing) {
    field.targetPressSpreadAdd = params.pressSpreadAdd ?? 0.15;
    field.targetPressBulgeAdd = params.pressBulgeBoost ?? 0.06;
  } else {
    field.targetPressSpreadAdd = 0;
    field.targetPressBulgeAdd = 0;
  }
  if (field.active) {
    field.targetBulgeAmount = Math.max(0, 1 - field.targetPressBulgeAdd);
  }
}

export function updateBulgeField(field, params, dt, options = {}) {
  const morph = params.morphSpeed;
  const dimMorph = params.dimMorphSpeed ?? morph * 0.35;
  const basePressMorph = params.pressMorphSpeed ?? morph * 1.4;
  const pressMorph = options.overlayOpen ? Math.max(basePressMorph, 22) : basePressMorph;
  const overlayMorph = params.overlayDimMorphSpeed ?? 7.5;

  field.pressSpreadAdd = damp(field.pressSpreadAdd, field.targetPressSpreadAdd, pressMorph, dt);
  field.pressBulgeAdd = damp(field.pressBulgeAdd, field.targetPressBulgeAdd, pressMorph, dt);
  field.pressExtraDim = damp(field.pressExtraDim, field.targetPressExtraDim, pressMorph, dt);
  field.overlayDim = damp(field.overlayDim, field.targetOverlayDim, overlayMorph, dt);
  if (field.active) {
    field.targetBulgeAmount = Math.max(0, 1 - field.targetPressBulgeAdd);
  }

  field.projectCenter = dampVec2(field.projectCenter, field.targetProjectCenter, morph, dt);
  field.projectRadius = dampVec2(field.projectRadius, field.targetProjectRadius, morph, dt);
  field.projectStrength = damp(field.projectStrength, field.targetProjectStrength, morph, dt);
  field.bulgeAmount = damp(field.bulgeAmount, field.targetBulgeAmount, morph * 1.2, dt);

  const dimMorphOut = params.dimMorphSpeedOut ?? dimMorph * 3.5;

  for (let i = 0; i < field.cellDimAmounts.length; i++) {
    const current = field.cellDimAmounts[i];
    const target = field.cellDimTargets[i];
    const lambda = target >= current ? dimMorph : dimMorphOut;
    field.cellDimAmounts[i] = damp(current, target, lambda, dt);
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
    Math.abs(field.projectStrength - field.targetProjectStrength) > 0.008 ||
    Math.abs(field.pressSpreadAdd - field.targetPressSpreadAdd) > 0.008 ||
    Math.abs(field.pressBulgeAdd - field.targetPressBulgeAdd) > 0.008 ||
    Math.abs(field.pressExtraDim - field.targetPressExtraDim) > 0.008 ||
    Math.abs(field.overlayDim - field.targetOverlayDim) > 0.008
  );
}
