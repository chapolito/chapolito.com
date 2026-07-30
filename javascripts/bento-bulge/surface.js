import {
  WebGLRenderer,
  Scene,
  PlaneGeometry,
  ShaderMaterial,
  Mesh,
  PerspectiveCamera,
  OrthographicCamera,
  Vector2,
  Vector4,
  SRGBColorSpace,
  NoToneMapping
} from "three";
import { vertexShader, fragmentShader, MAX_CELLS, MAX_VIDEO_SLOTS } from "./shaders.js";
import { getEffectiveDpr, shouldUseAntialias } from "./dpr.js";

function createCellUniforms(cells) {
  const rects = [];
  const veilFromTop = new Float32Array(MAX_CELLS);
  const coverAnchorX = new Float32Array(MAX_CELLS);
  const coverAnchorY = new Float32Array(MAX_CELLS);
  const insetShadow = new Float32Array(MAX_CELLS);
  const solidFill = new Float32Array(MAX_CELLS);
  for (let i = 0; i < MAX_CELLS; i++) {
    const cell = cells[i];
    if (cell) {
      rects.push(new Vector4(cell.normX, cell.normY, cell.normW, cell.normH));
      veilFromTop[i] = cell.veilFromTop ? 1 : 0;
      coverAnchorX[i] = cell.coverAnchorX ?? 0.5;
      coverAnchorY[i] = cell.coverAnchorY ?? 0.5;
      insetShadow[i] = cell.insetShadow ? 1 : 0;
      solidFill[i] = cell.isStatement ? 1 : 0;
    } else {
      rects.push(new Vector4(0, 0, 0, 0));
      veilFromTop[i] = 0;
      coverAnchorX[i] = 0.5;
      coverAnchorY[i] = 0.5;
      insetShadow[i] = 0;
      solidFill[i] = 0;
    }
  }
  return { rects, veilFromTop, coverAnchorX, coverAnchorY, insetShadow, solidFill };
}

export function createSurface(bento, layout, params, atlasTexture, emptyTexture) {
  const dpr = getEffectiveDpr(params);
  const width = layout.width;
  const height = layout.height;

  const canvas = document.createElement("canvas");
  canvas.className = "experimental-bento__surface";
  canvas.setAttribute("aria-hidden", "true");
  bento.appendChild(canvas);

  const renderer = new WebGLRenderer({
    canvas,
    alpha: true,
    antialias: shouldUseAntialias(dpr),
    premultipliedAlpha: false,
    powerPreference: "default"
  });
  renderer.setPixelRatio(dpr);
  renderer.setSize(width, height, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NoToneMapping;

  const scene = new Scene();
  const subdivisions = params.subdivisions;
  const geometry = new PlaneGeometry(width, height, subdivisions, subdivisions);

  const cellVideoSlot = new Float32Array(MAX_CELLS);
  cellVideoSlot.fill(-1);
  const cellVideoFade = new Float32Array(MAX_CELLS);
  const prevCellVideoSlot = new Float32Array(MAX_CELLS);
  prevCellVideoSlot.fill(-1);
  const videoSizes = Array.from({ length: MAX_VIDEO_SLOTS }, () => new Vector2(1, 1));
  const videoFitContain = new Float32Array(MAX_VIDEO_SLOTS);
  const videoFitFill = new Float32Array(MAX_VIDEO_SLOTS);
  const videoUniforms = {};
  for (let i = 0; i < MAX_VIDEO_SLOTS; i++) {
    videoUniforms[`uVideo${i}`] = { value: emptyTexture };
  }

  const VIDEO_FADE_SEC = 0.4;
  let videoFading = false;

  const cellUniforms = createCellUniforms(layout.cells);

  const uniforms = {
    uAtlas: { value: atlasTexture },
    uBulgeAmount: { value: 0 },
    uMaxDisplacement: { value: width * params.maxDisplacementRatio },
    uPlaneSize: { value: new Vector2(width, height) },
    uCellCount: { value: layout.cells.length },
    uCellRects: { value: cellUniforms.rects },
    uCellVeilFromTop: { value: cellUniforms.veilFromTop },
    uCellCoverAnchorX: { value: cellUniforms.coverAnchorX },
    uCellCoverAnchorY: { value: cellUniforms.coverAnchorY },
    uCellInsetShadow: { value: cellUniforms.insetShadow },
    uCellSolidFill: { value: cellUniforms.solidFill },
    uCornerRadius: { value: params.cornerRadius || 8 },
    uCellVideoSlot: { value: cellVideoSlot },
    uCellVideoFade: { value: cellVideoFade },
    uVideoSlotCount: { value: 0 },
    uVideoSize: { value: videoSizes },
    uVideoFitContain: { value: videoFitContain },
    uVideoFitFill: { value: videoFitFill },
    ...videoUniforms,
    uProjectCenter: { value: new Vector2(0.5, 0.5) },
    uProjectRadius: { value: new Vector2(0.1, 0.1) },
    uProjectStrength: { value: 0 },
    uProjectWeight: { value: params.projectWeight },
    uProjectSpread: { value: params.projectSpread },
    uHillFlatness: { value: params.hillFlatness ?? 0.52 },
    uDimOpacity: { value: params.dimOpacity },
    uHoverEngaged: { value: 0 },
    uOverlayDim: { value: 1 },
    uCellDimAmount: { value: new Float32Array(MAX_CELLS) },
    uPressExtraDim: { value: 0 },
    uPressDimOpacity: { value: params.pressDimOpacity ?? 0.35 },
    uScreenBulgeScale: { value: params.screenBulgeScale ?? 5 },
    uCameraDistance: { value: params.enablePerspective ? width * 1.1 : 1000 },
    uPerspectiveComp: { value: params.enablePerspective ? 1 : 0 },
    uSubdivisions: { value: subdivisions }
  };

  const material = new ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false
  });

  if (renderer.debug) {
    renderer.debug.checkShaderErrors = true;
  }

  const mesh = new Mesh(geometry, material);
  mesh.position.set(width * 0.5, height * 0.5, 0);
  scene.add(mesh);

  let camera;
  if (params.enablePerspective) {
    camera = new PerspectiveCamera(28, width / height, 1, 3000);
    camera.position.set(width * 0.5, height * 0.5, width * 1.1);
    camera.lookAt(width * 0.5, height * 0.5, 0);
  } else {
    camera = new OrthographicCamera(0, width, height, 0, -500, 500);
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
    const next = new PlaneGeometry(w, h, params.subdivisions, params.subdivisions);
    mesh.geometry = next;
    mesh.position.set(w * 0.5, h * 0.5, 0);
    uniforms.uSubdivisions.value = params.subdivisions;
    uniforms.uPlaneSize.value.set(w, h);
    uniforms.uMaxDisplacement.value = w * params.maxDisplacementRatio;
    uniforms.uCellCount.value = newLayout.cells.length;
    const nextCellUniforms = createCellUniforms(newLayout.cells);
    uniforms.uCellRects.value = nextCellUniforms.rects;
    uniforms.uCellVeilFromTop.value = nextCellUniforms.veilFromTop;
    uniforms.uCellCoverAnchorX.value = nextCellUniforms.coverAnchorX;
    uniforms.uCellCoverAnchorY.value = nextCellUniforms.coverAnchorY;
    uniforms.uCellInsetShadow.value = nextCellUniforms.insetShadow;
    uniforms.uCellSolidFill.value = nextCellUniforms.solidFill;
    if (camera.isPerspectiveCamera) {
      camera.aspect = w / h;
      camera.position.set(w * 0.5, h * 0.5, w * 1.1);
      camera.lookAt(w * 0.5, h * 0.5, 0);
      camera.updateProjectionMatrix();
      uniforms.uCameraDistance.value = w * 1.1;
    } else {
      camera.right = w;
      camera.top = h;
      camera.updateProjectionMatrix();
    }
  }

  function updateFromField(field, params) {
    const layout = { width: currentWidth, height: currentHeight };
    uniforms.uBulgeAmount.value = field.bulgeAmount;
    uniforms.uProjectCenter.value.set(field.projectCenter.x, field.projectCenter.y);
    uniforms.uProjectRadius.value.set(field.projectRadius.x, field.projectRadius.y);
    uniforms.uProjectStrength.value = field.projectStrength;
    uniforms.uProjectWeight.value = params.projectWeight;
    uniforms.uProjectSpread.value = params.projectSpread * Math.max(0.35, 1 - field.pressSpreadAdd);
    uniforms.uHillFlatness.value = params.hillFlatness ?? 0.52;
    uniforms.uMaxDisplacement.value = layout.width * params.maxDisplacementRatio;
    uniforms.uDimOpacity.value = params.dimOpacity;
    uniforms.uHoverEngaged.value = field.active ? 1 : 0;
    uniforms.uCellDimAmount.value = field.cellDimAmounts;
    uniforms.uPressExtraDim.value = field.pressExtraDim;
    uniforms.uPressDimOpacity.value = params.pressDimOpacity ?? 0.35;
    uniforms.uOverlayDim.value = field.overlayDim;
    uniforms.uScreenBulgeScale.value = params.screenBulgeScale ?? 5;
    uniforms.uPerspectiveComp.value = params.enablePerspective ? 1 : 0;
    if (camera.isPerspectiveCamera) {
      uniforms.uCameraDistance.value = layout.width * 1.1;
    }
    uniforms.uCornerRadius.value = params.cornerRadius || 8;
    uniforms.uSubdivisions.value = params.subdivisions;
  }

  function updateVideoSlots(videoState) {
    const { slots, cellSlots } = videoState;
    uniforms.uVideoSlotCount.value = slots.length;

    for (let i = 0; i < MAX_CELLS; i++) {
      const next = cellSlots[i] ?? -1;
      const prev = prevCellVideoSlot[i];
      cellVideoSlot[i] = next;
      if (next >= 0 && prev < 0) {
        cellVideoFade[i] = 0;
        videoFading = true;
      } else if (next < 0 && prev >= 0) {
        cellVideoFade[i] = 0;
      }
      prevCellVideoSlot[i] = next;
    }
    uniforms.uCellVideoSlot.value = cellVideoSlot;
    uniforms.uCellVideoFade.value = cellVideoFade;

    for (let i = 0; i < MAX_VIDEO_SLOTS; i++) {
      const slot = slots[i];
      if (slot) {
        uniforms[`uVideo${i}`].value = slot.texture;
        videoSizes[i].set(slot.width, slot.height);
        videoFitContain[i] = slot.fitContain;
        videoFitFill[i] = slot.fitFill;
      } else {
        uniforms[`uVideo${i}`].value = emptyTexture;
        videoSizes[i].set(1, 1);
        videoFitContain[i] = 0;
        videoFitFill[i] = 0;
      }
    }

    uniforms.uVideoSize.value = videoSizes;
    uniforms.uVideoFitContain.value = videoFitContain;
    uniforms.uVideoFitFill.value = videoFitFill;
  }

  function tickVideoFades(dt, instant = false) {
    if (!videoFading && !instant) return false;

    let stillFading = false;
    const step = instant ? 1 : dt / VIDEO_FADE_SEC;

    for (let i = 0; i < MAX_CELLS; i++) {
      if (cellVideoSlot[i] < 0) {
        cellVideoFade[i] = 0;
        continue;
      }
      if (cellVideoFade[i] >= 1) continue;

      // Hold on solid fill until the slot texture has uploaded — empty/black GPU
      // samples would otherwise fade #222229 → black before content arrives.
      if (!instant) {
        const slot = cellVideoSlot[i];
        const tex = slot >= 0 ? uniforms[`uVideo${slot}`]?.value : null;
        if (!tex || tex === emptyTexture || tex.userData?.frameUploaded !== true) {
          stillFading = true;
          continue;
        }
      }

      cellVideoFade[i] = Math.min(1, cellVideoFade[i] + step);
      if (cellVideoFade[i] < 1) stillFading = true;
    }

    videoFading = stillFading;
    uniforms.uCellVideoFade.value = cellVideoFade;
    return stillFading;
  }

  function hasVideoFading() {
    return videoFading;
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
    tickVideoFades,
    hasVideoFading,
    render,
    dispose
  };
}
