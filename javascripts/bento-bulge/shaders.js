export const MAX_CELLS = 25;
export const MAX_VIDEO_SLOTS = 8;

export const vertexShader = /* glsl */ `
precision highp float;

uniform float uMaxDisplacement;
uniform float uBulgeAmount;
uniform vec2 uPlaneSize;
uniform vec2 uProjectCenter;
uniform vec2 uProjectRadius;
uniform float uProjectStrength;
uniform float uProjectWeight;
uniform float uProjectSpread;
uniform float uHillFlatness;
uniform float uScreenBulgeScale;
uniform float uCameraDistance;
uniform float uPerspectiveComp;

varying vec2 vUv;
varying float vHeight;
varying float vBulgeAmount;

// Raised cosine dome — zero slope at peak and at falloff edge, no hard plateau.
float smoothHill(vec2 p, vec2 center, vec2 radius, float spreadScale) {
  vec2 d = (p - center) / max(radius * spreadScale, vec2(0.0001));
  float r = clamp(length(d), 0.0, 1.0);
  float h = 0.5 * (1.0 + cos(r * 3.14159265));
  return pow(h, max(uHillFlatness, 0.3));
}

float hillRadialNorm(vec2 uv, vec2 center, vec2 radius, float spreadScale) {
  vec2 d = (uv - center) / max(radius * spreadScale, vec2(0.0001));
  return clamp(length(d), 0.0, 1.0);
}

float heightField(vec2 uv) {
  return smoothHill(uv, uProjectCenter, uProjectRadius, uProjectSpread) * uProjectStrength * uProjectWeight;
}

void main() {
  vUv = vec2(uv.x, 1.0 - uv.y);
  vBulgeAmount = uBulgeAmount;
  float h = heightField(vUv) * uMaxDisplacement * uBulgeAmount;
  vHeight = h;

  vec2 planeCenter = uPlaneSize * 0.5;
  vec2 worldPos = position.xy + planeCenter;
  vec2 parallax = (worldPos - planeCenter) * (h / max(uCameraDistance, 1.0));

  // DOM norm Y (0 = top) → plane world Y (0 = bottom, height = top)
  vec2 peakWorld = vec2(uProjectCenter.x, 1.0 - uProjectCenter.y) * uPlaneSize;
  vec2 fromPeak = worldPos - peakWorld;
  float fromPeakLen = length(fromPeak);
  vec2 radialWorld = fromPeakLen > 0.001 ? fromPeak / fromPeakLen : vec2(0.0);
  float rNorm = hillRadialNorm(vUv, uProjectCenter, uProjectRadius, uProjectSpread);
  float pushFactor = rNorm * rNorm;
  vec2 screenPush = radialWorld * h * uScreenBulgeScale * pushFactor;

  vec3 transformed = vec3(position.xy - parallax * uPerspectiveComp + screenPush, h);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
}
`;

export const fragmentShader = /* glsl */ `
precision highp float;

uniform sampler2D uAtlas;
uniform float uShowAlignment;
uniform vec2 uPlaneSize;
uniform int uCellCount;
uniform vec4 uCellRects[25];
uniform float uCornerRadius;
uniform float uCellVideoSlot[25];
uniform int uVideoSlotCount;
uniform vec2 uVideoSize[8];
uniform float uVideoFitContain[8];
uniform float uVideoFitFill[8];
uniform sampler2D uVideo0;
uniform sampler2D uVideo1;
uniform sampler2D uVideo2;
uniform sampler2D uVideo3;
uniform sampler2D uVideo4;
uniform sampler2D uVideo5;
uniform sampler2D uVideo6;
uniform sampler2D uVideo7;

uniform float uDimOpacity;
uniform float uHoverEngaged;
uniform float uCellDimAmount[${MAX_CELLS}];
uniform float uPressExtraDim;
uniform float uPressDimOpacity;
uniform float uCellVeilFromTop[${MAX_CELLS}];
uniform float uCellCoverAnchorX[${MAX_CELLS}];
uniform float uCellCoverAnchorY[${MAX_CELLS}];
uniform float uCellInsetShadow[${MAX_CELLS}];
uniform float uOverlayDim;
uniform float uShowWireframe;
uniform float uSubdivisions;

varying vec2 vUv;
varying float vHeight;
varying float vBulgeAmount;

float sdRoundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + vec2(r);
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

float cellCornerRadiusNorm(vec4 rect) {
  return uCornerRadius / max(uPlaneSize.x, uPlaneSize.y);
}

float cellRoundedDist(vec2 uv, vec4 rect) {
  vec2 center = rect.xy + rect.zw * 0.5;
  vec2 rectHalf = rect.zw * 0.5;
  return sdRoundedBox(uv - center, rectHalf, cellCornerRadiusNorm(rect));
}

float distToEdgePx(float d) {
  float grad = max(length(vec2(dFdx(d), dFdy(d))), 0.0001);
  return -d / grad;
}

float cellShapeAlpha(float d) {
  float aa = max(length(vec2(dFdx(d), dFdy(d))) * 1.25, 0.0001);
  return 1.0 - smoothstep(-aa, aa, d);
}

int cellIndexAt(vec2 uv) {
  for (int i = 0; i < 25; i++) {
    if (i >= uCellCount) break;
    vec4 rect = uCellRects[i];
    if (
      uv.x >= rect.x && uv.x <= rect.x + rect.z &&
      uv.y >= rect.y && uv.y <= rect.y + rect.w
    ) {
      return i;
    }
  }
  return -1;
}

vec2 coverUV(vec2 local, float cellAspect, float mediaAspect, vec2 anchor) {
  vec2 uv = local;
  if (mediaAspect > cellAspect) {
    float visible = cellAspect / mediaAspect;
    uv.x = anchor.x * (1.0 - visible) + local.x * visible;
  } else {
    float visible = mediaAspect / cellAspect;
    uv.y = anchor.y * (1.0 - visible) + local.y * visible;
  }
  return clamp(uv, 0.0, 1.0);
}

vec2 containUV(vec2 local, float cellAspect, float mediaAspect) {
  vec2 uv = local;
  if (mediaAspect > cellAspect) {
    uv.y = 0.5 + (local.y - 0.5) * (mediaAspect / cellAspect);
  } else {
    uv.x = 0.5 + (local.x - 0.5) * (cellAspect / mediaAspect);
  }
  return uv;
}

vec3 containBackground(vec2 local) {
  float d = length((local - 0.5) * vec2(1.0, 1.2));
  return mix(vec3(0.078, 0.063, 0.110), vec3(0.173, 0.137, 0.212), clamp(1.15 - d, 0.0, 1.0));
}

vec3 sampleVideoSlot(int slot, vec2 mediaUV) {
  if (slot == 0) return texture2D(uVideo0, mediaUV).rgb;
  if (slot == 1) return texture2D(uVideo1, mediaUV).rgb;
  if (slot == 2) return texture2D(uVideo2, mediaUV).rgb;
  if (slot == 3) return texture2D(uVideo3, mediaUV).rgb;
  if (slot == 4) return texture2D(uVideo4, mediaUV).rgb;
  if (slot == 5) return texture2D(uVideo5, mediaUV).rgb;
  if (slot == 6) return texture2D(uVideo6, mediaUV).rgb;
  return texture2D(uVideo7, mediaUV).rgb;
}

vec3 applyLegibilityVeil(vec3 color, vec2 local, float strength, float fromTop) {
  if (strength < 0.001) return color;
  float angle = 0.2617993877991494;
  float t = fromTop > 0.5
    ? clamp(local.x * sin(angle) + local.y * cos(angle), 0.0, 1.0)
    : clamp(local.x * sin(angle) + (1.0 - local.y) * cos(angle), 0.0, 1.0);
  float mask = mix(0.72, 0.0, smoothstep(0.0, 0.5, t));
  return color * (1.0 - mask * strength);
}

vec3 applyCellBorder(vec3 color, float edgeDistPx, float strength) {
  // 0.5px hairline — rgba(255, 255, 255, 0.1)
  float borderMix = 1.0 - smoothstep(0.0, 0.5, edgeDistPx);
  return mix(color, vec3(1.0), borderMix * 0.1 * strength);
}

vec3 applyInsetShadow(vec3 color, float edgeDistPx) {
  // Figma node 2491:47930 — inset 0 0 45px 45px #222229
  float insetReach = 90.0;
  float vignette = smoothstep(0.0, insetReach, edgeDistPx);
  vec3 shadow = vec3(0.133333, 0.133333, 0.160784);
  return mix(shadow, color, vignette);
}

void main() {
  vec2 uv = vUv;
  int idx = cellIndexAt(uv);
  vec3 color;
  float alpha = 0.0;

  if (idx >= 0 && uCellVideoSlot[idx] >= 0.0) {
    int slot = int(uCellVideoSlot[idx] + 0.5);
    vec4 rect = uCellRects[idx];
    vec2 local = (uv - rect.xy) / max(rect.zw, vec2(0.0001));
    float cellAspect = rect.z * uPlaneSize.x / max(rect.w * uPlaneSize.y, 0.0001);
    vec2 mediaSize = uVideoSize[slot];
    float mediaAspect = mediaSize.x / max(mediaSize.y, 0.0001);
    vec2 mediaUV;
    if (uVideoFitFill[slot] > 0.5) {
      mediaUV = local;
    } else if (uVideoFitContain[slot] > 0.5) {
      mediaUV = containUV(local, cellAspect, mediaAspect);
    } else {
      mediaUV = coverUV(
        local,
        cellAspect,
        mediaAspect,
        vec2(uCellCoverAnchorX[idx], uCellCoverAnchorY[idx])
      );
    }
    if (uVideoFitContain[slot] > 0.5) {
      bool inMedia = mediaUV.x >= 0.0 && mediaUV.x <= 1.0 && mediaUV.y >= 0.0 && mediaUV.y <= 1.0;
      color = inMedia
        ? sampleVideoSlot(slot, clamp(mediaUV, 0.0, 1.0))
        : containBackground(local);
    } else {
      color = sampleVideoSlot(slot, clamp(mediaUV, 0.0, 1.0));
    }
    alpha = 1.0;
  } else {
    vec4 atlasSample = texture2D(uAtlas, uv);
    color = atlasSample.rgb;
    alpha = atlasSample.a;
  }

  if (idx >= 0) {
    vec4 rect = uCellRects[idx];
    vec2 local = (uv - rect.xy) / max(rect.zw, vec2(0.0001));
    float cellDist = cellRoundedDist(uv, rect);
    float edgeDistPx = distToEdgePx(cellDist);

    if (uCellVideoSlot[idx] >= 0.0) {
      alpha *= cellShapeAlpha(cellDist);
    }

    float veilStrength = vBulgeAmount > 0.001 ? uCellDimAmount[idx] : 0.0;
    color = applyLegibilityVeil(color, local, veilStrength, uCellVeilFromTop[idx]);
    if (uCellInsetShadow[idx] > 0.5) {
      color = applyInsetShadow(color, edgeDistPx);
    }
    float borderStrength = 1.0 - uPressExtraDim;
    if (borderStrength > 0.001) {
      color = applyCellBorder(color, edgeDistPx, borderStrength);
    }
  }

  float bulge = vBulgeAmount;
  if (bulge > 0.001 && uHoverEngaged > 0.5 && idx >= 0) {
    float dimFactor = mix(uDimOpacity, 1.0, uCellDimAmount[idx]);
    if (uPressExtraDim > 0.001 && uCellDimAmount[idx] < 0.5) {
      dimFactor = mix(dimFactor, uPressDimOpacity, uPressExtraDim);
    }
    alpha *= dimFactor;
  }

  if (uShowAlignment > 0.5 && idx >= 0) {
    vec4 rect = uCellRects[idx];
    float d = cellRoundedDist(uv, rect);
    float dPx = abs(d / max(length(vec2(dFdx(d), dFdy(d))), 0.0001));
    if (dPx < 1.5) {
      color = mix(color, vec3(0.2, 0.9, 0.5), 0.85);
    }
  }

  if (uShowWireframe > 0.5) {
    vec2 gridUV = vUv * uSubdivisions;
    vec2 grid = abs(fract(gridUV - 0.5) - 0.5);
    vec2 gridWidth = fwidth(gridUV) * 0.75;
    vec2 lineAA = smoothstep(vec2(0.0), gridWidth, grid);
    float line = 1.0 - lineAA.x * lineAA.y;
    color = mix(color, vec3(1.0), line * 0.3);
    alpha = max(alpha, line * 0.3);
  }

  gl_FragColor = vec4(color, alpha * uOverlayDim);
}
`;
