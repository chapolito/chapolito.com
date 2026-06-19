import GUI from "/javascripts/vendor/lil-gui.esm.min.js";

const STORAGE_KEY = "bento-bulge-params-v10";

export const defaultParams = {
  maxDisplacementRatio: 0.012,
  projectWeight: 0.82,
  cursorWeight: 0,
  projectSpread: 1.08,
  cursorSpread: 1.1,
  cursorDeadZone: 120,
  morphSpeed: 7,
  hillRadiusScale: 1.65,
  hillFlatness: 0.6,
  screenBulgeScale: 6,
  dimOpacity: 0.65,
  dimMorphSpeed: 1.75,
  organicMix: 0,
  organicSpeed: 1.2,
  organicScale: 3.5,
  enableIdleOrganic: false,
  subdivisions: 20,
  enablePerspective: false,
  showFakeGrid: false,
  useRealTextures: true,
  fakeGridOpacity: 0.85,
  showAlignmentOverlay: false,
  showWireframe: false,
  forceWebGL: false,
  maxConcurrentVideoTextures: 6,
  cornerRadius: 8,
  enableVideos: true,
  dprCap: 1.5
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

export function createDialkit(root, params, onChange) {
  root.querySelectorAll(".bento-bulge-dialkit").forEach((node) => node.remove());

  const shell = document.createElement("div");
  shell.className = "bento-bulge-dialkit";
  shell.innerHTML = `
    <button type="button" class="bento-bulge-dialkit__toggle" aria-expanded="false" aria-controls="bento-bulge-dialkit-panel">
      Tune
    </button>
    <div class="bento-bulge-dialkit__panel" id="bento-bulge-dialkit-panel" hidden></div>
  `;
  root.appendChild(shell);

  const toggle = shell.querySelector(".bento-bulge-dialkit__toggle");
  const panel = shell.querySelector(".bento-bulge-dialkit__panel");
  const gui = new GUI({ container: panel, title: "Bento bulge" });

  const bulge = gui.addFolder("Bulge");
  bulge.add(params, "maxDisplacementRatio", 0.001, 0.012, 0.0001).onChange(onChange);
  bulge.add(params, "hillRadiusScale", 0.75, 1.65, 0.01).onChange(onChange);
  bulge.add(params, "hillFlatness", 0.3, 1.2, 0.01).name("hill flatness").onChange(onChange);
  bulge.add(params, "screenBulgeScale", 0, 12, 0.1).onChange(onChange);
  bulge.add(params, "projectWeight", 0, 1, 0.01).onChange(onChange);
  bulge.add(params, "cursorWeight", 0, 1, 0.01).onChange(onChange);
  bulge.add(params, "projectSpread", 0.55, 1.35, 0.01).onChange(onChange);
  bulge.add(params, "cursorSpread", 0.25, 1.1, 0.01).onChange(onChange);
  bulge.add(params, "morphSpeed", 2, 14, 0.1).onChange(onChange);

  const organic = gui.addFolder("Organic");
  organic.add(params, "organicMix", 0, 0.3, 0.005).onChange(onChange);
  organic.add(params, "organicSpeed", 0.1, 1.2, 0.01).onChange(onChange);
  organic.add(params, "organicScale", 0.5, 3.5, 0.05).onChange(onChange);
  organic.add(params, "enableIdleOrganic").onChange(onChange);

  const hover = gui.addFolder("Hover");
  hover.add(params, "dimOpacity", 0.35, 0.85, 0.01).name("dim others").onChange(onChange);
  hover.add(params, "dimMorphSpeed", 0.5, 8, 0.05).name("dim morph").onChange(onChange);

  const mesh = gui.addFolder("Mesh");
  mesh.add(params, "subdivisions", 32, 100, 1).onFinishChange(onChange);
  mesh.add(params, "enablePerspective").onChange(onChange);

  const debug = gui.addFolder("Debug");
  debug.add(params, "showFakeGrid").onChange(onChange);
  debug.add(params, "useRealTextures").onChange(onChange);
  debug.add(params, "fakeGridOpacity", 0, 1, 0.01).onChange(onChange);
  debug.add(params, "showAlignmentOverlay").onChange(onChange);
  debug.add(params, "showWireframe").onChange(onChange);
  debug.add(params, "forceWebGL").onChange(onChange);
  debug.add(params, "maxConcurrentVideoTextures", 1, 8, 1).onChange(onChange);
  debug.add(params, "enableVideos").onChange(onChange);

  const actions = {
    copySettings() {
      navigator.clipboard.writeText(JSON.stringify(params, null, 2));
    },
    resetSettings() {
      Object.assign(params, defaultParams);
      gui.controllersRecursive().forEach((c) => c.updateDisplay());
      onChange();
    }
  };
  gui.add(actions, "copySettings").name("Copy settings");
  gui.add(actions, "resetSettings").name("Reset settings");

  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", open ? "false" : "true");
    panel.hidden = open;
  });

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
