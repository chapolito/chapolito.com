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
uniform vec2 uCursorCenter;
uniform vec2 uCursorRadius;
uniform float uCursorStrength;
uniform float uCursorWeight;
uniform float uOrganicMix;
uniform float uOrganicSpeed;
uniform float uOrganicScale;
uniform float uTime;
uniform float uProjectSpread;
uniform float uCursorSpread;
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

float organicNoise(vec2 p, float t) {
  float a = sin(p.x * uOrganicScale * 1.7 + t * 0.31) * sin(p.y * uOrganicScale * 1.3 + t * 0.27);
  float b = sin(p.x * uOrganicScale * 0.9 - t * 0.19 + 1.4) * sin(p.y * uOrganicScale * 1.1 + t * 0.23 + 0.8);
  return (a + b) * 0.5;
}

float heightField(vec2 uv) {
  float project = smoothHill(uv, uProjectCenter, uProjectRadius, uProjectSpread) * uProjectStrength;
  float cursor = smoothHill(uv, uCursorCenter, uCursorRadius, uCursorSpread * 1.15) * uCursorStrength;
  float interactive = project * uProjectWeight + cursor * uCursorWeight;
  float organic = organicNoise(uv, uTime * uOrganicSpeed) * uOrganicMix * interactive;
  return interactive + organic;
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
uniform float uUseAtlas;
uniform float uShowFakeGrid;
uniform float uShowAlignment;
uniform float uLayerOpacity;
uniform vec2 uPlaneSize;
uniform int uCellCount;
uniform vec4 uCellRects[25];
uniform float uCornerRadius;
uniform float uCellVideoSlot[25];
uniform int uVideoSlotCount;
uniform vec2 uVideoSize[8];
uniform float uVideoFitContain[8];
uniform sampler2D uVideo0;
uniform sampler2D uVideo1;
uniform sampler2D uVideo2;
uniform sampler2D uVideo3;
uniform sampler2D uVideo4;
uniform sampler2D uVideo5;
uniform sampler2D uVideo6;
uniform sampler2D uVideo7;

uniform float uProjectWeight;
uniform float uCursorWeight;
uniform vec2 uProjectCenter;
uniform vec2 uProjectRadius;
uniform float uProjectStrength;
uniform vec2 uCursorCenter;
uniform vec2 uCursorRadius;
uniform float uCursorStrength;
uniform float uOrganicMix;
uniform float uOrganicSpeed;
uniform float uOrganicScale;
uniform float uTime;
uniform float uProjectSpread;
uniform float uCursorSpread;
uniform float uHillFlatness;
uniform float uDimOpacity;
uniform float uCellDimAmount[${MAX_CELLS}];
uniform float uOverlayDim;
uniform float uShowWireframe;
uniform float uSubdivisions;

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

float organicNoise(vec2 p, float t) {
  float a = sin(p.x * uOrganicScale * 1.7 + t * 0.31) * sin(p.y * uOrganicScale * 1.3 + t * 0.27);
  float b = sin(p.x * uOrganicScale * 0.9 - t * 0.19 + 1.4) * sin(p.y * uOrganicScale * 1.1 + t * 0.23 + 0.8);
  return (a + b) * 0.5;
}

float heightField(vec2 uv) {
  float project = smoothHill(uv, uProjectCenter, uProjectRadius, uProjectSpread) * uProjectStrength;
  float cursor = smoothHill(uv, uCursorCenter, uCursorRadius, uCursorSpread * 1.15) * uCursorStrength;
  float interactive = project * uProjectWeight + cursor * uCursorWeight;
  float organic = organicNoise(uv, uTime * uOrganicSpeed) * uOrganicMix * interactive;
  return interactive + organic;
}

float sdRoundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + vec2(r);
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

int cellIndexAt(vec2 uv) {
  for (int i = 0; i < 25; i++) {
    if (i >= uCellCount) break;
    vec4 rect = uCellRects[i];
    vec2 center = rect.xy + rect.zw * 0.5;
    vec2 rectHalf = rect.zw * 0.5;
    float d = sdRoundedBox(uv - center, rectHalf, uCornerRadius / max(uPlaneSize.x, uPlaneSize.y));
    if (d <= 0.0) return i;
  }
  return -1;
}

vec3 fakeCellColor(vec2 uv) {
  int idx = cellIndexAt(uv);
  if (idx < 0) return vec3(0.0);
  vec2 p = (uv - uCellRects[idx].xy) / max(uCellRects[idx].zw, vec2(0.0001));
  return mix(vec3(0.188), vec3(0.141), p.y);
}

vec2 coverUV(vec2 local, float cellAspect, float mediaAspect) {
  vec2 uv = local;
  if (mediaAspect > cellAspect) {
    uv.x = 0.5 + (local.x - 0.5) * (cellAspect / mediaAspect);
  } else {
    uv.y = 0.5 + (local.y - 0.5) * (mediaAspect / cellAspect);
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

vec3 applyTileVeil(vec3 color, vec2 local) {
  float angle = 0.2617993877991494;
  float t = clamp(local.x * sin(angle) + (1.0 - local.y) * cos(angle), 0.0, 1.0);
  float veil = mix(0.72, 0.0, smoothstep(0.0, 0.5, t)) * 0.18;
  return color * (1.0 - veil);
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
    vec2 mediaUV = uVideoFitContain[slot] > 0.5
      ? containUV(local, cellAspect, mediaAspect)
      : coverUV(local, cellAspect, mediaAspect);
    if (uVideoFitContain[slot] > 0.5) {
      bool inMedia = mediaUV.x >= 0.0 && mediaUV.x <= 1.0 && mediaUV.y >= 0.0 && mediaUV.y <= 1.0;
      color = inMedia
        ? sampleVideoSlot(slot, clamp(mediaUV, 0.0, 1.0))
        : containBackground(local);
    } else {
      color = sampleVideoSlot(slot, clamp(mediaUV, 0.0, 1.0));
    }
    color = applyTileVeil(color, local);
    alpha = 1.0;
  } else if (uUseAtlas > 0.5) {
    vec4 atlasSample = texture2D(uAtlas, uv);
    if (atlasSample.a < 0.04) discard;
    color = atlasSample.rgb;
    alpha = atlasSample.a;
  } else {
    if (idx < 0) discard;
    color = fakeCellColor(uv);
    alpha = 1.0;
  }

  float bulge = vBulgeAmount;
  if (bulge > 0.001 && idx >= 0) {
    alpha *= mix(uDimOpacity, 1.0, uCellDimAmount[idx]);
  }

  if (uShowFakeGrid > 0.5) {
    alpha = mix(0.0, 0.92, bulge) * uLayerOpacity;
  }

  if (uShowAlignment > 0.5 && idx >= 0) {
    vec4 rect = uCellRects[idx];
    vec2 center = rect.xy + rect.zw * 0.5;
    vec2 rectHalf = rect.zw * 0.5;
    float d = sdRoundedBox(uv - center, rectHalf, uCornerRadius / max(uPlaneSize.x, uPlaneSize.y));
    if (abs(d) < 1.5 / max(uPlaneSize.x, uPlaneSize.y)) {
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
