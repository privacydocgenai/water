import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const POOL_W = 12;
const POOL_D = 6;
const DEPTH = 1.65;
const MAX_RIPPLES = 10;

const SUN_DIR = new THREE.Vector3(0.35, 0.78, 0.28).normalize();
const DEEP_COLOR = new THREE.Color(0x063d4d);

if (!window.WebGL2RenderingContext) {
  document.getElementById('fallback').style.display = 'grid';
  throw new Error('WebGL2 unavailable');
}

const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 400);
camera.position.set(-8, 3.4, 10);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, -0.7, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 1.0;
controls.maxDistance = 26;
controls.maxPolarAngle = Math.PI * 0.86;
controls.enablePan = false;

const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  uniforms: { uSunDir: { value: SUN_DIR } },
  vertexShader: `
    varying vec3 vDir;
    void main() {
      vDir = position;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `
    uniform vec3 uSunDir;
    varying vec3 vDir;
    void main() {
      vec3 d = normalize(vDir);
      float h = clamp(d.y * 0.5 + 0.5, 0.0, 1.0);
      vec3 zenith = vec3(0.22, 0.46, 0.82);
      vec3 horizon = vec3(0.86, 0.90, 0.94);
      vec3 ground = vec3(0.42, 0.44, 0.46);
      vec3 col = mix(horizon, zenith, pow(max(d.y, 0.0), 0.55));
      col = mix(ground, col, smoothstep(-0.06, 0.02, d.y));
      float s = max(dot(d, normalize(uSunDir)), 0.0);
      col += vec3(1.0, 0.92, 0.78) * pow(s, 650.0) * 22.0;
      col += vec3(1.0, 0.85, 0.65) * pow(s, 12.0) * 0.22;
      gl_FragColor = vec4(col, 1.0);
    }`
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(190, 32, 20), skyMat);
scene.add(sky);

const pmrem = new THREE.PMREMGenerator(renderer);
{
  const envScene = new THREE.Scene();
  const envSky = new THREE.Mesh(sky.geometry, skyMat);
  envScene.add(envSky);
  scene.environment = pmrem.fromScene(envScene, 0.03).texture;
  pmrem.dispose();
}

const sunLight = new THREE.DirectionalLight(0xfff1dc, 2.6);
sunLight.position.copy(SUN_DIR).multiplyScalar(50);
scene.add(sunLight);
scene.add(new THREE.HemisphereLight(0xcfe4ff, 0x3a3f42, 0.85));

function makeTileTexture(count, base, variation, grout) {
  const c = document.createElement('canvas');
  const S = 1024;
  c.width = S; c.height = S;
  const ctx = c.getContext('2d');
  ctx.fillStyle = grout;
  ctx.fillRect(0, 0, S, S);
  const th = S / count;
  for (let j = 0; j < count; j++) {
    for (let i = 0; i < count; i++) {
      const v = (Math.random() - 0.5) * variation;
      const col = new THREE.Color(base).offsetHSL(0.01 * (Math.random() - 0.5), 0.02 * (Math.random() - 0.5), v);
      ctx.fillStyle = '#' + col.getHexString();
      const px = i * th + 2, py = j * th + 2;
      const g = ctx.createLinearGradient(px, py, px, py + th);
      g.addColorStop(0, 'rgba(255,255,255,0.22)');
      g.addColorStop(0.35, 'rgba(255,255,255,0.0)');
      g.addColorStop(1, 'rgba(0,0,0,0.14)');
      ctx.fillRect(px, py, th - 5, th - 5);
      ctx.fillStyle = g;
      ctx.fillRect(px, py, th - 5, th - 5);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function makeStoneTexture() {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#a89f92';
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 26000; i++) {
    const x = Math.random() * S, y = Math.random() * S;
    const r = Math.random() * 2.2;
    const a = 0.05 + Math.random() * 0.08;
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(60,52,44,${a})` : `rgba(235,228,214,${a})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(70,62,52,0.35)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      ctx.strokeRect(i * S / 4 + 1, j * S / 4 + 1, S / 4 - 2, S / 4 - 2);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.repeat.set(6, 6);
  return tex;
}

const underwaterG = new THREE.Group();
const aboveG = new THREE.Group();
const glassG = new THREE.Group();
const waterBodyG = new THREE.Group();
scene.add(underwaterG, aboveG, glassG, waterBodyG);

const tileTex = makeTileTexture(26, 0x9fd3dc, 0.10, '#c9d6d2');
tileTex.repeat.set(1.8, 1.8);
const wallTex = makeTileTexture(22, 0xaedde4, 0.10, '#cfdad4');
wallTex.repeat.set(3.4, 0.7);

const floorMat = new THREE.MeshStandardMaterial({ map: tileTex, roughness: 0.42, metalness: 0.05 });
const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.42, metalness: 0.05 });

const floor = new THREE.Mesh(new THREE.PlaneGeometry(POOL_W, POOL_D), floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -DEPTH;
underwaterG.add(floor);

function addWall(w, h, pos, rotY) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat);
  m.position.copy(pos);
  m.rotation.y = rotY;
  underwaterG.add(m);
}
addWall(POOL_W, DEPTH, new THREE.Vector3(0, -DEPTH / 2, -POOL_D / 2), 0);
addWall(POOL_W, DEPTH, new THREE.Vector3(0, -DEPTH / 2, POOL_D / 2), Math.PI);
addWall(POOL_D, DEPTH, new THREE.Vector3(-POOL_W / 2, -DEPTH / 2, 0), Math.PI / 2);
addWall(POOL_D, DEPTH, new THREE.Vector3(POOL_W / 2, -DEPTH / 2, 0), -Math.PI / 2);

const glassMat = new THREE.MeshPhysicalMaterial({
  color: 0xaee2ea,
  transparent: true,
  opacity: 0.16,
  roughness: 0.04,
  metalness: 0,
  side: THREE.DoubleSide,
  depthWrite: false
});
function addGlass(w, pos, rotY) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, DEPTH + 0.22), glassMat);
  m.position.copy(pos);
  m.rotation.y = rotY;
  glassG.add(m);
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(w, 0.05, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x39434a, roughness: 0.5, metalness: 0.4 })
  );
  frame.position.set(pos.x, 0.22, pos.z);
  frame.rotation.y = rotY;
  aboveG.add(frame);
}
addGlass(POOL_W, new THREE.Vector3(0, (0.22 - DEPTH) / 2, -POOL_D / 2 - 0.02), 0);
addGlass(POOL_W, new THREE.Vector3(0, (0.22 - DEPTH) / 2, POOL_D / 2 + 0.02), Math.PI);
addGlass(POOL_D, new THREE.Vector3(-POOL_W / 2 - 0.02, (0.22 - DEPTH) / 2, 0), Math.PI / 2);
addGlass(POOL_D, new THREE.Vector3(POOL_W / 2 + 0.02, (0.22 - DEPTH) / 2, 0), -Math.PI / 2);

{
  const g = new THREE.BufferGeometry();
  const pos = [];
  const col = [];
  const inset = 0.015;
  const top = new THREE.Color(0.62, 0.92, 0.95);
  const bot = new THREE.Color(0.05, 0.28, 0.36);
  function quad(a, b, c, d) {
    pos.push(...a, ...b, ...c, ...a, ...c, ...d);
    for (let k = 0; k < 6; k++) {
      const cc = (k === 0 || k === 1 || k === 3) ? top : bot;
      col.push(cc.r, cc.g, cc.b);
    }
  }
  const hw = POOL_W / 2 - inset, hd = POOL_D / 2 - inset;
  quad([-hw, 0, -hd], [hw, 0, -hd], [hw, -DEPTH, -hd], [-hw, -DEPTH, -hd]);
  quad([hw, 0, hd], [-hw, 0, hd], [-hw, -DEPTH, hd], [hw, -DEPTH, hd]);
  quad([-hw, 0, hd], [-hw, 0, -hd], [-hw, -DEPTH, -hd], [-hw, -DEPTH, hd]);
  quad([hw, 0, -hd], [hw, 0, hd], [hw, -DEPTH, hd], [hw, -DEPTH, -hd]);
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 3));
  const mat = new THREE.MeshBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.3,
    side: THREE.DoubleSide, depthWrite: false
  });
  waterBodyG.add(new THREE.Mesh(g, mat));
}

function roundedRectPath(w, d, r, PathClass) {
  const s = new PathClass();
  const x = w / 2, y = d / 2;
  s.moveTo(-x + r, -y);
  s.lineTo(x - r, -y);
  s.absarc(x - r, -y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x, y - r);
  s.absarc(x - r, y - r, r, 0, Math.PI / 2, false);
  s.lineTo(-x + r, y);
  s.absarc(-x + r, y - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(-x, -y + r);
  s.absarc(-x + r, -y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}
const OD_W = 27, OD_D = 17, r = 1.4;
const deckShape = roundedRectPath(OD_W, OD_D, r, THREE.Shape);
const holePath = roundedRectPath(POOL_W + 0.12, POOL_D + 0.12, 0.3, THREE.Path);
holePath.closePath();
deckShape.holes.push(holePath);
const stoneTex = makeStoneTexture();
const deckMat = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.95, metalness: 0 });
const deck = new THREE.Mesh(
  new THREE.ExtrudeGeometry(deckShape, { depth: 0.14, bevelEnabled: false }),
  deckMat
);
deck.rotation.x = -Math.PI / 2;
deck.position.y = 0.14;
aboveG.add(deck);

const copingMat = new THREE.MeshStandardMaterial({ color: 0xe8e2d6, roughness: 0.7 });
function addCoping(w, d, x, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.045, d), copingMat);
  m.position.set(x, 0.03, z);
  aboveG.add(m);
}
addCoping(POOL_W + 0.45, 0.28, 0, -POOL_D / 2 - 0.08);
addCoping(POOL_W + 0.45, 0.28, 0, POOL_D / 2 + 0.08);
addCoping(0.28, POOL_D + 0.45, -POOL_W / 2 - 0.08, 0);
addCoping(0.28, POOL_D + 0.45, POOL_W / 2 + 0.08, 0);

const causticUniforms = { uTime: { value: 0 } };
function injectCaustics(material, strength, scale) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = causticUniforms.uTime;
    shader.uniforms.uCauStrength = { value: strength };
    shader.uniforms.uCauScale = { value: scale };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCauPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCauPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', [
        '#include <common>',
        'varying vec3 vCauPos;',
        'uniform float uTime;',
        'uniform float uCauStrength;',
        'uniform float uCauScale;',
        'float causticPattern(vec2 uv, float t) {',
        '  vec2 p = uv * 6.28318;',
        '  vec2 k = p;',
        '  float acc = 1.0;',
        '  float inten = 0.005;',
        '  for (int i = 0; i < 4; i++) {',
        '    float ft = t * (1.0 - 3.5 / float(i + 1));',
        '    k = p + vec2(cos(ft - k.x) + sin(ft + k.y), sin(ft - k.y) + cos(ft + k.x));',
        '    acc += 1.0 / length(vec2(p.x / (sin(k.x + ft) / inten), p.y / (cos(k.y + ft) / inten)));',
        '  }',
        '  acc /= 4.0;',
        '  acc = 1.17 - pow(acc, 1.4);',
        '  return pow(abs(acc), 8.0);',
        '}'
      ].join('\n'))
      .replace('#include <emissivemap_fragment>', [
        '#include <emissivemap_fragment>',
        'float cau = causticPattern(vCauPos.xz * uCauScale, uTime * 0.55);',
        'cau *= smoothstep(-1.9, -0.25, vCauPos.y);',
        'totalEmissiveRadiance += vec3(0.42, 0.75, 0.78) * min(cau, 1.6) * uCauStrength;'
      ].join('\n'));
  };
  material.customProgramCacheKey = () => 'caustic' + strength + scale;
}
injectCaustics(floorMat, 0.85, 0.8);
injectCaustics(wallMat, 0.5, 0.8);

const MAX_FISH = 16;
const fishList = [];
let schoolTarget = null;
let schoolTimer = 0;

function animateSchool(t) {
  if (t > schoolTimer || !schoolTarget) {
    schoolTarget = new THREE.Vector3(
      THREE.MathUtils.randFloatSpread(POOL_W - 3),
      THREE.MathUtils.randFloat(-1.1, -0.55),
      THREE.MathUtils.randFloatSpread(POOL_D - 2)
    );
    schoolTimer = t + THREE.MathUtils.randFloat(5, 10);
  }
}

function fishPaint(type, x, y, z) {
  if (type.name === 'sardine') {
    const t = THREE.MathUtils.clamp((y + 0.36) / 0.72, 0, 1);
    let c = new THREE.Color(0.16, 0.27, 0.44).lerp(new THREE.Color(0.78, 0.83, 0.88), Math.pow(t, 0.8));
    c.lerp(new THREE.Color(0.95, 0.97, 1.0), Math.pow(THREE.MathUtils.clamp(-y * 2.2, 0, 1), 2));
    if (Math.abs(y + 0.04) < 0.045) c.multiplyScalar(0.55);
    return c;
  }
  if (type.name === 'koi2') {
    const base = new THREE.Color(0.96, 0.93, 0.88);
    const n = Math.sin(x * 6.4 + type.seed * 11.0) * Math.sin(z * 5.2 + y * 4.4 + type.seed * 5.0);
    if (n > 0.52) return base.clone().lerp(new THREE.Color(0.93, 0.28, 0.08), THREE.MathUtils.smoothstep(n, 0.52, 0.72));
    if (n < -0.8) return new THREE.Color(0.10, 0.10, 0.12);
    return base;
  }
  const t = THREE.MathUtils.clamp((y + 0.36) / 0.72, 0, 1);
  const c = new THREE.Color(0.95, 0.42, 0.05).lerp(new THREE.Color(1.0, 0.78, 0.38), Math.pow(t, 1.2));
  if (Math.abs(y + 0.02) < 0.03) c.multiplyScalar(0.82);
  return c;
}

function createFishGeometry(type) {
  const bodyGeo = new THREE.SphereGeometry(1, 26, 18);
  const pos = bodyGeo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const tailTaper = 1 - 0.82 * Math.pow(THREE.MathUtils.clamp((-x - 0.15) / 0.85, 0, 1), 1.35);
    const headTaper = 1 - 0.4 * Math.pow(THREE.MathUtils.clamp((x - 0.55) / 0.45, 0, 1), 2);
    const s = tailTaper * headTaper;
    pos.setY(i, y * 0.36 * s);
    pos.setZ(i, z * 0.17 * s);
    const c = fishPaint(type, x, y, z);
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  bodyGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  bodyGeo.computeVertexNormals();

  const finVerts = [
    -0.72, 0.03, 0, -1.42, 0.4, 0, -1.3, -0.06, 0,
    -0.72, -0.03, 0, -1.3, 0.06, 0, -1.42, -0.4, 0,
    -0.72, 0.03, 0, -1.3, -0.06, 0, -1.42, -0.4, 0,
    -0.72, -0.03, 0, -1.42, 0.4, 0, -1.3, 0.06, 0,
    0.18, 0.3, 0, -0.4, 0.26, 0, -0.08, 0.52, 0,
    0.1, 0.24, 0, -0.28, -0.26, 0, -0.05, -0.1, 0,
    0.5, -0.05, 0.08, 0.25, -0.05, 0.11, 0.08, -0.34, 0.03,
    0.5, -0.05, -0.08, 0.08, -0.34, -0.03, 0.25, -0.05, -0.11,
    0.45, 0.04, 0.08, 0.22, 0.04, 0.11, 0.1, 0.22, 0.02,
    0.45, 0.04, -0.08, 0.1, 0.22, -0.02, 0.22, 0.04, -0.11
  ];
  const finGeo = new THREE.BufferGeometry();
  finGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(finVerts), 3));
  finGeo.computeVertexNormals();
  return { bodyGeo, finGeo };
}

const eyeGeo = new THREE.SphereGeometry(1, 10, 8);
const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.15, metalness: 0.3 });
const FISH_TYPES = [
  { name: 'koi',    color: 0xff7a18, metal: 0.12, rough: 0.35, lens: [0.4, 0.55], thrust: 2.0, spd: [0.3, 0.7], depth: [-0.35, -0.15], count: 3, seed: 1.3 },
  { name: 'koi2',   color: 0xf3ede0, metal: 0.12, rough: 0.38, lens: [0.4, 0.55], thrust: 2.0, spd: [0.3, 0.7], depth: [-0.4, -0.2], count: 2, seed: 4.7 },
  { name: 'gold',   color: 0xffa41c, metal: 0.25, rough: 0.3,  lens: [0.2, 0.28], thrust: 2.6, spd: [0.4, 0.9], depth: [-0.9, -0.3], count: 3, seed: 2.9 },
  { name: 'sardine',color: 0xc3d2da, metal: 0.75, rough: 0.18, lens: [0.11, 0.15], thrust: 4.0, spd: [0.8, 1.6], depth: [-1.1, -0.5], count: 8, seed: 7.1 }
];

class Fish {
  constructor(type, i) {
    this.type = type;
    const L = THREE.MathUtils.randFloat(type.lens[0], type.lens[1]);
    this.length = L;
    this.group = new THREE.Group();
    const { bodyGeo, finGeo } = createFishGeometry(type);
    const bodyMat = new THREE.MeshStandardMaterial({
      vertexColors: true, metalness: type.metal, roughness: type.rough
    });
    const finMat = new THREE.MeshStandardMaterial({
      color: type.color, metalness: type.metal, roughness: type.rough + 0.12,
      side: THREE.DoubleSide, transparent: true, opacity: 0.82
    });
    this.body = new THREE.Mesh(bodyGeo, bodyMat);
    this.fins = new THREE.Mesh(finGeo, finMat);
    this.group.add(this.body, this.fins);
    const eL = new THREE.Mesh(eyeGeo, eyeMat);
    const eR = new THREE.Mesh(eyeGeo, eyeMat);
    eL.position.set(0.66, 0.06, 0.115); eL.scale.setScalar(0.05);
    eR.position.set(0.66, 0.06, -0.115); eR.scale.setScalar(0.05);
    this.group.add(eL, eR);
    this.group.scale.setScalar(L);
    this.origBody = this.body.geometry.attributes.position.array.slice();
    this.origFins = this.fins.geometry.attributes.position.array.slice();
    this.pos = new THREE.Vector3(
      THREE.MathUtils.randFloatSpread(POOL_W - 1.5),
      THREE.MathUtils.randFloat(type.depth[0], type.depth[1]),
      THREE.MathUtils.randFloatSpread(POOL_D - 1.0)
    );
    const dir = new THREE.Vector3(Math.random() - 0.5, -0.05, Math.random() - 0.5).normalize();
    this.yaw = Math.atan2(dir.z, dir.x);
    this.pitch = 0;
    this.yawVel = 0;
    this.bank = 0;
    this.prefDepth = THREE.MathUtils.randFloat(type.depth[0], type.depth[1]);
    this.spd = THREE.MathUtils.randFloat(type.spd[0], type.spd[1]);
    this.phase = Math.random() * Math.PI * 2;
    this.dir = dir;
    this.retarget(0);
    underwaterG.add(this.group);
    fishList.push(this);
    this.idx = i;
  }
  retarget(t) {
    const m = 0.8;
    if (this.type.name === 'sardine' && schoolTarget) {
      this.target = schoolTarget.clone().add(new THREE.Vector3(
        THREE.MathUtils.randFloatSpread(1.6),
        THREE.MathUtils.randFloatSpread(0.4),
        THREE.MathUtils.randFloatSpread(1.2)
      ));
      this.timer = t + THREE.MathUtils.randFloat(2.5, 6);
    } else {
      this.target = new THREE.Vector3(
        THREE.MathUtils.randFloat(-POOL_W / 2 + m, POOL_W / 2 - m),
        THREE.MathUtils.randFloat(this.type.depth[0], this.type.depth[1]),
        THREE.MathUtils.randFloat(-POOL_D / 2 + m, POOL_D / 2 - m)
      );
      this.timer = t + THREE.MathUtils.randFloat(3.5, 8);
    }
  }
  update(dt, t) {
    if (t > this.timer) this.retarget(t);
    const desired = this.target.clone().sub(this.pos);
    if (desired.length() < 0.4) this.retarget(t);
    desired.normalize();
    const XLO = -POOL_W / 2 + 0.5, XHI = POOL_W / 2 - 0.5;
    const ZLO = -POOL_D / 2 + 0.5, ZHI = POOL_D / 2 - 0.5;
    const YLO = -DEPTH + 0.3, YHI = -0.14;
    const repulse = new THREE.Vector3();
    if (this.pos.x < XLO) repulse.x += XLO - this.pos.x;
    if (this.pos.x > XHI) repulse.x -= this.pos.x - XHI;
    if (this.pos.z < ZLO) repulse.z += ZLO - this.pos.z;
    if (this.pos.z > ZHI) repulse.z -= this.pos.z - ZHI;
    if (this.pos.y < YLO) repulse.y += (YLO - this.pos.y);
    if (this.pos.y > YHI) repulse.y -= (this.pos.y - YHI);
    desired.addScaledVector(repulse, 6);
    const other = fishList[Math.min((this.idx * 7 + 3) % fishList.length, fishList.length - 1)];
    if (other !== this) {
      const dp = this.pos.distanceTo(other.pos);
      if (dp < 0.35) desired.addScaledVector(this.pos.clone().sub(other.pos).normalize(), (0.35 - dp) * 5);
    }
    desired.normalize();

    const maxTurn = 1.4 + 0.9 * this.type.thrust / (0.4 + this.spd);
    let dYaw = Math.atan2(desired.z, desired.x) - this.yaw;
    dYaw = Math.atan2(Math.sin(dYaw), Math.cos(dYaw));
    const yawTargetVel = THREE.MathUtils.clamp(dYaw * 2.4, -maxTurn, maxTurn);
    this.yawVel += (yawTargetVel - this.yawVel) * Math.min(1, dt * 5.0);
    this.yaw += this.yawVel * dt;

    let dPitch = Math.asin(THREE.MathUtils.clamp(desired.y, -0.6, 0.6)) - this.pitch;
    dPitch += THREE.MathUtils.clamp((this.prefDepth - this.pos.y) * 0.3, -0.5, 0.5);
    const pitchTarget = THREE.MathUtils.clamp(dPitch * 1.8, -0.4, 0.4);
    this.pitch += (pitchTarget - this.pitch) * Math.min(1, dt * 3.0);

    const drag = 1.15 * this.spd + 0.85 * this.spd * this.spd;
    const thrust = this.type.thrust * (0.55 + 0.45 * Math.cos(THREE.MathUtils.clamp(dYaw, -1, 1) * 0.7));
    this.spd += (thrust * 0.62 - drag) * dt;
    this.spd = THREE.MathUtils.clamp(this.spd, 0.05, this.type.spd[1] * 1.8);

    const dir = new THREE.Vector3(
      Math.cos(this.pitch) * Math.cos(this.yaw),
      Math.sin(this.pitch),
      Math.cos(this.pitch) * Math.sin(this.yaw)
    );
    this.pos.addScaledVector(dir, this.spd * dt);
    this.pos.y = THREE.MathUtils.clamp(this.pos.y, -DEPTH + 0.2, -0.12);
    this.pos.x = THREE.MathUtils.clamp(this.pos.x, -POOL_W / 2 + 0.4, POOL_W / 2 - 0.4);
    this.pos.z = THREE.MathUtils.clamp(this.pos.z, -POOL_D / 2 + 0.4, POOL_D / 2 - 0.4);

    const bankTarget = THREE.MathUtils.clamp(-this.yawVel * 0.45, -0.5, 0.5);
    this.bank += (bankTarget - this.bank) * Math.min(1, dt * 3.5);

    const upRef = new THREE.Vector3(0, 1, 0);
    if (Math.abs(dir.dot(upRef)) > 0.99) upRef.set(1, 0, 0);
    const right = new THREE.Vector3().crossVectors(upRef, dir).normalize();
    const up = new THREE.Vector3().crossVectors(dir, right).normalize();
    const wobble = Math.sin(this.phase * 2.0) * 0.05;
    const m = new THREE.Matrix4().makeBasis(dir, up, right);
    this.group.quaternion.setFromRotationMatrix(m);
    this.group.rotateOnAxis(new THREE.Vector3(1, 0, 0), this.bank + wobble);
    this.group.position.copy(this.pos);
    this.dir = dir;

    this.phase += dt * (Math.PI * 2) * (1.6 + this.spd * 5.2);
    const swimA = Math.min(0.08 + this.spd * 0.2, 0.34);
    this.deform(this.body, this.origBody, swimA);
    this.deform(this.fins, this.origFins, swimA);
  }
  deform(mesh, orig, amp) {
    const attr = mesh.geometry.attributes.position;
    const arr = attr.array;
    for (let i = 0; i < arr.length; i += 3) {
      const x = orig[i];
      const s = (1 - (x + 1) / 2);
      const swayAmp = Math.pow(THREE.MathUtils.clamp(0.5 - x * 0.5, 0, 1.1), 1.7);
      arr[i] = x;
      arr[i + 1] = orig[i + 1];
      arr[i + 2] = orig[i + 2] + amp * swayAmp * Math.sin(this.phase - 5.2 * s);
    }
    attr.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
  }
}
{
  let fi = 0;
  for (const type of FISH_TYPES) {
    for (let n = 0; n < type.count; n++) { if (fi >= MAX_FISH) break; new Fish(type, fi++); }
  }
}

const godRays = [];
for (let i = 0; i < 9; i++) {
  const w = THREE.MathUtils.randFloat(0.3, 0.9);
  const g = new THREE.PlaneGeometry(w, DEPTH);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xbfeaff, transparent: true, opacity: 0.05,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
  });
  const m = new THREE.Mesh(g, mat);
  m.position.set(
    THREE.MathUtils.randFloatSpread(POOL_W - 2),
    -DEPTH / 2,
    THREE.MathUtils.randFloatSpread(POOL_D - 1.5)
  );
  m.rotation.y = Math.random() * Math.PI;
  m.rotation.z = 0.16 * Math.sign(SUN_DIR.x) * (0.5 + Math.random());
  underwaterG.add(m);
  godRays.push(m);
}

const particleCount = 500;
const particleGeo = new THREE.BufferGeometry();
{
  const p = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    p[i * 3] = THREE.MathUtils.randFloatSpread(POOL_W - 0.4);
    p[i * 3 + 1] = THREE.MathUtils.randFloat(-DEPTH + 0.1, -0.08);
    p[i * 3 + 2] = THREE.MathUtils.randFloatSpread(POOL_D - 0.4);
  }
  particleGeo.setAttribute('position', new THREE.BufferAttribute(p, 3));
}
const particles = new THREE.Points(particleGeo, new THREE.PointsMaterial({
  color: 0xcfe9f2, size: 0.022, sizeAttenuation: true,
  transparent: true, opacity: 0.38, depthWrite: false
}));
underwaterG.add(particles);

const waterGeo = new THREE.PlaneGeometry(POOL_W - 0.08, POOL_D - 0.08, 220, 130);
waterGeo.rotateX(-Math.PI / 2);
const rippleData = [];
for (let i = 0; i < MAX_RIPPLES; i++) rippleData.push(new THREE.Vector4(0, 0, -9999, 0));
let rippleCursor = 0;

const waterMat = new THREE.ShaderMaterial({
  side: THREE.DoubleSide,
  uniforms: {
    uTime: { value: 0 },
    uSunDir: { value: SUN_DIR },
    uCamPos: { value: new THREE.Vector3() },
    uReflTex: { value: null },
    uRefrTex: { value: null },
    uReflMatrix: { value: new THREE.Matrix4() },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uRipples: { value: rippleData },
    uDeep: { value: DEEP_COLOR }
  },
  vertexShader: `
    uniform float uTime;
    uniform vec4 uRipples[${MAX_RIPPLES}];
    uniform mat4 uReflMatrix;
    varying vec3 vWorldPos;
    varying vec4 vReflCoord;

    float waveHeight(vec2 p, float t) {
      float h = 0.0;
      h += 0.020 * sin(dot(p, vec2(0.62, 0.55)) * 1.05 + t * 1.15);
      h += 0.014 * sin(dot(p, vec2(-0.58, 0.62)) * 1.55 + t * 1.6);
      h += 0.009 * sin(dot(p, vec2(0.30, -0.75)) * 2.35 + t * 2.2);
      h += 0.006 * sin(dot(p, vec2(1.25, 0.85)) * 3.6 + t * 3.0);
      h += 0.004 * sin(dot(p, vec2(-1.7, 1.2)) * 5.4 + t * 4.1);
      for (int i = 0; i < ${MAX_RIPPLES}; i++) {
        vec4 r = uRipples[i];
        float age = t - r.z;
        if (r.w <= 0.0 || age < 0.0 || age > 6.0) continue;
        float d = distance(p, r.xy);
        float x = d - age * 0.9;
        float fade = exp(-x * x * 34.0) * exp(-age * 0.9) / (1.0 + d * 1.4);
        h += r.w * fade * sin(d * 24.0 - age * 18.0);
      }
      return h;
    }

    void main() {
      vec4 wp = modelMatrix * vec4(position, 1.0);
      wp.y += waveHeight(wp.xz, uTime);
      vWorldPos = wp.xyz;
      vReflCoord = uReflMatrix * wp;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }`,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uSunDir;
    uniform vec3 uCamPos;
    uniform sampler2D uReflTex;
    uniform sampler2D uRefrTex;
    uniform vec2 uResolution;
    uniform vec4 uRipples[${MAX_RIPPLES}];
    uniform vec3 uDeep;
    varying vec3 vWorldPos;
    varying vec4 vReflCoord;

    float waveHeight(vec2 p, float t) {
      float h = 0.0;
      h += 0.020 * sin(dot(p, vec2(0.62, 0.55)) * 1.05 + t * 1.15);
      h += 0.014 * sin(dot(p, vec2(-0.58, 0.62)) * 1.55 + t * 1.6);
      h += 0.009 * sin(dot(p, vec2(0.30, -0.75)) * 2.35 + t * 2.2);
      h += 0.006 * sin(dot(p, vec2(1.25, 0.85)) * 3.6 + t * 3.0);
      h += 0.004 * sin(dot(p, vec2(-1.7, 1.2)) * 5.4 + t * 4.1);
      for (int i = 0; i < ${MAX_RIPPLES}; i++) {
        vec4 r = uRipples[i];
        float age = t - r.z;
        if (r.w <= 0.0 || age < 0.0 || age > 6.0) continue;
        float d = distance(p, r.xy);
        float x = d - age * 0.9;
        float fade = exp(-x * x * 34.0) * exp(-age * 0.9) / (1.0 + d * 1.4);
        h += r.w * fade * sin(d * 24.0 - age * 18.0);
      }
      return h;
    }

    vec3 skyApprox(vec3 d, vec3 sunDir) {
      d = normalize(d);
      float h = clamp(d.y, 0.0, 1.0);
      vec3 col = mix(vec3(0.86, 0.90, 0.94), vec3(0.22, 0.46, 0.82), pow(h, 0.5));
      float s = max(dot(d, sunDir), 0.0);
      col += vec3(1.0, 0.9, 0.75) * pow(s, 300.0) * 6.0;
      return col;
    }

    void main() {
      vec2 p = vWorldPos.xz;
      float e = 0.018;
      float hL = waveHeight(p - vec2(e, 0.0), uTime);
      float hR = waveHeight(p + vec2(e, 0.0), uTime);
      float hB = waveHeight(p - vec2(0.0, e), uTime);
      float hF = waveHeight(p + vec2(0.0, e), uTime);
      vec3 N = normalize(vec3(hL - hR, 2.0 * e, hB - hF));

      vec2 g = vec2(0.0);
      g += cos(dot(p, vec2(12.5, 8.7)) + uTime * 3.4) * vec2(12.5, 8.7) * 0.0016;
      g += cos(dot(p, vec2(-9.7, 14.3)) + uTime * 4.6) * vec2(-9.7, 14.3) * 0.0013;
      g += cos(dot(p, vec2(21.0, -16.0)) + uTime * 6.8) * vec2(21.0, -16.0) * 0.0007;
      N = normalize(N + vec3(-g.x, 0.0, -g.y) * 2.0);

      vec3 V = normalize(uCamPos - vWorldPos);
      vec2 uvBase = gl_FragCoord.xy / uResolution;

      if (gl_FrontFacing) {
        vec2 ruv = (vReflCoord.xy / vReflCoord.w) * 0.5 + 0.5;
        ruv += N.xz * 0.35 / max(length(uCamPos - vWorldPos), 1.0);
        vec3 refl = texture2D(uReflTex, clamp(ruv, vec2(0.001), vec2(0.999))).rgb;

        vec2 duv = N.xz * 0.09;
        vec2 uvR = clamp(uvBase + duv, vec2(0.001), vec2(0.999));
        vec2 uvG = clamp(uvBase + duv * 1.3, vec2(0.001), vec2(0.999));
        vec2 uvB = clamp(uvBase + duv * 1.6, vec2(0.001), vec2(0.999));
        vec3 refr = vec3(
          texture2D(uRefrTex, uvR).r,
          texture2D(uRefrTex, uvG).g,
          texture2D(uRefrTex, uvB).b
        );
        refr = mix(refr * vec3(0.72, 0.96, 1.0), uDeep, 0.28);

        float F = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
        vec3 col = mix(refr, refl, clamp(F, 0.0, 1.0));

        vec3 R = reflect(-V, N);
        float sD = max(dot(R, normalize(uSunDir)), 0.0);
        float glint = pow(sD, 420.0) * 4.0 + pow(sD, 48.0) * 0.28;
        col += vec3(1.0, 0.95, 0.85) * glint * smoothstep(0.0, 0.25, N.y);

        float dispo = 0.75 + 0.25 * sin(uTime * 0.7 + p.x * 2.0 + p.y * 3.0);
        col *= dispo;

        gl_FragColor = vec4(col, 1.0);
      } else {
        vec3 Nf = -N;
        float cosI = max(dot(Nf, V), 0.0);
        vec3 dirUp = -V;

        vec2 wuv = clamp(uvBase - N.xz * 0.12, vec2(0.001), vec2(0.999));
        vec3 ceiling = texture2D(uRefrTex, wuv).rgb;
        ceiling = ceiling * vec3(0.85, 1.0, 1.08) + vec3(0.015, 0.04, 0.05);

        float tir = 1.0 - smoothstep(0.60, 0.72, cosI);
        vec3 skyUp = skyApprox(dirUp, normalize(uSunDir));
        vec3 sunR = refract(-normalize(uSunDir), Nf, 0.752);
        float sunSpot = pow(max(dot(dirUp, normalize(-sunR)), 0.0), 60.0) * 2.0;
        skyUp += vec3(1.0, 0.95, 0.8) * sunSpot;

        float Fb = 0.02 + 0.98 * pow(1.0 - cosI, 5.0);
        vec3 col = mix(skyUp, ceiling, clamp(tir * 0.96 + Fb * 0.35, 0.0, 1.0));
        col = mix(col, col * vec3(0.75, 0.98, 1.05) + uDeep * 0.12, 0.35 * (1.0 - tir));

        gl_FragColor = vec4(col, 1.0);
      }
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`
});
const water = new THREE.Mesh(waterGeo, waterMat);
scene.add(water);

const rtParams = {
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
  type: THREE.HalfFloatType,
  depthBuffer: true
};
let reflRT = new THREE.WebGLRenderTarget(1024, 1024, rtParams);
let refrRT = new THREE.WebGLRenderTarget(2, 2, rtParams);
waterMat.uniforms.uReflTex.value = reflRT.texture;
waterMat.uniforms.uRefrTex.value = refrRT.texture;

const virtualCamera = new THREE.PerspectiveCamera();
const planeNormal = new THREE.Vector3(0, 1, 0);
const planePoint = new THREE.Vector3(0, 0, 0);

function updateReflection() {
  const camPos = camera.position;
  const camDir = new THREE.Vector3();
  camera.getWorldDirection(camDir);
  const lookTarget = camPos.clone().addScaledVector(camDir, 10);
  const posR = camPos.clone();
  posR.y = 2 * planePoint.y - posR.y;
  const tgtR = lookTarget.clone();
  tgtR.y = 2 * planePoint.y - tgtR.y;
  const upW = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
  upW.y = -upW.y;
  virtualCamera.position.copy(posR);
  virtualCamera.up.copy(upW);
  virtualCamera.lookAt(tgtR);
  virtualCamera.near = camera.near;
  virtualCamera.far = camera.far;
  virtualCamera.updateMatrixWorld();
  virtualCamera.projectionMatrix.copy(camera.projectionMatrix);

  const clipPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, planePoint);
  clipPlane.applyMatrix4(virtualCamera.matrixWorldInverse);
  const cp = new THREE.Vector4(clipPlane.normal.x, clipPlane.normal.y, clipPlane.normal.z, clipPlane.constant);
  const proj = virtualCamera.projectionMatrix;
  const q = new THREE.Vector4(
    (Math.sign(cp.x) + proj.elements[8]) / proj.elements[0],
    (Math.sign(cp.y) + proj.elements[9]) / proj.elements[5],
    -1.0,
    (1.0 + proj.elements[10]) / proj.elements[14]
  );
  cp.multiplyScalar(2.0 / cp.dot(q));
  proj.elements[2] = cp.x;
  proj.elements[6] = cp.y;
  proj.elements[10] = cp.z + 1.0 - 0.003;
  proj.elements[14] = cp.w;

  waterMat.uniforms.uReflMatrix.value.multiplyMatrices(virtualCamera.projectionMatrix, virtualCamera.matrixWorldInverse);
  return virtualCamera;
}

const underwaterFog = new THREE.FogExp2(0x07566a, 0.16);
const raycaster = new THREE.Raycaster();
const waterPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const ndc = new THREE.Vector2();

function addRipple(clientX, clientY, amp) {
  ndc.set((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hit = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(waterPlane, hit)) {
    if (Math.abs(hit.x) < POOL_W / 2 && Math.abs(hit.z) < POOL_D / 2) {
      const r = rippleData[rippleCursor];
      r.set(hit.x, hit.z, clockTime, amp);
      rippleCursor = (rippleCursor + 1) % MAX_RIPPLES;
    }
  }
}
renderer.domElement.addEventListener('pointerdown', (e) => addRipple(e.clientX, e.clientY, 0.055));

let autoRippleT = 2.5;
function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  const dpr = renderer.getPixelRatio();
  refrRT.setSize(w * dpr, h * dpr);
  reflRT.setSize(Math.min(1024, w * dpr), Math.min(1024, h * dpr));
  waterMat.uniforms.uResolution.value.set(w * dpr, h * dpr);
}
window.addEventListener('resize', onResize);
onResize();

const clock = new THREE.Clock();
let clockTime = 0;
let camUnder = false;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  clockTime += dt;
  const t = clockTime;

  causticUniforms.uTime.value = t;
  waterMat.uniforms.uTime.value = t;
  waterMat.uniforms.uCamPos.value.copy(camera.position);

  autoRippleT -= dt;
  if (autoRippleT <= 0) {
    autoRippleT = THREE.MathUtils.randFloat(2.5, 7);
    const r = rippleData[rippleCursor];
    r.set(THREE.MathUtils.randFloatSpread(POOL_W - 2), THREE.MathUtils.randFloatSpread(POOL_D - 1.4), t, 0.02);
    rippleCursor = (rippleCursor + 1) % MAX_RIPPLES;
  }

  animateSchool(t);
  for (const f of fishList) f.update(dt, t);

  const arr = particleGeo.attributes.position.array;
  for (let i = 0; i < particleCount; i++) {
    arr[i * 3 + 1] += dt * 0.045;
    arr[i * 3] += Math.sin(t * 0.7 + i) * dt * 0.01;
    if (arr[i * 3 + 1] > -0.06) arr[i * 3 + 1] = -DEPTH + 0.1;
  }
  particleGeo.attributes.position.needsUpdate = true;
  for (let i = 0; i < godRays.length; i++) {
    const m = godRays[i];
    m.material.opacity = 0.035 + 0.03 * (0.5 + 0.5 * Math.sin(t * 0.5 + i * 1.7));
    m.rotation.y += Math.sin(t * 0.25 + i) * dt * 0.05;
  }

  controls.update();

  camUnder = camera.position.y < 0;

  const toneMapping = renderer.toneMapping;
  const prevFog = scene.fog;

  water.visible = false;
  waterBodyG.visible = false;
  glassG.visible = false;

  const vCam = updateReflection();
  underwaterG.visible = false;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setRenderTarget(reflRT);
  renderer.clear();
  renderer.render(scene, vCam);

  underwaterG.visible = true;
  aboveG.visible = false;
  sky.visible = false;
  scene.fog = underwaterFog;
  renderer.setClearColor(DEEP_COLOR);
  renderer.setRenderTarget(refrRT);
  renderer.clear();
  renderer.render(scene, camera);
  scene.fog = prevFog;

  aboveG.visible = true;
  sky.visible = true;
  glassG.visible = true;
  waterBodyG.visible = !camUnder;
  water.visible = true;
  renderer.toneMapping = toneMapping;
  if (camUnder) scene.fog = underwaterFog;
  renderer.setRenderTarget(null);
  renderer.render(scene, camera);
  scene.fog = null;
}
animate();
