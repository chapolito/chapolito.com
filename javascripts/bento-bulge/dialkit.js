export const defaultParams = {
  maxDisplacementRatio: 0.012,
  projectWeight: 0.82,
  projectSpread: 1.08,
  morphSpeed: 7,
  hillRadiusScale: 1.85,
  hillFlatness: 0.6,
  screenBulgeScale: 6,
  dimOpacity: 0.65,
  dimMorphSpeed: 9,
  dimMorphSpeedOut: 26,
  subdivisions: 14,
  enablePerspective: false,
  maxConcurrentVideoTextures: 5,
  cornerRadius: 8,
  enableVideos: true,
  pauseIdleVideos: false,
  pressSpreadAdd: 0.29,
  pressBulgeBoost: 0.25,
  pressMorphSpeed: 14,
  pressDimOpacity: 0.35,
  overlayDimMorphSpeed: 7.5,
  dprCap: 1.5
};

export function initParams() {
  return { ...defaultParams };
}
