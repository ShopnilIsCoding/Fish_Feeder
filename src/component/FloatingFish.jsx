import { useEffect, useRef } from "react";
import {
  Scene,
  OrthographicCamera,
  WebGLRenderer,
  PlaneGeometry,
  Mesh,
  ShaderMaterial,
  Vector3,
  Vector2,
  Clock,
} from "three";

const vertexShader = `
precision highp float;
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
precision highp float;

uniform float iTime;
uniform vec3  iResolution;

uniform int   fishCount;
uniform float speed;
uniform float waterStrength;
uniform float causticsStrength;
uniform float fishScale;

uniform bool  interactive;
uniform vec2  iMouse;
uniform float mouseInfluence;   // 0..1
uniform float mouseRadius;
uniform float mouseSwirl;

uniform bool  parallax;
uniform vec2  parallaxOffset;

uniform vec3  fishColors[8];
uniform int   fishColorCount;

float hash11(float p){
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}
vec2 hash21(float p){
  return vec2(hash11(p), hash11(p + 17.0));
}

mat2 rot(float a){
  float c=cos(a), s=sin(a);
  return mat2(c,-s,s,c);
}

// --- Water noise (fast-ish)
float n2(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash11(dot(i, vec2(127.1, 311.7)));
  float b = hash11(dot(i + vec2(1.0,0.0), vec2(127.1, 311.7)));
  float c = hash11(dot(i + vec2(0.0,1.0), vec2(127.1, 311.7)));
  float d = hash11(dot(i + vec2(1.0,1.0), vec2(127.1, 311.7)));
  vec2 u = f*f*(3.0-2.0*f);
  return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
}

float fbm(vec2 p){
  float v = 0.0;
  float a = 0.5;
  for(int i=0;i<5;i++){
    v += a * n2(p);
    p *= 2.02;
    a *= 0.5;
  }
  return v;
}

vec2 waterWarp(vec2 uv, float t){
  // big + small waves
  float w1 = fbm(uv * 1.2 + vec2(t*0.10, -t*0.06));
  float w2 = fbm(uv * 3.0 + vec2(-t*0.18, t*0.14));
  vec2 warp = vec2(w1 - 0.5, w2 - 0.5);
  return uv + warp * waterStrength;
}

float caustics(vec2 uv, float t){
  // fake caustics: warped ridges
  vec2 p = uv * 3.2;
  p += vec2(t*0.22, -t*0.18);
  float f = fbm(p);
  float g = fbm(p + 2.7);
  float c = pow(max(0.0, 1.0 - abs(f - g)), 6.0);
  return c;
}

vec3 waterColor(vec2 uv, float t){
  // base water gradient
  vec3 top = vec3(0.02, 0.10, 0.18);
  vec3 mid = vec3(0.03, 0.22, 0.35);
  vec3 deep= vec3(0.01, 0.06, 0.10);

  float y = clamp((uv.y + 1.0) * 0.5, 0.0, 1.0);
  vec3 base = mix(deep, mid, smoothstep(0.0, 1.0, y));
  base = mix(base, top, smoothstep(0.65, 1.0, y));

  // light beams
  float beams = fbm(vec2(uv.x*1.2, uv.y*3.2) + vec2(t*0.05, 0.0));
  beams = smoothstep(0.55, 0.9, beams) * 0.18;

  // caustics
  float c = caustics(uv, t) * causticsStrength;

  return base + vec3(0.18, 0.35, 0.45) * (c * 0.55 + beams);
}

vec3 getFishColor(float t){
  if (fishColorCount <= 0) return vec3(0.9,0.95,1.0);
  if (fishColorCount == 1) return fishColors[0];
  float clampedT = clamp(t, 0.0, 0.9999);
  float scaled = clampedT * float(fishColorCount - 1);
  int idx = int(floor(scaled));
  float f = fract(scaled);
  int idx2 = min(idx + 1, fishColorCount - 1);
  return mix(fishColors[idx], fishColors[idx2], f);
}

// --- Fish SDF (body + tail + fin)
float sdEllipse(vec2 p, vec2 ab){
  p = abs(p);
  float k0 = length(p / ab);
  float k1 = length(p / (ab * ab));
  return (k0 - 1.0) / max(k1, 1e-4);
}

float sdTriIso(vec2 p, vec2 q){
  p.x = abs(p.x);
  vec2 a = p - q*clamp(dot(p,q)/dot(q,q),0.0,1.0);
  vec2 b = p - vec2(clamp(p.x,0.0,q.x), q.y);
  float s = -sign(q.y);
  float d = min(dot(a,a), dot(b,b));
  float k = s*(p.x*q.y - p.y*q.x);
  return sqrt(d)*sign(k);
}

float fishSDF(vec2 p){
  // body
  float body = sdEllipse(p, vec2(0.36, 0.17));

  // tail
  vec2 pt = p + vec2(0.42, 0.0);
  float tail = sdTriIso(pt, vec2(0.18, 0.20));

  // top fin (small triangle)
  vec2 pf = p - vec2(-0.05, 0.13);
  float fin = sdTriIso(pf * rot(-0.6), vec2(0.10, 0.12));

  // union smooth
  float k = 0.07;
  float h = clamp(0.5 + 0.5*(tail - body)/k, 0.0, 1.0);
  float u = mix(tail, body, h) - k*h*(1.0-h);

  // fin union (hard)
  u = min(u, fin);

  return u;
}

float softMask(float d, float edge){
  return smoothstep(edge, -edge, d);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord){
  vec2 uv = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
  uv.y *= -1.0;

  if (parallax) uv += parallaxOffset;

  float t = iTime * speed;

  // water warp (also gives "flow")
  vec2 wuv = waterWarp(uv, t);

  // mouse swirl (optional)
  if (interactive && mouseInfluence > 0.0){
    vec2 m = (2.0 * iMouse - iResolution.xy) / iResolution.y;
    m.y *= -1.0;
    vec2 d = wuv - m;
    float r2 = dot(d,d);
    float infl = exp(-r2 * mouseRadius) * mouseInfluence;
    float a = infl * mouseSwirl;
    wuv += rot(a) * d * 0.06 * infl;
  }

  vec3 col = waterColor(wuv, t);

  // Fish layer
  for(int i=0; i<64; i++){
    if (i >= fishCount) break;

    float fi = float(i);
    vec2 rnd = hash21(fi * 21.73);

    // depth controls size and speed
    float depth = mix(0.55, 1.6, rnd.x);

    // path
    float laneY = mix(-0.85, 0.85, rnd.y);
    float swim = fract(rnd.x * 7.3 + t * (0.10 + 0.22 / depth));
    float x = mix(-1.6, 1.6, swim);

    // bob + slight curve
    float bob = sin(t * (1.2 + 0.7/depth) + fi * 4.0) * (0.05 + 0.03/depth);
    float curve = sin(t * 0.45 + fi) * 0.08;

    vec2 p = wuv - vec2(x, laneY + bob + curve);

    // fish heading (mostly right)
    float ang = (rnd.y - 0.5) * 0.25;
    p = rot(ang) * p;

    // tail flap + body wiggle
    float flap = sin(t * (4.0 + 2.0/depth) + fi * 10.0) * 0.25;
    p.y += sin(p.x * 7.0 + t * 4.0 + fi) * 0.02;
    p = rot(0.06 * sin(t*1.8 + fi)) * p;

    float s = fishScale * mix(0.18, 0.40, rnd.x) / depth;
    p /= max(s, 1e-4);

    // apply flap mainly to tail area
    vec2 pt = p;
    float tailMask = smoothstep(-0.1, 0.5, pt.x);
    pt.y += flap * tailMask * (0.35 + 0.25/depth);

    float d = fishSDF(pt);

    // silhouette
    float mask = softMask(d, 0.05);

    // highlight edge (fake underwater sheen)
    float edge = smoothstep(0.18, 0.0, abs(d));
    edge *= 0.25;

    float fcT = fi / max(float(fishCount - 1), 1.0);
    vec3 fcol = getFishColor(fcT);

    // darken fish a bit with depth, then add sheen
    vec3 fishBase = fcol * (0.55 + 0.45 / depth);
    vec3 fishSheen = vec3(0.65, 0.85, 1.0) * edge * (0.6/depth);

    // composite: fish over water
    col = mix(col, col + fishBase + fishSheen, mask * 0.85);

    // subtle trail
    float trail = exp(-abs(pt.x + 0.65)*2.6) * exp(-abs(pt.y)*4.8);
    col += fishBase * trail * 0.04;
  }

  // soft vignette
  float v = smoothstep(1.35, 0.2, length(uv));
  col *= (0.85 + 0.15*v);

  fragColor = vec4(col, 1.0);
}

void main(){
  vec4 c = vec4(0.0);
  mainImage(c, gl_FragCoord.xy);
  gl_FragColor = c;
}
`;

const MAX_COLORS = 8;

function hexToVec3(hex) {
  let v = hex.trim();
  if (v.startsWith("#")) v = v.slice(1);

  let r = 255, g = 255, b = 255;
  if (v.length === 3) {
    r = parseInt(v[0] + v[0], 16);
    g = parseInt(v[1] + v[1], 16);
    b = parseInt(v[2] + v[2], 16);
  } else if (v.length === 6) {
    r = parseInt(v.slice(0, 2), 16);
    g = parseInt(v.slice(2, 4), 16);
    b = parseInt(v.slice(4, 6), 16);
  }
  return new Vector3(r / 255, g / 255, b / 255);
}

export default function FloatingFishWater({
  fishCount = 22,
  fishColors = ["#B7FFF6", "#7AA7FF", "#E947F5"],
  speed = 1.0,

  waterStrength = 0.16,
  causticsStrength = 0.9,
  fishScale = 1.0,

  interactive = true,
  mouseDamping = 0.06,
  mouseRadius = 3.5,
  mouseSwirl = 1.4,

  parallax = true,
  parallaxStrength = 0.18,

  mixBlendMode = "screen",
}) {
  const containerRef = useRef(null);

  const targetMouseRef = useRef(new Vector2(-1000, -1000));
  const currentMouseRef = useRef(new Vector2(-1000, -1000));
  const targetInfluenceRef = useRef(0);
  const currentInfluenceRef = useRef(0);

  const targetParallaxRef = useRef(new Vector2(0, 0));
  const currentParallaxRef = useRef(new Vector2(0, 0));

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new Scene();
    const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    camera.position.z = 1;

    const renderer = new WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    containerRef.current.appendChild(renderer.domElement);

    const uniforms = {
      iTime: { value: 0 },
      iResolution: { value: new Vector3(1, 1, 1) },

      fishCount: { value: Math.min(Math.max(fishCount, 1), 64) },
      speed: { value: speed },

      waterStrength: { value: waterStrength },
      causticsStrength: { value: causticsStrength },
      fishScale: { value: fishScale },

      interactive: { value: interactive },
      iMouse: { value: new Vector2(-1000, -1000) },
      mouseInfluence: { value: 0 },
      mouseRadius: { value: mouseRadius },
      mouseSwirl: { value: mouseSwirl },

      parallax: { value: parallax },
      parallaxOffset: { value: new Vector2(0, 0) },

      fishColors: { value: Array.from({ length: MAX_COLORS }, () => new Vector3(1, 1, 1)) },
      fishColorCount: { value: 0 },
    };

    if (fishColors?.length) {
      const stops = fishColors.slice(0, MAX_COLORS);
      uniforms.fishColorCount.value = stops.length;
      stops.forEach((h, i) => {
        const c = hexToVec3(h);
        uniforms.fishColors.value[i].set(c.x, c.y, c.z);
      });
    }

    const material = new ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
    });

    const geometry = new PlaneGeometry(2, 2);
    const mesh = new Mesh(geometry, material);
    scene.add(mesh);

    const clock = new Clock();

    const setSize = () => {
      const el = containerRef.current;
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;

      renderer.setSize(w, h, false);

      const cw = renderer.domElement.width;
      const ch = renderer.domElement.height;
      uniforms.iResolution.value.set(cw, ch, 1);
    };

    setSize();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(setSize) : null;
    if (ro) ro.observe(containerRef.current);

    const handlePointerMove = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const dpr = renderer.getPixelRatio();

      targetMouseRef.current.set(x * dpr, (rect.height - y) * dpr);
      targetInfluenceRef.current = 1.0;

      if (parallax) {
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const ox = (x - cx) / rect.width;
        const oy = -(y - cy) / rect.height;
        targetParallaxRef.current.set(ox * parallaxStrength, oy * parallaxStrength);
      }
    };

    const handlePointerLeave = () => {
      targetInfluenceRef.current = 0.0;
    };

    if (interactive) {
      renderer.domElement.addEventListener("pointermove", handlePointerMove);
      renderer.domElement.addEventListener("pointerleave", handlePointerLeave);
    }

    let raf = 0;
    const loop = () => {
      uniforms.iTime.value = clock.getElapsedTime();

      if (interactive) {
        currentMouseRef.current.lerp(targetMouseRef.current, mouseDamping);
        uniforms.iMouse.value.copy(currentMouseRef.current);

        currentInfluenceRef.current +=
          (targetInfluenceRef.current - currentInfluenceRef.current) * mouseDamping;
        uniforms.mouseInfluence.value = currentInfluenceRef.current;
      }

      if (parallax) {
        currentParallaxRef.current.lerp(targetParallaxRef.current, mouseDamping);
        uniforms.parallaxOffset.value.copy(currentParallaxRef.current);
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      if (ro) ro.disconnect();

      if (interactive) {
        renderer.domElement.removeEventListener("pointermove", handlePointerMove);
        renderer.domElement.removeEventListener("pointerleave", handlePointerLeave);
      }

      geometry.dispose();
      material.dispose();
      renderer.dispose();

      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    };
  }, [
    fishCount,
    fishColors,
    speed,
    waterStrength,
    causticsStrength,
    fishScale,
    interactive,
    mouseDamping,
    mouseRadius,
    mouseSwirl,
    parallax,
    parallaxStrength,
  ]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full absolute overflow-hidden"
      style={{ mixBlendMode }}
    />
  );
}
