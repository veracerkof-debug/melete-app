// Устройство гитары в 3D (слово автора 25.11.2026). Модели — готовые, открытые (Sketchfab, CC BY 4.0), приведены скриптами tools/prep-*.mjs
// к своим осям и разбиты на именованные детали: акустика «DD Acoustic Guitar» (piscopancer), электро «Electric Guitar Explorer» (Skabl; текстуры — автора приложения).
// Оси: y — вдоль грифа к голове, x — к тонким струнам, z — вверх по деке; длина 1000 мм, начало — в центре. three.js (MIT) и модели грузятся лениво, только в этом уроке.
// Тянуть — вращать, щипок — приблизить, касание детали — название и пояснение, «Разобрать» — детали разъезжаются. Тексты — gp.<id>.n / gp.<id>.d.
import glbAcoustic from './assets/guitar-acoustic.glb?url';
import glbElectric from './assets/guitar-electric.glb?url';
import texAlbedo from './assets/electric-albedo.jpg?url';
import texAO from './assets/electric-ao.jpg?url';
export const TYPES = ['acoustic', 'electric'];
export const PARTS = {
  acoustic: ['head', 'pegs', 'neck', 'fret', 'strings', 'hole', 'top', 'body', 'bridge', 'pickguard'],
  electric: ['head', 'pegs', 'neck', 'fret', 'strings', 'body', 'pickguard', 'pickups', 'controls', 'bridge'],
};
// Особые тексты: у типа — свой ключ вместо общего
const ALT = { acoustic: { body: 'sides', bridge: 'bridge.a', strings: 'strings.s' }, electric: { body: 'body.e', bridge: 'bridge.e', strings: 'strings.s' } };
export const partKey = (type, id) => 'gp.' + ((ALT[type] && ALT[type][id]) || id);
// Виды: [наклон, поворот] в радианах
export const VIEWS = [[0.2, -0.5], [0, 0], [0, Math.PI / 2], [0.2, Math.PI + 0.5], [1.2, 0]];
export const FILES = { acoustic: glbAcoustic, electric: glbElectric };
// Разнос деталей при «Разобрать», мм (x — вбок, y — по грифу к голове, z — к зрителю)
export const OFFS = {
  acoustic: { top: [0, 0, 80], body: [0, 0, -70], hole: [0, 0, 130], pickguard: [0, 0, 160], bridge: [0, 0, 190], strings: [0, 0, 240], neck: [0, 70, 20], fret: [0, 70, 100], head: [0, 170, -40], pegs: [0, 170, 70] },
  electric: { body: [0, 0, -40], pickguard: [0, 0, 60], pickups: [0, 0, 110], controls: [0, 0, 130], bridge: [0, 0, 150], strings: [0, 0, 210], neck: [0, 70, 0], fret: [0, 70, 80], head: [0, 170, -50], pegs: [0, 170, 70] },
};
export const hasWebGL = () => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } };

// Текстуры дерева: цвет, волокна и (для декы электро/акустики) переход «санбёрст» запекаются в холст.
// box — рамка [x0, x1, y0, y1] в мм: холст растягивается на деталь; без рамки — повторяется плиткой.
const rgbc = (a, al = 1) => 'rgba(' + a.map((v) => Math.round(v * 255)).join(',') + ',' + al + ')';
function woodTex(THREE, o) {
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  let r = (o.seed || 3) * 9301 + 49297; const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
  g.fillStyle = rgbc(o.base); g.fillRect(0, 0, 512, 512);
  const dark = o.dark || o.base.map((v) => v * 0.5), amp = o.amp == null ? 0.4 : o.amp;
  for (let i = 0; i < 170; i++) {
    const x = rnd() * 512, w = 0.5 + rnd() * 2.6, light = rnd() < 0.3, sw = (rnd() - 0.5) * 14;
    g.strokeStyle = light ? 'rgba(255,248,230,' + (amp * 0.25 * rnd()).toFixed(3) + ')' : rgbc(dark, amp * (0.15 + rnd() * 0.5)); g.lineWidth = w;
    g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + sw, 170, x - sw, 340, x + sw * 0.5, 512); g.stroke();
  }
  if (o.blobs) for (let i = 0; i < 90; i++) { g.fillStyle = rgbc(o.blobs, 0.2 + rnd() * 0.5); g.beginPath(); g.ellipse(rnd() * 512, rnd() * 512, 6 + rnd() * 26, 3 + rnd() * 14, rnd() * 3, 0, 7); g.fill(); }
  if (o.sun) {
    const gr = g.createRadialGradient(256, 256, 20, 256, 256, 330);
    gr.addColorStop(0, rgbc(o.sun[0], 0)); gr.addColorStop(0.5, rgbc(o.sun[1], 0.55)); gr.addColorStop(0.82, rgbc(o.sun[2], 0.9)); gr.addColorStop(1, rgbc(o.sun[2], 1));
    g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (o.box) { const [x0, x1, y0, y1] = o.box, w = x1 - x0, h = y1 - y0; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.repeat.set(1 / w, 1 / h); t.offset.set(-x0 / w, -y0 / h); }
  else { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / (o.tile ? o.tile[0] : 90), 1 / (o.tile ? o.tile[1] : 420)); }
  return t;
}

// Свои цвета дерева и железа: реальные породы, не зависят от темы (на тёмном и светлом фоне читаются одинаково)
const WOOD = {
  spruce: { base: [0.91, 0.78, 0.55], dark: [0.55, 0.38, 0.2] }, sunTop: [[0.93, 0.8, 0.55], [0.9, 0.68, 0.4], [0.5, 0.28, 0.12]],
  mahogany: { base: [0.43, 0.21, 0.12], dark: [0.14, 0.06, 0.03], amp: 0.6 }, rosewood: { base: [0.35, 0.17, 0.1], dark: [0.1, 0.04, 0.03], amp: 0.6 },
  cedar: { base: [0.66, 0.4, 0.24], dark: [0.35, 0.18, 0.1] }, maple: { base: [0.88, 0.74, 0.5], dark: [0.6, 0.4, 0.18], amp: 0.3 },
  ebony: { base: [0.13, 0.09, 0.07], dark: [0.02, 0.01, 0.01], amp: 0.5 }, tort: { base: [0.28, 0.1, 0.04], dark: [0.05, 0.02, 0.01], blobs: [0.85, 0.45, 0.1] },
  burst: [[0.96, 0.68, 0.22], [0.82, 0.3, 0.08], [0.2, 0.04, 0.03]],
};
const CREAM = [0.95, 0.92, 0.82], BLACK = [0.07, 0.07, 0.08], CHROME = [0.82, 0.83, 0.85];


const cache = {};
async function loadGLB(type) {
  if (!cache[type]) cache[type] = (async () => { const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js'); return (await new GLTFLoader().loadAsync(FILES[type])).scene; })();
  return cache[type];
}
// Детали из GLB в свои материалы. Акустика: цвет по материалу исходной модели (суффикс .N в имени); электро: текстуры автора + карта затенения.
export async function buildGuitar(THREE, type) {
  const scene = await loadGLB(type), g = new THREE.Group(), set = [], reps = {}, materials = [], textures = [], OFF = OFFS[type];
  const col = (c) => new THREE.Color().setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace);
  const std = (c, o = {}) => { const m = new THREE.MeshPhysicalMaterial({ color: col(c), roughness: 0.45, metalness: 0, ...o }); materials.push(m); return m; };
  const wood = (w, gloss, tex) => { const t = woodTex(THREE, { ...w, ...tex, seed: textures.length + 3 }); textures.push(t); return std([1, 1, 1], { map: t, roughness: 0.35, clearcoat: gloss ? 0.85 : 0.1, clearcoatRoughness: 0.18 }); };
  let byPart;
  if (type === 'acoustic') {
    const chrome = { metalness: 0.95, roughness: 0.22 };
    const M = { 0: wood({ ...WOOD.spruce, amp: 0.3 }, true, { box: [-190, 190, -500, -10], sun: WOOD.sunTop }), 1: wood(WOOD.mahogany, true, { tile: [90, 420] }), 2: std([0.05, 0.05, 0.055], { roughness: 0.3, clearcoat: 0.6 }),
      3: std(CREAM, { roughness: 0.4 }), 4: std(CHROME, chrome), 5: std([0.93, 0.91, 0.84], { roughness: 0.3 }), 6: std([0.72, 0.5, 0.28], { metalness: 0.8, roughness: 0.3 }), 7: std([0.03, 0.03, 0.035], { roughness: 0.2, clearcoat: 0.9 }) };
    byPart = (name) => M[+name.split('_')[1]] || M[1];
  } else {
    const load = (u) => new Promise((res) => new THREE.TextureLoader().load(u, res)), [alb, ao] = await Promise.all([load(texAlbedo), load(texAO)]);
    alb.colorSpace = THREE.SRGBColorSpace; alb.anisotropy = 4; textures.push(alb, ao);
    const metalP = new Set(['bridge', 'strings', 'fret', 'pegs']);
    byPart = (name) => { const p = name.split('_')[0]; return std([1, 1, 1], { map: alb, aoMap: ao, aoMapIntensity: 0.9, roughness: p === 'body' ? 0.3 : 0.5, metalness: metalP.has(p) ? 0.85 : 0.05, clearcoat: p === 'body' ? 0.8 : 0 }); };
  }
  scene.traverse((o) => {
    if (!o.isMesh) return;
    const [part] = o.name.split('_'), geo = o.geometry.clone(), mt = type === 'acoustic' ? byPart(o.name).clone() : byPart(o.name); if (type === 'acoustic') materials.push(mt);
    if (type === 'acoustic') { const p = geo.attributes.position, uv = new Float32Array(p.count * 2); for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i); uv[i * 2 + 1] = p.getY(i); } geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); }
    const m = new THREE.Mesh(geo, mt); m.userData.part = part; m.userData.off = OFF[part] || [0, 0, 0]; m.userData.base = new THREE.Vector3(); geo.computeBoundingBox();
    const sz = geo.boundingBox.getSize(new THREE.Vector3()), vol = sz.x * sz.y * sz.z;
    m.userData.vol = vol; g.add(m); set.push(m); if (!reps[part] || vol > reps[part].userData.vol) reps[part] = m;
  });
  return { group: g, meshes: set, reps, materials, textures, len: 1050 };
}

// Цвет из токена темы → числа 0..1 (sRGB)
function tokenRGB(el, name) {
  const old = el.style.color; el.style.color = 'var(' + name + ')';
  const cs = getComputedStyle(el).color, m = (cs.match(/[\d.]+/g) || []).map(Number); el.style.color = old;
  const srgb = /color\(/.test(cs);
  return m.length >= 3 ? [srgb ? m[0] : m[0] / 255, srgb ? m[1] : m[1] / 255, srgb ? m[2] : m[2] / 255] : [0.5, 0.5, 0.5];
}

export function modelLabs({ T }) {
  const LABS = {};
  const lab = (type, id) => T(partKey(type, id) + '.n'), desc = (type, id) => T(partKey(type, id) + '.d');
  LABS.gmodel = {
    st: { rx: VIEWS[0][0], ry: VIEWS[0][1], ex: false, sel: '', view: 0, zoom: 1, type: 'acoustic' },
    render(s) {
      return '<div class="gm-wrap"><div class="gm-types" role="group" aria-label="' + T('gm.types') + '">' + TYPES.map((k) => '<button type="button" class="gm-type" data-gm-type="' + k + '" aria-pressed="' + (s.type === k) + '">' + T('gm.t.' + k) + '</button>').join('') + '</div>' +
        '<div class="gm3" data-gm3 role="img" aria-label="' + T('gm.aria') + '"></div>' +
        '<div class="gm-bar"><button type="button" class="bkgch" data-gm="ex" aria-pressed="false">' + T('gm.explode') + '</button><button type="button" class="bkgch" data-gm="view">' + T('gm.view') + '</button></div>' +
        '<div class="gm-chips" role="group" aria-label="' + T('gm.parts') + '"></div>' +
        '<div class="bkginfo" data-gm-info><b>' + T('gm.pick') + '</b><span>' + T('gm.hint') + '</span></div></div>';
    },
    on() { return false; },
    mounted(s, el) {
      const root = el.querySelector('[data-gm3]'); if (!root) return;
      const info = el.querySelector('[data-gm-info]'), exBtn = el.querySelector('[data-gm="ex"]'), chips = el.querySelector('.gm-chips');
      let api = null, dead = false;
      const list = () => PARTS[s.type];
      const showInfo = () => { info.innerHTML = s.sel ? '<b>' + (list().indexOf(s.sel) + 1) + '. ' + lab(s.type, s.sel) + '</b><span>' + desc(s.type, s.sel) + '</span>' : '<b>' + T('gm.pick') + '</b><span>' + T('gm.hint') + '</span>'; };
      const drawChips = () => { chips.innerHTML = list().map((id, i) => '<button type="button" class="gm-chip" data-gm-sel="' + id + '" aria-pressed="false"><b>' + (i + 1) + '</b>' + lab(s.type, id) + '</button>').join(''); };
      const sync = () => {
        root.classList.toggle('ex', !!s.ex); root.classList.toggle('sel', !!s.sel);
        exBtn.setAttribute('aria-pressed', String(!!s.ex)); exBtn.textContent = T(s.ex ? 'gm.assemble' : 'gm.explode');
        el.querySelectorAll('[data-gm-type]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.gmType === s.type)));
        el.querySelectorAll('[data-gm-sel]').forEach((b) => { const on = b.dataset.gmSel === s.sel; b.setAttribute('aria-pressed', String(on)); b.classList.toggle('on', on); });
        showInfo(); if (api) api.kick();
      };
      const toggleEx = () => { s.ex = !s.ex; s.goal = s.ex ? [0.3, -0.95] : [VIEWS[s.view][0], VIEWS[s.view][1]]; };
      const select = (id) => { s.sel = s.sel === id ? '' : id; sync(); };
      drawChips();
      el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-gm]'), c = e.target.closest('[data-gm-sel]'), ty = e.target.closest('[data-gm-type]');
        if (ty) { if (ty.dataset.gmType !== s.type) { s.type = ty.dataset.gmType; s.sel = ''; drawChips(); if (api) api.rebuild(); sync(); } return; }
        if (c) { select(c.dataset.gmSel); return; }
        if (!b) return;
        if (b.dataset.gm === 'ex') toggleEx(); else { s.view = (s.view + 1) % VIEWS.length; s.goal = [VIEWS[s.view][0], VIEWS[s.view][1]]; }
        sync();
      });
      sync();
      if (!hasWebGL()) { root.classList.add('nogl'); root.textContent = T('gm.nogl'); return; }
      Promise.all([import('three'), import('three/addons/environments/RoomEnvironment.js').catch(() => null)]).then(([THREE, env]) => {
        if (dead || !root.isConnected) return;
        const rgb = (n) => tokenRGB(root, n), K = 0.01;
        const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return new THREE.Color().setRGB(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t, THREE.SRGBColorSpace); };
        const scene = new THREE.Scene(), pivot = new THREE.Group(); scene.add(pivot);
        scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8478, 0.9));
        const key = new THREE.DirectionalLight(0xffffff, 1.9); key.position.set(-4, 6, 9); scene.add(key);
        const rimL = new THREE.DirectionalLight(0xffffff, 0.7); rimL.position.set(6, -3, -6); scene.add(rimL);
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
        renderer.toneMapping = THREE.NeutralToneMapping; renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.domElement.className = 'gm-cv';
        let envTex = null;
        try { if (env) { const pm = new THREE.PMREMGenerator(renderer); envTex = pm.fromScene(new env.RoomEnvironment(), 0.04).texture; scene.environment = envTex; scene.environmentIntensity = 0.8; pm.dispose(); } } catch { /* без отражений */ }
        root.textContent = ''; root.appendChild(renderer.domElement);
        const dots = document.createElement('div'); dots.className = 'gm-dots'; root.appendChild(dots);
        const cam = new THREE.PerspectiveCamera(28, 1, 0.5, 80), ray = new THREE.Raycaster(), P = new THREE.Vector2(), tmp = new THREE.Vector3();
        let gt = null, t = s.ex ? 1 : 0, raf = 0, zoom = s.zoom, dragging = false, centers = {};
        const freeGt = () => { if (!gt) return; pivot.remove(gt.group); gt.meshes.forEach((m) => m.geometry.dispose()); gt.materials.forEach((m) => m.dispose()); gt.textures.forEach((x) => x.dispose()); gt = null; };
        let buildTok = 0;
        const rebuild = async () => {
          const tok = ++buildTok; let nx;
          try { nx = await buildGuitar(THREE, s.type); } catch (e) { console.error('gm3', e && e.message); if (tok === buildTok && !dead) { root.classList.add('nogl'); root.textContent = T('gm.nogl'); } return; }
          if (tok !== buildTok || dead) { nx.meshes.forEach((m) => m.geometry.dispose()); return; }
          freeGt(); gt = nx;
          gt.group.scale.setScalar(K); pivot.add(gt.group);
          dots.innerHTML = PARTS[s.type].map((id, i) => '<button type="button" class="gm-dot" data-gm-sel="' + id + '" aria-label="' + lab(s.type, id) + '">' + (i + 1) + '</button>').join('');
          centers = {}; for (const id of PARTS[s.type]) { const m = gt.reps[id]; if (m) { const b = m.geometry.boundingBox; centers[id] = [m, b.getCenter(new THREE.Vector3())]; } }
          kick();
        };
        const size = () => { const w = root.clientWidth || 300, h = root.clientHeight || 400; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
        const frame = () => {
          raf = 0;
          if (dead || !root.isConnected) { dispose(); return; }
          const tg = s.ex ? 1 : 0; t += (tg - t) * 0.14; if (Math.abs(tg - t) < 0.002) t = tg;
          for (const m of gt.meshes) { const o = m.userData.off, b = m.userData.base; m.position.set(b.x + o[0] * t, b.y + o[1] * t, b.z + o[2] * t); }
          let busy = false; if (s.goal) { s.rx += (s.goal[0] - s.rx) * 0.12; s.ry += (s.goal[1] - s.ry) * 0.12; if (Math.abs(s.goal[0] - s.rx) + Math.abs(s.goal[1] - s.ry) < 0.004) { s.rx = s.goal[0]; s.ry = s.goal[1]; s.goal = null; } else busy = true; }
          pivot.rotation.set(s.rx, s.ry, 0);
          const asp = cam.aspect, dist = ((gt.len * K / 2) / Math.tan(14 * Math.PI / 180) * 1.08) * (1 + 0.3 * t) / Math.min(1, asp * 1.6) / zoom;
          cam.position.set(0, 0, dist); cam.lookAt(0, 0, 0);
          gt.meshes.forEach((m) => { const on = m.userData.part === s.sel, mm = m.material; if (mm.emissive) { mm.emissive.copy(C0); mm.emissiveIntensity = on ? 0.5 : 0; } });
          renderer.render(scene, cam);
          // номера на деталях (при разборе и у выбранной)
          const W = renderer.domElement.clientWidth, H = renderer.domElement.clientHeight;
          const ds = [...dots.querySelectorAll('.gm-dot')], pos = ds.map((d) => { const c = centers[d.dataset.gmSel]; if (!c) return [0, 0]; tmp.copy(c[1]); c[0].localToWorld(tmp); tmp.project(cam); return [(tmp.x * 0.5 + 0.5) * W, (-tmp.y * 0.5 + 0.5) * H]; });
          for (let it = 0; it < 14; it++) for (let i = 0; i < pos.length; i++) for (let j = i + 1; j < pos.length; j++) { const dx = pos[j][0] - pos[i][0], dy = pos[j][1] - pos[i][1], dd = Math.hypot(dx, dy) || 0.01; if (dd < 25) { const k = (25 - dd) / 2 / dd; pos[i][0] -= dx * k; pos[i][1] -= dy * k; pos[j][0] += dx * k; pos[j][1] += dy * k; } }
          ds.forEach((d, i) => { d.style.transform = 'translate(' + (Math.max(11, Math.min(W - 11, pos[i][0])) - 11) + 'px,' + (Math.max(11, Math.min(H - 11, pos[i][1])) - 11) + 'px)'; d.classList.toggle('on', d.dataset.gmSel === s.sel); });
          if (t !== tg || dragging || busy) raf = requestAnimationFrame(frame);
        };
        const C0 = rgb ? mix('--tint', '--tint', 0) : null;
        const kick = () => { if (!raf && !dead && gt) raf = requestAnimationFrame(frame); };
        const dispose = () => { dead = true; if (raf) cancelAnimationFrame(raf); raf = 0; ro && ro.disconnect(); freeGt(); if (envTex) envTex.dispose(); renderer.dispose(); };
        api = { kick, rebuild }; const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { size(); kick(); }) : null; if (ro) ro.observe(root);
        size(); rebuild();
        // жесты: тянуть — вращать (на касании только вбок: вертикаль — прокрутка страницы), щипок/Ctrl+колесо — приблизить, касание — деталь, два касания — разобрать
        const pts = new Map(); let d0 = 0, z0 = 1, st = null, last = 0;
        const cv = renderer.domElement;
        cv.addEventListener('pointerdown', (e) => { pts.set(e.pointerId, [e.clientX, e.clientY]); if (pts.size === 2) { const [a, b] = [...pts.values()]; d0 = Math.hypot(a[0] - b[0], a[1] - b[1]); z0 = zoom; st = null; } else st = { x: e.clientX, y: e.clientY, ry: s.ry, rx: s.rx, moved: false, t: e.pointerType }; });
        cv.addEventListener('pointermove', (e) => {
          if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, [e.clientX, e.clientY]);
          if (pts.size === 2) { const [a, b] = [...pts.values()]; zoom = s.zoom = Math.max(0.6, Math.min(2.2, z0 * Math.hypot(a[0] - b[0], a[1] - b[1]) / (d0 || 1))); kick(); return; }
          if (!st) return; const dx = e.clientX - st.x, dy = e.clientY - st.y;
          if (!st.moved && Math.abs(dx) < 6 && (st.t === 'touch' || Math.abs(dy) < 6)) return;
          if (!st.moved) { st.moved = true; dragging = true; s.goal = null; try { cv.setPointerCapture(e.pointerId); } catch { /* */ } }
          s.ry = st.ry + dx * 0.008; if (st.t !== 'touch') s.rx = Math.max(-1.4, Math.min(1.4, st.rx + dy * 0.008)); kick();
        });
        const up = (e) => {
          pts.delete(e.pointerId); if (pts.size) return; dragging = false;
          const was = st; st = null; if (!was || was.moved || e.type === 'pointercancel') return;
          const r = cv.getBoundingClientRect(); P.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(P, cam);
          const hit = ray.intersectObjects(gt.meshes, false)[0], now = Date.now();
          if (now - last < 320) { last = 0; toggleEx(); sync(); return; }
          last = now; const id = hit ? hit.object.userData.part : ''; if (id !== s.sel) select(id); else if (!id) { s.sel = ''; sync(); }
        };
        cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
        cv.addEventListener('wheel', (e) => { if (!e.ctrlKey) return; e.preventDefault(); zoom = s.zoom = Math.max(0.6, Math.min(2.2, zoom * (e.deltaY < 0 ? 1.1 : 0.9))); kick(); }, { passive: false });
        root.__gm = { s, dispose, get gt() { return gt; } };
      }).catch((err) => { console.error('gm3', err && err.message); root.classList.add('nogl'); root.textContent = T('gm.nogl'); });
    },
  };
  return LABS;
}
