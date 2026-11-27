/**
 * Logo „</G>” w 3D jako tło strony (Dla firm, Nauka) — Three.js.
 *
 * Na górze strony logo stoi w miejscu „kotwicy” w nagłówku (element [data-logo-anchor]).
 * Przy przewijaniu w dół (powiązane z przewijaniem, w obie strony):
 *   1) logo się ROZWARSTWIA — każdy znak to 3 warstwy, które rozjeżdżają się w głąb, a logo obraca się bokiem,
 *   2) przesuwa się na środek ekranu i zostaje z tyłu jako tło,
 *   3) dalej się ROZMYWA i przygasa — do ok. 55% długości strony, potem zostaje rozmyte.
 * Przy przewijaniu w górę wszystko się zwija z powrotem.
 * Na wejściu logo 3D „łapie ostrość” (z rozmycia do ostrego) — zastępuje płaskie logo, które jest widoczne od razu.
 * Mobile first: mniejsza rozdzielczość na telefonie, rysuje tylko gdy coś się zmienia, pauza w tle.
 * Kształty przeliczone z favicon.svg (te same ścieżki, siatka 64×64).
 */
import {
  AmbientLight,
  Box3,
  Color,
  DirectionalLight,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  NeutralToneMapping,
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

const PIECES: { pts: P[]; w: number; color: number; spread: [number, number] }[] = [
  // spread: kierunek rozjeżdżania się znaku (x, y) przy rozwarstwieniu
  { pts: [[13.5, 22], [5.5, 32], [13.5, 42]], w: 4.2, color: GREEN, spread: [-1.1, 0.25] },
  { pts: [[17.5, 45], [24, 19]], w: 4, color: GREEN, spread: [-0.35, 0.9] },
  { pts: [...arc(43.4, 24.6, 8, 12, true, false, 44.2, 38.6), [44.2, 33.2], [38.6, 33.2]], w: 4.4, color: WHITE, spread: [0.3, -0.6] },
  { pts: [[50.5, 22], [58.5, 32], [50.5, 42]], w: 4.2, color: GREEN, spread: [1.2, 0.15] },
];
const LAYERS = 3; // warstwy każdego znaku (przód → tył)

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / Math.max(1e-6, b - a));
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export function mountBgLogo(layer: HTMLElement, anchor: HTMLElement | null, onReady?: () => void) {
  const mobile = window.matchMedia('(max-width: 47.99rem)').matches;
  const DPR = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: mobile ? 'low-power' : 'high-performance' });
  renderer.setPixelRatio(DPR);
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 0.95;
  const canvas = renderer.domElement;
  canvas.className = 'bg-logo__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  layer.appendChild(canvas);

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

  const camera = new PerspectiveCamera(30, 1, 0.1, 200);
  camera.position.set(0, 0, 30);
  const root = new Group(); // pozycja i skala całego logo
  const spin = new Group(); // obrót (kołysanie, mysz, rozwarstwienie)
  root.add(spin);
  scene.add(root);

  // materiały: przednia warstwa jasna, tylne coraz ciemniejsze — po rozwarstwieniu widać „plastry”
  const mat = (c: number, k: number) => {
    const col = new Color(c).multiplyScalar(1 - k * 0.22);
    return new MeshPhysicalMaterial({
      color: col,
      metalness: 0.1,
      roughness: c === GREEN ? 0.32 : 0.36,
      clearcoat: 0.6,
      clearcoatRoughness: 0.25,
      emissive: new Color(c === GREEN ? 0x0f8a45 : 0x1a1a1a).multiplyScalar(1 - k * 0.3),
      emissiveIntensity: c === GREEN ? 0.45 : 0.2,
    });
  };

  const S = 0.1; // 64 jednostki SVG → 6,4 jednostki sceny
  const D = 1.6; // grubość jednej warstwy (jednostki SVG)
  type Part = { mesh: Mesh; base: Vector3; piece: number; k: number };
  const parts: Part[] = [];
  PIECES.forEach((p, pi) => {
    const shape = strokeShape(p.pts, p.w);
    for (let k = 0; k < LAYERS; k++) {
      const geo = new ExtrudeGeometry(shape, {
        depth: D, bevelEnabled: true, bevelThickness: 0.35, bevelSize: 0.35, bevelSegments: 2, curveSegments: 6,
      });
      geo.translate(0, 0, -k * (D + 0.7) - D / 2);
      geo.scale(S, S, S);
      geo.computeBoundingBox();
      const c = new Vector3();
      geo.boundingBox!.getCenter(c);
      geo.translate(-c.x, -c.y, -c.z);
      const mesh = new Mesh(geo, mat(p.color, k));
      mesh.position.copy(c);
      spin.add(mesh);
      parts.push({ mesh, base: c.clone(), piece: pi, k });
    }
  });
  const size = new Box3().setFromObject(spin).getSize(new Vector3());

  // ===== geometria ekranu =====
  let vw = 1, vh = 1, worldH = 1, worldW = 1;
  let startX = 0, startY = 0, startScale = 1; // logo w miejscu kotwicy (na górze strony)
  let bgScale = 1; // logo jako tło (po przewinięciu)
  const measure = () => {
    vw = layer.clientWidth || window.innerWidth;
    vh = layer.clientHeight || window.innerHeight;
    renderer.setSize(vw, vh, false);
    camera.aspect = vw / vh;
    camera.updateProjectionMatrix();
    worldH = 2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360);
    worldW = worldH * camera.aspect;
    const pxToWorld = worldW / vw;
    if (anchor) {
      const r = anchor.getBoundingClientRect();
      const top = r.top + window.scrollY; // pozycja w dokumencie (logo jest „przyklejone” do ekranu, więc liczymy dla scroll=0)
      startX = (r.left + r.width / 2 - vw / 2) * pxToWorld;
      startY = -(top + r.height / 2 - vh / 2) * pxToWorld;
      startScale = Math.min((r.width * 0.86 * pxToWorld) / size.x, (r.height * 0.86 * pxToWorld) / size.y);
    } else {
      startX = 0; startY = 0; startScale = (vw * 0.6 * pxToWorld) / size.x;
    }
    bgScale = Math.min((vw * (mobile ? 0.62 : 0.34) * pxToWorld) / size.x, (vh * 0.5 * pxToWorld) / size.y);
    dirty = true;
  };

  // ===== stan (cele z przewijania + wygładzanie) =====
  const cur = { e: 0, b: 0, px: 0, py: 0 };
  const tgt = { e: 0, b: 0, px: 0, py: 0 };
  let dirty = true;
  const readScroll = () => {
    const y = window.scrollY;
    const max = Math.max(1, document.documentElement.scrollHeight - vh);
    tgt.e = smooth(vh * 0.04, vh * 0.85, y); // rozwarstwienie: pierwsze ~0,85 ekranu
    const blurEnd = Math.max(vh * 1.1, max * 0.55); // rozmycie do ~55% strony, potem stoi
    tgt.b = smooth(vh * 0.45, blurEnd, y);
  };
  window.addEventListener('scroll', readScroll, { passive: true });

  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const onMove = (e: PointerEvent) => {
    tgt.px = (e.clientX / window.innerWidth) * 2 - 1;
    tgt.py = (e.clientY / window.innerHeight) * 2 - 1;
  };
  if (finePointer) window.addEventListener('pointermove', onMove, { passive: true });

  const ro = new ResizeObserver(() => { measure(); readScroll(); });
  ro.observe(layer);
  measure();
  readScroll();
  // fonty / obrazki mogą jeszcze przesunąć nagłówek — mierzymy ponownie, gdy się wczytają
  document.fonts?.ready.then(measure);
  if (document.readyState !== 'complete') window.addEventListener('load', measure, { once: true });
  Object.assign(cur, { e: tgt.e, b: tgt.b });

  // wejście: z rozmycia do ostrości (krótko — płaskie logo jest już na ekranie)
  const FOCUS = 0.7;
  let t0 = -1, frames = 0, last = 0;
  let lastBlur = -1, lastOpacity = -1, lowRes = false;

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    frames++;
    if (t0 < 0 && frames >= 3) t0 = now;
    const t = t0 < 0 ? 0 : (now - t0) / 1000;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;

    // wygładzanie (niezależne od liczby klatek)
    const a = 1 - Math.pow(1 - 0.14, dt * 60);
    let moving = false;
    for (const key of ['e', 'b', 'px', 'py'] as const) {
      const d = tgt[key] - cur[key];
      if (Math.abs(d) > 0.0005) { cur[key] += d * a; moving = true; } else cur[key] = tgt[key];
    }
    const introOn = t < FOCUS + 0.1;
    const wobble = cur.b < 0.98; // kołysanie wyłączamy, gdy logo jest już rozmyte (oszczędność baterii)
    if (!moving && !introOn && !wobble && !dirty) return;
    dirty = false;

    const e = cur.e, b = cur.b;
    // pozycja i skala: z kotwicy → na środek ekranu (tło)
    const m = smooth(0, 1, e * 0.85 + b * 0.6);
    root.position.set(mix(startX, 0, m), mix(startY, 0, m), 0);
    root.scale.setScalar(mix(startScale, bgScale, m));

    spin.rotation.y = (wobble ? Math.sin(t * 0.45) * 0.18 * (1 - e) : 0) + cur.px * 0.3 + e * 0.62 - b * 0.25;
    spin.rotation.x = (wobble ? Math.sin(t * 0.33) * 0.05 : 0) + cur.py * 0.15 - e * 0.28 + b * 0.1;
    spin.rotation.z = e * -0.08;

    for (const p of parts) {
      const [sx, sy] = PIECES[p.piece].spread;
      const layerOff = (1 - p.k) * 1.5 * e; // przód do przodu, tył do tyłu
      const sp = mobile ? 0.55 : 0.8; // jak daleko rozjeżdżają się znaki
      const fl = wobble ? Math.sin(t * 1.2 + p.piece * 1.7) * 0.04 : 0;
      p.mesh.position.set(
        p.base.x + sx * sp * e + (1 - p.k) * 0.35 * e,
        p.base.y + sy * sp * e + fl + (1 - p.k) * 0.2 * e,
        p.base.z + layerOff,
      );
      p.mesh.rotation.set(0, (p.piece - 1.5) * 0.12 * e, 0);
    }

    // rozmycie i przygaszenie (CSS — tanie dla GPU); przy mocnym rozmyciu rysujemy w mniejszej rozdzielczości
    // w trakcie rozwarstwiania lekko przygasa (tekst zostaje czytelny), potem rozmywa się do końca
    const blur = Math.round((e * (mobile ? 1.5 : 3) + b * (mobile ? 8 : 12)) * 10) / 10;
    const opacity = Math.round(Math.max(0.34, 1 - e * 0.5 - b * 0.2) * 100) / 100;
    // „łapanie ostrości” na wejściu: dodatkowe rozmycie i przezroczystość znikają w FOCUS s
    const f = clamp01(t / FOCUS), fe = 1 - Math.pow(1 - f, 3);
    const blurAll = Math.round((blur + (1 - fe) * 4) * 10) / 10;
    const opAll = Math.round(opacity * fe * 100) / 100;
    if (blurAll !== lastBlur) { canvas.style.filter = blurAll > 0 ? `blur(${blurAll}px)` : ''; lastBlur = blurAll; }
    if (opAll !== lastOpacity) { canvas.style.opacity = String(opAll); lastOpacity = opAll; }
    const wantLow = b > 0.45;
    if (wantLow !== lowRes) {
      lowRes = wantLow;
      renderer.setPixelRatio(lowRes ? Math.min(DPR, 0.75) : DPR);
      renderer.setSize(vw, vh, false);
    }
    renderer.render(scene, camera);
    if (fe > 0.55 && onReady) { onReady(); onReady = undefined; } // 3D już dobrze widoczne → dopiero teraz chowamy płaskie logo
  };

  let raf = 0;
  const start = () => { if (!raf && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };
  const onVis = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVis);
  renderer.compile(scene, camera);
  start();
  layer.classList.add('is-ready');

  return () => {
    stop(); ro.disconnect();
    window.removeEventListener('scroll', readScroll);
    window.removeEventListener('pointermove', onMove);
    document.removeEventListener('visibilitychange', onVis);
    renderer.dispose();
    canvas.remove();
  };
}
