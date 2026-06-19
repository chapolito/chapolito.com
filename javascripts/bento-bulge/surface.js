import * as THREE from "/javascripts/vendor/three.module.min.js";
import { vertexShader, fragmentShader, MAX_CELLS, MAX_VIDEO_SLOTS } from "./shaders.js";

function createCellUniforms(cells) {
  const rects = [];
  for (let i = 0; i < MAX_CELLS; i++) {
    const cell = cells[i];
    if (cell) {
      rects.push(new THREE.Vector4(cell.normX, cell.normY, cell.normW, cell.normH));
    } else {
      rects.push(new THREE.Vector4(0, 0, 0, 0));
    }
  }
  return rects;
}

export function createSurface(bento, layout, params, atlasTexture, emptyTexture) {
  const dpr = Math.min(window.devicePixelRatio || 1, params.dprCap ?? 2);
  const width = layout.width;
  const height = layout.height;

  const canvas = document.createElement("canvas");
  canvas.className = "experimental-bento__surface";
  canvas.setAttribute("aria-hidden", "true");
  bento.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    premultipliedAlpha: false,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(dpr);
  renderer.setSize(width, height, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;

  const scene = new THREE.Scene();
  const subdivisions = params.subdivisions;
  const geometry = new THREE.PlaneGeometry(width, height, subdivisions, subdivisions);

  const cellVideoSlot = new Float32Array(MAX_CELLS);
  cellVideoSlot.fill(-1);
  const videoSizes = Array.from({ length: MAX_VIDEO_SLOTS }, () => new THREE.Vector2(1, 1));
  const videoFitContain = new Float32Array(MAX_VIDEO_SLOTS);
  const videoUniforms = {};
  for (let i = 0; i < MAX_VIDEO_SLOTS; i++) {
    videoUniforms[`uVideo${i}`] = { value: emptyTexture };
  }

  const uniforms = {
    uAtlas: { value: atlasTexture },
    uUseAtlas: { value: params.useRealTextures ? 1 : 0 },
    uShowFakeGrid: { value: params.showFakeGrid ? 1 : 0 },
    uShowAlignment: { value: 0 },
    uLayerOpacity: { value: params.fakeGridOpacity },
    uBulgeAmount: { value: 0 },
    uMaxDisplacement: { value: width * params.maxDisplacementRatio },
    uPlaneSize: { value: new THREE.Vector2(width, height) },
    uCellCount: { value: layout.cells.length },
    uCellRects: { value: createCellUniforms(layout.cells) },
    uCornerRadius: { value: params.cornerRadius || 8 },
    uCellVideoSlot: { value: cellVideoSlot },
    uVideoSlotCount: { value: 0 },
    uVideoSize: { value: videoSizes },
    uVideoFitContain: { value: videoFitContain },
    ...videoUniforms,
    uProjectCenter: { value: new THREE.Vector2(0.5, 0.5) },
    uProjectRadius: { value: new THREE.Vector2(0.1, 0.1) },
    uProjectStrength: { value: 0 },
    uProjectWeight: { value: params.projectWeight },
    uCursorCenter: { value: new THREE.Vector2(0.5, 0.5) },
    uCursorRadius: { value: new THREE.Vector2(0.05, 0.05) },
    uCursorStrength: { value: 0 },
    uCursorWeight: { value: params.cursorWeight },
    uOrganicMix: { value: params.organicMix },
    uOrganicSpeed: { value: params.organicSpeed },
    uOrganicScale: { value: params.organicScale },
    uTime: { value: 0 },
    uProjectSpread: { value: params.projectSpread },
    uCursorSpread: { value: params.cursorSpread },
    uHillFlatness: { value: params.hillFlatness ?? 0.52 },
    uDimOpacity: { value: params.dimOpacity },
    uOverlayDim: { value: 1 },
    uCellDimAmount: { value: new Float32Array(MAX_CELLS) },
    uScreenBulgeScale: { value: params.screenBulgeScale ?? 5 },
    uCameraDistance: { value: params.enablePerspective ? width * 1.1 : 1000 },
    uPerspectiveComp: { value: params.enablePerspective ? 1 : 0 },
    uShowWireframe: { value: params.showWireframe ? 1 : 0 },
    uSubdivisions: { value: subdivisions }
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false
  });

  if (renderer.debug) {
    renderer.debug.checkShaderErrors = true;
  }

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(width * 0.5, height * 0.5, 0);
  scene.add(mesh);

  let camera;
  if (params.enablePerspective) {
    camera = new THREE.PerspectiveCamera(28, width / height, 1, 3000);
    camera.position.set(width * 0.5, height * 0.5, width * 1.1);
    camera.lookAt(width * 0.5, height * 0.5, 0);
  } else {
    camera = new THREE.OrthographicCamera(0, width, height, 0, -500, 500);
    camera.position.z = 10;
  }

  try {
    renderer.compile(scene, camera);
    const program = material.program;
    const gl = renderer.getContext();
    if (program) {
      if (!gl.getShaderParameter(program.vertexShader, gl.COMPILE_STATUS)) {
        console.error("[bento-bulge] vertex shader:", gl.getShaderInfoLog(program.vertexShader));
      }
      if (!gl.getShaderParameter(program.fragmentShader, gl.COMPILE_STATUS)) {
        console.error("[bento-bulge] fragment shader:", gl.getShaderInfoLog(program.fragmentShader));
      }
    }
  } catch (err) {
    console.warn("[bento-bulge] shader compile check:", err);
  }

  let currentWidth = width;
  let currentHeight = height;

  function resize(newLayout) {
    const w = newLayout.width;
    const h = newLayout.height;
    currentWidth = w;
    currentHeight = h;
    renderer.setSize(w, h, false);
    mesh.geometry.dispose();
    const next = new THREE.PlaneGeometry(w, h, params.subdivisions, params.subdivisions);
    mesh.geometry = next;
    mesh.position.set(w * 0.5, h * 0.5, 0);
    uniforms.uSubdivisions.value = params.subdivisions;
    uniforms.uPlaneSize.value.set(w, h);
    uniforms.uMaxDisplacement.value = w * params.maxDisplacementRatio;
    uniforms.uCellCount.value = newLayout.cells.length;
    uniforms.uCellRects.value = createCellUniforms(newLayout.cells);
    if (camera.isPerspectiveCamera) {
      camera.aspect = w / h;
      camera.position.set(w * 0.5, h * 0.5, w * 1.1);
      camera.lookAt(w * 0.5, h * 0.5, 0);
      camera.updateProjectionMatrix();
      uniforms.uCameraDistance.value = w * 1.1;
    } else {
      camera.right = w;
      camera.top = h;
      camera.bottom = 0;
      camera.updateProjectionMatrix();
    }
  }

  function updateFromField(field, params) {
    uniforms.uBulgeAmount.value = field.bulgeAmount;
    uniforms.uProjectCenter.value.set(field.projectCenter.x, field.projectCenter.y);
    uniforms.uProjectRadius.value.set(field.projectRadius.x, field.projectRadius.y);
    uniforms.uProjectStrength.value = field.projectStrength;
    uniforms.uCursorCenter.value.set(field.cursorCenter.x, field.cursorCenter.y);
    uniforms.uCursorRadius.value.set(field.cursorRadius.x, field.cursorRadius.y);
    uniforms.uCursorStrength.value = field.cursorStrength;
    uniforms.uTime.value = field.time;
    uniforms.uProjectWeight.value = params.projectWeight;
    uniforms.uCursorWeight.value = params.cursorWeight;
    uniforms.uOrganicMix.value = params.organicMix;
    uniforms.uOrganicSpeed.value = params.organicSpeed;
    uniforms.uOrganicScale.value = params.organicScale;
    uniforms.uProjectSpread.value = params.projectSpread;
    uniforms.uCursorSpread.value = params.cursorSpread;
    uniforms.uHillFlatness.value = params.hillFlatness ?? 0.52;
    uniforms.uMaxDisplacement.value = layout.width * params.maxDisplacementRatio;
    uniforms.uDimOpacity.value = params.dimOpacity;
    uniforms.uCellDimAmount.value = field.cellDimAmounts;
    uniforms.uScreenBulgeScale.value = params.screenBulgeScale ?? 5;
    uniforms.uPerspectiveComp.value = params.enablePerspective ? 1 : 0;
    if (camera.isPerspectiveCamera) {
      uniforms.uCameraDistance.value = layout.width * 1.1;
    }
    uniforms.uShowFakeGrid.value = params.showFakeGrid ? 1 : 0;
    uniforms.uUseAtlas.value = params.useRealTextures ? 1 : 0;
    uniforms.uShowAlignment.value = params.showAlignmentOverlay ? 1 : 0;
    uniforms.uLayerOpacity.value = params.fakeGridOpacity;
    uniforms.uCornerRadius.value = params.cornerRadius || 8;
    uniforms.uShowWireframe.value = params.showWireframe ? 1 : 0;
    uniforms.uSubdivisions.value = params.subdivisions;
  }

  function updateVideoSlots(videoState) {
    const { slots, cellSlots } = videoState;
    uniforms.uVideoSlotCount.value = slots.length;
    uniforms.uCellVideoSlot.value = cellSlots;

    for (let i = 0; i < MAX_VIDEO_SLOTS; i++) {
      const slot = slots[i];
      if (slot) {
        uniforms[`uVideo${i}`].value = slot.texture;
        videoSizes[i].set(slot.width, slot.height);
        videoFitContain[i] = slot.fitContain;
      } else {
        uniforms[`uVideo${i}`].value = emptyTexture;
        videoSizes[i].set(1, 1);
        videoFitContain[i] = 0;
      }
    }

    uniforms.uVideoSize.value = videoSizes;
    uniforms.uVideoFitContain.value = videoFitContain;
  }

  function setOverlayDim(value) {
    uniforms.uOverlayDim.value = value;
  }

  function render() {
    if (currentWidth < 1 || currentHeight < 1) return;
    renderer.render(scene, camera);
  }

  function dispose() {
    mesh.geometry.dispose();
    material.dispose();
    renderer.dispose();
    canvas.remove();
  }

  return {
    canvas,
    renderer,
    camera,
    uniforms,
    material,
    resize,
    updateFromField,
    updateVideoSlots,
    setOverlayDim,
    render,
    dispose
  };
}
