export function getEffectiveDpr(params) {
  const cap = params.dprCap ?? 1.5;
  const adaptiveCap = window.innerWidth > 1200 ? cap : Math.min(cap, 1.25);
  return Math.min(window.devicePixelRatio || 1, adaptiveCap);
}

export function shouldUseAntialias(dpr = 1) {
  return dpr < 1.5;
}
