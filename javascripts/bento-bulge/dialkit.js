import GUI from "/javascripts/vendor/lil-gui.esm.min.js";

const STORAGE_KEY = "bento-bulge-params-v14";

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
  dimMorphSpeed: 6,
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
  dprCap: 2
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
      Debug
    </button>
    <div class="bento-bulge-dialkit__panel" id="bento-bulge-dialkit-panel" hidden></div>
  `;
  root.appendChild(shell);

  const toggle = shell.querySelector(".bento-bulge-dialkit__toggle");
  const panel = shell.querySelector(".bento-bulge-dialkit__panel");
  const gui = new GUI({ container: panel, title: "Bento bulge" });

  function syncFakeOpacityVisibility(show) {
    fakeOpacityCtrl.domElement.style.display = show ? "" : "none";
  }

  const debug = gui.addFolder("Debug");
  debug.add(params, "showWireframe").name("wireframe").onChange(onChange);
  debug.add(params, "showAlignmentOverlay").name("alignment").onChange(onChange);
  debug.add(params, "showFakeGrid").name("fake grid").onChange((value) => {
    syncFakeOpacityVisibility(value);
    onChange();
  });
  const fakeOpacityCtrl = debug
    .add(params, "fakeGridOpacity", 0, 1, 0.01)
    .name("fake opacity")
    .onChange(onChange);
  debug.add(params, "useRealTextures").name("real textures").onChange(onChange);
  debug.add(params, "enableVideos").name("videos").onChange(onChange);
  debug
    .add(params, "maxConcurrentVideoTextures", 1, 8, 1)
    .name("video slots")
    .onChange(onChange);
  debug.add(params, "forceWebGL").name("force WebGL").onChange(onChange);
  debug.close();
  syncFakeOpacityVisibility(params.showFakeGrid);

  const actions = {
    copySettings() {
      navigator.clipboard.writeText(JSON.stringify(params, null, 2));
    },
    resetSettings() {
      Object.assign(params, defaultParams);
      gui.controllersRecursive().forEach((c) => c.updateDisplay());
      syncFakeOpacityVisibility(params.showFakeGrid);
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
