/**
 * Logo „</G>” w 3D (Three.js) — nagłówek strony Dla firm.
 *
 * - Wejście: kawałki logo spadają z góry i składają się w całość (animacja z góry ustalona, odpala się sama).
 * - Po przewinięciu w dół: logo „rozpada się” na kawałki (też gotowa animacja, nie zależy od tempa przewijania);
 *   po powrocie na górę składa się z powrotem.
 * - Na spokojnie: lekko się kołysze i obraca za myszką / palcem.
 * Rysuje tylko wtedy, gdy jest na ekranie i karta jest aktywna.
 * Kształty są przeliczone z favicon.svg (te same ścieżki, siatka 64×64).
 */
import {
  NeutralToneMapping,
  AmbientLight,
  Box3,
  Color,
  DirectionalLight,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  PerspectiveCamera,
  PMREMGenerator,
  PointLight,
  Scene,
  Shape,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

type P = [number, number];

/** Punkty łuku SVG (A rx ry 0 largeArc sweep x y) — konwersja wg specyfikacji SVG (F.6.5). */
function arc(x1: number, y1: number, rx: number, ry: number, large: boolean, sweep: boolean, x2: number, y2: number, n = 48): P[] {
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
  const s = Math.max(1, Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry)));
  rx *= s; ry *= s;
  const num = rx * rx * ry * ry - rx * rx * dy * dy - ry * ry * dx * dx;
  const den = rx * rx * dy * dy + ry * ry * dx * dx;
  let k = Math.sqrt(Math.max(0, num / den));
  if (large === sweep) k = -k;
  const cx = (k * rx * dy) / ry + (x1 + x2) / 2;
  const cy = (-k * ry * dx) / rx + (y1 + y2) / 2;
  const a1 = Math.atan2((y1 - cy) / ry, (x1 - cx) / rx);
  let da = Math.atan2((y2 - cy) / ry, (x2 - cx) / rx) - a1;
  if (sweep && da < 0) da += Math.PI * 2;
  if (!sweep && da > 0) da -= Math.PI * 2;
  const pts: P[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a1 + (da * i) / n;
    pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return pts;
}

/** Gruba linia (stroke z kwadratowymi końcami i ostrymi narożnikami) → zamknięty kształt. */
function strokeShape(svgPts: P[], width: number): Shape {
  // SVG ma oś Y w dół — odwracamy i centrujemy na środku siatki 64×64
  const pts = svgPts.map(([x, y]) => new Vector2(x - 32, 32 - y));
  const hw = width / 2;
  const n = pts.length;
  const dir = (i: number) => pts[i + 1].clone().sub(pts[i]).normalize();
  pts[0].sub(dir(0).multiplyScalar(hw));
  pts[n - 1].add(dir(n - 2).multiplyScalar(hw));
  const left: Vector2[] = [], right: Vector2[] = [];
  for (let i = 0; i < n; i++) {
    const nPrev = i > 0 ? dir(i - 1) : dir(0);
    const nNext = i < n - 1 ? dir(i) : dir(n - 2);
    const a = new Vector2(-nPrev.y, nPrev.x), b = new Vector2(-nNext.y, nNext.x);
    const m = a.clone().add(b).normalize();
    const len = Math.min(hw / Math.max(0.2, m.dot(a)), hw * 2.2);
    left.push(pts[i].clone().add(m.clone().multiplyScalar(len)));
    right.push(pts[i].clone().sub(m.clone().multiplyScalar(len)));
  }
  return new Shape([...left, ...right.reverse()]);
}

const GREEN = 0x22e07a;
const WHITE = 0xf5f5f2;

const PIECES: { pts: P[]; w: number; color: number; burst: [number, number, number, number, number] }[] = [
  // burst: przesunięcie x, y, z i obrót y, z przy „rozpadzie”
  { pts: [[13.5, 22], [5.5, 32], [13.5, 42]], w: 4.2, color: GREEN, burst: [-2.6, 0.6, 1.2, -0.9, 0.3] },
  { pts: [[17.5, 45], [24, 19]], w: 4, color: GREEN, burst: [-0.8, 2.2, 2.2, 0.4, 0.8] },
  { pts: [...arc(43.4, 24.6, 8, 12, true, false, 44.2, 38.6), [44.2, 33.2], [38.6, 33.2]], w: 4.4, color: WHITE, burst: [0.6, -1.4, 2.8, 0.9, -0.25] },
  { pts: [[50.5, 22], [58.5, 32], [50.5, 42]], w: 4.2, color: GREEN, burst: [2.8, 0.4, 1, 0.9, -0.3] },
];

const easeOutBack = (t: number) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

export function mountLogo3D(host: HTMLElement, opts: { trigger?: HTMLElement } = {}) {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.domElement.className = 'logo3d__canvas';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;
  pmrem.dispose();

  scene.add(new AmbientLight(0xffffff, 0.25));
  const key = new DirectionalLight(0xffffff, 1.8);
  key.position.set(4, 6, 9);
  scene.add(key);
  const rim = new DirectionalLight(GREEN, 2.2);
  rim.position.set(-6, 3, -6);
  scene.add(rim);
  const glow = new PointLight(GREEN, 40, 30, 2);
  glow.position.set(-4, -3, 5);
  scene.add(glow);

  const camera = new PerspectiveCamera(32, 1, 0.1, 100);
  const root = new Group();
  scene.add(root);

  const mats = new Map<number, MeshPhysicalMaterial>();
  const mat = (c: number) => {
    if (!mats.has(c)) {
      mats.set(c, new MeshPhysicalMaterial({
        color: new Color(c),
        metalness: 0.1,
        roughness: c === GREEN ? 0.32 : 0.36,
        clearcoat: 0.6,
        clearcoatRoughness: 0.25,
        emissive: new Color(c === GREEN ? 0x0f8a45 : 0x1a1a1a),
        emissiveIntensity: c === GREEN ? 0.45 : 0.2,
      }));
    }
    return mats.get(c)!;
  };

  const S = 0.1; // 64 jednostek SVG → 6,4 jednostki sceny
  const pieces = PIECES.map((p, i) => {
    const geo = new ExtrudeGeometry(strokeShape(p.pts, p.w), {
      depth: 4.5, bevelEnabled: true, bevelThickness: 0.7, bevelSize: 0.5, bevelSegments: 4, curveSegments: 8,
    });
    geo.scale(S, S, S);
    geo.computeBoundingBox();
    const c = new Vector3();
    geo.boundingBox!.getCenter(c);
    geo.translate(-c.x, -c.y, -c.z);
    const mesh = new Mesh(geo, mat(p.color));
    mesh.position.copy(c);
    root.add(mesh);
    return { mesh, base: c.clone(), burst: p.burst, delay: i * 0.13, seed: i * 1.7 };
  });
  const box = new Box3().setFromObject(root);
  const size = box.getSize(new Vector3());

  // ===== rozmiar =====
  const fit = () => {
    const w = host.clientWidth || 1, h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const vFov = (camera.fov * Math.PI) / 180;
    const fitH = (size.y * 1.55) / (2 * Math.tan(vFov / 2));
    const fitW = (size.x * 1.25) / (2 * Math.tan(vFov / 2) * camera.aspect);
    camera.position.set(0, 0, Math.max(fitH, fitW));
    camera.updateProjectionMatrix();
  };
  fit();
  const ro = new ResizeObserver(fit);
  ro.observe(host);

  // ===== wejście / rozpad / mysz =====
  let t0 = -1, frames = 0; // start wejścia = 3. klatka (pierwsze bywają wolne — kompilacja shaderów)
  const INTRO = 1.6;
  let burst = 0, burstFrom = 0, burstTo = 0, burstStart = 0;
  const BURST_T = 1.1;
  const setBurst = (on: boolean) => {
    const to = on ? 1 : 0;
    if (to === burstTo) return;
    burstFrom = burst; burstTo = to; burstStart = performance.now();
  };
  const trig = opts.trigger ?? host;
  const onScroll = () => {
    const r = trig.getBoundingClientRect();
    setBurst(-r.top > r.height * 0.22);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const onMove = (e: PointerEvent) => {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
  };
  window.addEventListener('pointermove', onMove, { passive: true });

  // ===== pętla =====
  let raf = 0, visible = true;
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    frames++;
    if (t0 < 0 && frames >= 3) t0 = now;
    const t = t0 < 0 ? 0 : (now - t0) / 1000;
    const bp = clamp01((now - burstStart) / 1000 / BURST_T);
    burst = burstFrom + (burstTo - burstFrom) * easeInOut(bp);

    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;
    root.rotation.y = Math.sin(t * 0.45) * 0.22 + pointer.x * 0.35 + burst * 0.25;
    root.rotation.x = Math.sin(t * 0.33) * 0.06 + pointer.y * 0.18 - burst * 0.12;

    for (const p of pieces) {
      const k = clamp01((t - p.delay) / INTRO);
      const e = easeOutBack(k);
      const drop = 1 - e; // 1 = jeszcze wysoko, 0 = na miejscu
      const [bx, by, bz, ry, rz] = p.burst;
      const fl = Math.sin(t * 1.3 + p.seed) * 0.05;
      p.mesh.position.set(
        p.base.x + bx * burst,
        p.base.y + drop * 5 + by * burst + fl,
        p.base.z + bz * burst - drop * 2,
      );
      p.mesh.rotation.set(drop * 1.4 + Math.sin(t * 0.8 + p.seed) * 0.04 * burst, drop * -0.9 + ry * burst, drop * 0.6 + rz * burst);
      p.mesh.visible = k > 0;
    }
    renderer.render(scene, camera);
  };
  const start = () => { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame); };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); });
  io.observe(host);
  const onVis = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVis);
  renderer.compile(scene, camera);
  start();
  host.classList.add('is-3d');

  return () => {
    stop(); io.disconnect(); ro.disconnect();
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('pointermove', onMove);
    document.removeEventListener('visibilitychange', onVis);
    renderer.dispose();
  };
}
