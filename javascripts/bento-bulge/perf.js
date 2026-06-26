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

  const renderTimes = [];
  let lastRenderMs = 0;
  let coalesceHits = 0;
  let dirtySignals = 0;

  function pruneRenderTimes(now) {
    while (renderTimes.length && now - renderTimes[0] > 1000) {
      renderTimes.shift();
    }
  }

  function renderRate(now = performance.now()) {
    pruneRenderTimes(now);
    if (renderTimes.length < 2) return renderTimes.length;
    const windowMs = now - renderTimes[0];
    if (windowMs < 250) return renderTimes.length;
    return Math.round((renderTimes.length / windowMs) * 1000);
  }

  function recordDirty() {
    dirtySignals += 1;
  }

  function recordRender(frameMs) {
    lastRenderMs = frameMs;
    renderTimes.push(performance.now());
    pruneRenderTimes(renderTimes[renderTimes.length - 1]);
  }

  function recordCoalesce() {
    coalesceHits += 1;
  }

  function update(extra = {}) {
    el.textContent = [
      `render/s ${renderRate()}`,
      extra.mode ? extra.mode : "",
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
