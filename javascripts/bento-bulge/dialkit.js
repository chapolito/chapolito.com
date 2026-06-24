import GUI from "/javascripts/vendor/lil-gui.esm.min.js";

const STORAGE_KEY = "bento-bulge-params-v17";

export const defaultParams = {
  maxDisplacementRatio: 0.012,
  projectWeight: 0.82,
  projectSpread: 1.08,
  morphSpeed: 7,
  hillRadiusScale: 1.85,
  hillFlatness: 0.6,
  screenBulgeScale: 6,
  dimOpacity: 0.65,
  dimMorphSpeed: 6,
  subdivisions: 20,
  enablePerspective: false,
  showAlignmentOverlay: false,
  showWireframe: false,
  maxConcurrentVideoTextures: 6,
  cornerRadius: 8,
  enableVideos: true,
  pauseIdleVideos: false,
  pressSpreadAdd: 0.29,
  pressBulgeBoost: 0.25,
  pressMorphSpeed: 14,
  pressDimOpacity: 0.35,
  overlayDimMorphSpeed: 7.5,
  dprCap: 2,
  dockTop: false
};

function loadParams() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultParams };
    return { ...defaultParams, ...JSON.parse(raw) };
  } catch {
    return { ...defaultParams };
  }
}

function saveParams(params) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(params));
  } catch {
    /* ignore */
  }
}

export function syncDockPosition(params) {
  document.body.classList.toggle("dock--top", Boolean(params.dockTop));
}

export function createDialkit(root, params, onChange) {
  root.querySelectorAll(".bento-bulge-dialkit").forEach((node) => node.remove());

  const notify = () => {
    syncDockPosition(params);
    onChange();
  };

  const shell = document.createElement("div");
  shell.className = "bento-bulge-dialkit";
  shell.innerHTML = `
    <button type="button" class="bento-bulge-dialkit__toggle" aria-expanded="false" aria-controls="bento-bulge-dialkit-panel">
      Debug
    </button>
    <div class="bento-bulge-dialkit__panel" id="bento-bulge-dialkit-panel" hidden></div>
  `;
  root.appendChild(shell);

  const toggle = shell.querySelector(".bento-bulge-dialkit__toggle");
  const panel = shell.querySelector(".bento-bulge-dialkit__panel");
  const gui = new GUI({ container: panel, title: "Bento bulge" });

  const debug = gui.addFolder("Debug");
  debug.add(params, "dockTop").name("dock top").onChange(notify);
  debug.add(params, "showWireframe").name("wireframe").onChange(notify);
  debug.add(params, "showAlignmentOverlay").name("alignment").onChange(notify);
  debug.add(params, "enableVideos").name("videos").onChange(notify);
  debug.add(params, "pauseIdleVideos").name("pause idle videos").onChange(notify);
  debug
    .add(params, "hillRadiusScale", 1, 3, 0.01)
    .name("hill radius")
    .onChange(notify);
  debug.close();

  const press = gui.addFolder("Press");
  press
    .add(params, "pressSpreadAdd", 0, 0.65, 0.01)
    .name("spread tighten")
    .onChange(notify);
  press
    .add(params, "pressBulgeBoost", 0, 0.6, 0.01)
    .name("bulge depress")
    .onChange(notify);
  press
    .add(params, "pressMorphSpeed", 4, 28, 1)
    .name("ripple speed")
    .onChange(notify);
  press
    .add(params, "pressDimOpacity", 0.08, 0.65, 0.01)
    .name("idle dim on press")
    .onChange(notify);
  press.close();

  const actions = {
    copySettings() {
      navigator.clipboard.writeText(JSON.stringify(params, null, 2));
    },
    resetSettings() {
      Object.assign(params, defaultParams);
      gui.controllersRecursive().forEach((c) => c.updateDisplay());
      notify();
    }
  };
  gui.add(actions, "copySettings").name("Copy settings");
  gui.add(actions, "resetSettings").name("Reset settings");

  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", open ? "false" : "true");
    panel.hidden = open;
  });

  syncDockPosition(params);

  function persist() {
    saveParams(params);
  }

  return {
    gui,
    persist,
    dispose() {
      gui.destroy();
      shell.remove();
    }
  };
}

export function initParams() {
  return loadParams();
}
