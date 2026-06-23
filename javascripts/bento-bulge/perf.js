export function isPerfEnabled() {
  try {
    return new URLSearchParams(location.search).get("debug") === "perf";
  } catch {
    return false;
  }
}

export function createPerfMonitor() {
  const el = document.createElement("div");
  el.className = "bento-bulge-perf";
  el.setAttribute("aria-hidden", "true");
  document.body.appendChild(el);

  let renders = 0;
  let renderWindowStart = performance.now();
  let rendersPerSec = 0;
  let lastRenderMs = 0;
  let coalesceHits = 0;
  let dirtySignals = 0;

  function recordDirty() {
    dirtySignals += 1;
  }

  function recordRender(frameMs) {
    renders += 1;
    lastRenderMs = frameMs;
    const now = performance.now();
    if (now - renderWindowStart >= 1000) {
      rendersPerSec = renders;
      renders = 0;
      renderWindowStart = now;
    }
  }

  function recordCoalesce() {
    coalesceHits += 1;
  }

  function update(extra = {}) {
    el.textContent = [
      `render/s ${rendersPerSec}`,
      `last ${lastRenderMs.toFixed(1)}ms`,
      `dirty ${dirtySignals}`,
      `coalesce ${coalesceHits}`,
      extra.videos != null ? `videos ${extra.videos}` : "",
      extra.slots != null ? `slots ${extra.slots}` : ""
    ].filter(Boolean).join(" · ");
  }

  const interval = window.setInterval(() => update(), 500);

  return {
    recordDirty,
    recordRender,
    recordCoalesce,
    update,
    dispose() {
      window.clearInterval(interval);
      el.remove();
    }
  };
}

export const noopPerf = {
  recordDirty() {},
  recordRender() {},
  recordCoalesce() {},
  update() {},
  dispose() {}
};
