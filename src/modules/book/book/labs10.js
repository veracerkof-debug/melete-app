// Устройство гитары в 3D (слово автора 25.11.2026: «найди реальные чертежи, сделай по ним»). Размеры — классической гитары по открытым
// чертежам (Торрес/Хаузер): мензура 650 мм, длина корпуса 480, верхняя дека 280, талия 240, нижняя 365, глубина ~95, порожек 52 → 62 у 12-го лада.
// Модель своя (формы строятся из этих размеров), цвета — из токенов темы. three.js (MIT) грузится лениво, только в этом уроке.
// Тянуть — вращать, щипок/колесо — приблизить, касание детали — название и пояснение, «Разобрать» — детали разъезжаются.
const PARTS = ['head', 'pegs', 'nut', 'neck', 'fret', 'strings', 'hole', 'body', 'bridge'];
// Виды: [наклон, поворот] в радианах
export const VIEWS = [[0.22, -0.55], [0, 0], [0, Math.PI / 2], [0.2, Math.PI + 0.5], [1.2, 0]];
// Контур корпуса: правая половина (x — половина ширины, y — вниз от верхнего края), мм
export const HALF = [[0, 0], [40, 2], [75, 12], [110, 35], [132, 75], [140, 120], [133, 165], [118, 205], [112, 240], [122, 275], [150, 315], [175, 355], [183, 400], [165, 445], [110, 473], [0, 480]];
export const SCALE = 650, NECK_Y = 325; // мензура; верх корпуса — у 12-го лада
export const fretPos = (n) => SCALE * (1 - Math.pow(2, -n / 12)); // расстояние лада от порожка
export function outlinePts(THREE, seg = 140) {
  const R = HALF.map(([x, y]) => new THREE.Vector2(x, -NECK_Y - y));
  const L = HALF.slice(1, -1).reverse().map(([x, y]) => new THREE.Vector2(-x, -NECK_Y - y));
  return new THREE.SplineCurve([...R, ...L]).getPoints(seg);
}
export const hasWebGL = () => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } };

export function buildGuitar(THREE, C) {
  const g = new THREE.Group(), set = [];
  const mat = (col, o = {}) => new THREE.MeshStandardMaterial({ color: col, roughness: 0.55, metalness: 0.05, ...o });
  const at = (m, x, y, z) => { m.position.set(x, y, z); return m; };
  const add = (id, mesh, off = [0, 0, 0]) => { mesh.userData.part = id; mesh.userData.off = off; mesh.userData.base = mesh.position.clone(); g.add(mesh); set.push(mesh); return mesh; };
  const ext = (shape, depth, bevel = 0.8) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 24 });
  const trap = (w0, y0, w1, y1, r = 0) => { const s = new THREE.Shape(); s.moveTo(-w0 / 2, y0); s.lineTo(w0 / 2, y0); s.lineTo(w1 / 2, y1); s.lineTo(-w1 / 2, y1); s.closePath(); return s; };
  const wood = mat(C.top), side = mat(C.side), dark = mat(C.dark, { roughness: 0.4 }), metal = mat(C.metal, { metalness: 0.7, roughness: 0.3 }), pale = mat(C.pale, { roughness: 0.35 });
  // — корпус: верхняя дека с розеткой, обечайка, задняя дека
  const O = outlinePts(THREE), dep = 95, th = 3.2;
  const outer = new THREE.Shape(O);
  const topS = new THREE.Shape(O); const hole = new THREE.Path(); hole.absarc(0, -NECK_Y - 165, 43, 0, Math.PI * 2, true); topS.holes.push(hole);
  add('body', at(new THREE.Mesh(ext(topS, th, 0.3), wood), 0, 0, -th), [0, 0, 50]);
  const cen = O.reduce((a, p) => a.add(p), new THREE.Vector2()).multiplyScalar(1 / O.length);
  const inner = O.map((p) => p.clone().sub(cen).multiplyScalar(0.975).add(cen));
  const ring = new THREE.Shape(O); ring.holes.push(new THREE.Path(inner.slice().reverse()));
  add('body', at(new THREE.Mesh(ext(ring, dep - 2 * th, 0), side), 0, 0, -dep + th), [0, 0, -40]);
  add('body', at(new THREE.Mesh(ext(outer, th, 0.3), side), 0, 0, -dep), [0, 0, -130]);
  // — розетка и отверстие
  [[43, 47, dark], [47, 52, pale], [52, 55, dark]].forEach(([a, b, m], i) => add('hole', at(new THREE.Mesh(new THREE.RingGeometry(a, b, 64), m), 0, -NECK_Y - 165, 0.25 + i * 0.02), [0, 0, 110]));
  add('hole', at(new THREE.Mesh(new THREE.CircleGeometry(60, 48), mat(C.ink, { roughness: 1 })), 0, -NECK_Y - 165, -dep + th + 0.5), [0, 0, 0]);
  // — гриф: деревянная основа и накладка
  const NL = 440;
  add('neck', at(new THREE.Mesh(ext(trap(50, 0, 58, -NL), 22, 1.2), side), 0, 0, -14), [0, 40, 0]);
  const fb = at(new THREE.Mesh(ext(trap(52, 0, 52 + 10 * (NL - 5) / NECK_Y, -(NL - 5), 0), 5, 0.3), dark), 0, -2, 8);
  add('neck', fb, [0, 40, 50]);
  // — лады
  for (let n = 1; n <= 19; n++) { const y = -fretPos(n), w = 52 + 10 * -y / NECK_Y; add('fret', at(new THREE.Mesh(new THREE.BoxGeometry(w + 1, 1.5, 2), metal), 0, y, 13.4), [0, 40, 100]); }
  // — порожек
  add('nut', at(new THREE.Mesh(new THREE.BoxGeometry(54, 4, 7), pale), 0, 0, 12.5), [0, 50, 90]);
  // — голова с колками (наклонена назад)
  const hs = new THREE.Shape(); hs.moveTo(-38, 0); hs.lineTo(38, 0); hs.lineTo(46, 150); hs.quadraticCurveTo(48, 188, 20, 190); hs.lineTo(-20, 190); hs.quadraticCurveTo(-48, 188, -46, 150); hs.closePath();
  [-1, 1].forEach((sd) => { const h = new THREE.Path(); h.moveTo(sd * 17, 30); h.lineTo(sd * 31, 30); h.lineTo(sd * 31, 165); h.lineTo(sd * 17, 165); h.closePath(); hs.holes.push(h); });
  const headG = new THREE.Group(); headG.rotation.x = -0.26;
  const hm = at(new THREE.Mesh(ext(hs, 14, 0.8), side), 0, 0, -11); hm.userData = { part: 'head', off: [0, 150, -70], base: new THREE.Vector3() };
  const pegG = new THREE.Group(); pegG.rotation.x = -0.26;
  [-1, 1].forEach((sd) => [55, 100, 145].forEach((y) => {
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 52, 12), metal); sh.rotation.z = Math.PI / 2; sh.position.set(sd * 38, y, -4);
    const ro = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.6, 12, 16), metal); ro.rotation.z = Math.PI / 2; ro.position.set(sd * 24, y, -4);
    const bt = new THREE.Mesh(new THREE.BoxGeometry(7, 22, 13), pale); bt.position.set(sd * 66, y, -4);
    [sh, ro, bt].forEach((m) => { m.userData = { part: 'pegs', off: [0, 150, 70], base: m.position.clone() }; pegG.add(m); set.push(m); });
  }));
  headG.add(hm); set.push(hm); g.add(headG, pegG);
  // — струны: от порожка к подставке
  const sp = [1.5, 1.3, 1.1, 0.8, 0.7, 0.6];
  for (let i = 0; i < 6; i++) {
    const a = new THREE.Vector3(-21 + i * 8.4, 0, 15.8), b = new THREE.Vector3(-29 + i * 11.6, -SCALE, 14.2), d = b.clone().sub(a);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(sp[i], sp[i], d.length(), 8), mat(i < 3 ? C.pale : C.tint, { roughness: 0.3, metalness: i < 3 ? 0 : 0.5 }));
    m.position.copy(a.clone().add(b).multiplyScalar(0.5)); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    add('strings', m, [0, 0, 190]);
  }
  // — подставка (бридж) и косточка
  const bs = new THREE.Shape(); bs.moveTo(-95, -SCALE - 22); bs.lineTo(95, -SCALE - 22); bs.quadraticCurveTo(100, -SCALE - 2, 82, -SCALE + 8); bs.lineTo(-82, -SCALE + 8); bs.quadraticCurveTo(-100, -SCALE - 2, -95, -SCALE - 22);
  add('bridge', at(new THREE.Mesh(ext(bs, 7, 0.8), dark), 0, 0, 0), [0, 0, 150]);
  add('bridge', at(new THREE.Mesh(new THREE.BoxGeometry(80, 3, 5.5), pale), 0, -SCALE, 11), [0, 0, 160]);
  set.forEach((m) => { m.userData.base = m.position.clone(); });
  return { group: g, meshes: set, materials: [wood, side, dark, metal, pale] };
}

// Цвет из токена темы → числа 0..1 (sRGB)
function tokenRGB(el, name) {
  const old = el.style.color; el.style.color = 'var(' + name + ')';
  const m = (getComputedStyle(el).color.match(/[\d.]+/g) || []).map(Number); el.style.color = old;
  const srgb = /color\(/.test(getComputedStyle(el).color);
  return m.length >= 3 ? [srgb ? m[0] : m[0] / 255, srgb ? m[1] : m[1] / 255, srgb ? m[2] : m[2] / 255] : [0.5, 0.5, 0.5];
}

export function modelLabs({ T }) {
  const LABS = {};
  LABS.gmodel = {
    st: { rx: VIEWS[0][0], ry: VIEWS[0][1], ex: false, sel: '', view: 0, zoom: 1 },
    render() {
      return '<div class="gm-wrap"><div class="gm3" data-gm3 role="img" aria-label="' + T('gm.aria') + '"></div>' +
        '<div class="gm-bar"><button type="button" class="bkgch" data-gm="ex" aria-pressed="false">' + T('gm.explode') + '</button><button type="button" class="bkgch" data-gm="view">' + T('gm.view') + '</button></div>' +
        '<div class="gm-chips" role="group" aria-label="' + T('gm.parts') + '">' + PARTS.map((id, i) => '<button type="button" class="gm-chip" data-gm-sel="' + id + '" aria-pressed="false"><b>' + (i + 1) + '</b>' + T('gp.' + id + '.n') + '</button>').join('') + '</div>' +
        '<div class="bkginfo" data-gm-info><b>' + T('gm.pick') + '</b><span>' + T('gm.hint') + '</span></div></div>';
    },
    on() { return false; },
    mounted(s, el) {
      const root = el.querySelector('[data-gm3]'); if (!root) return;
      const info = el.querySelector('[data-gm-info]'), exBtn = el.querySelector('[data-gm="ex"]');
      let api = null, dead = false;
      const showInfo = () => { info.innerHTML = s.sel ? '<b>' + (PARTS.indexOf(s.sel) + 1) + '. ' + T('gp.' + s.sel + '.n') + '</b><span>' + T('gp.' + s.sel + '.d') + '</span>' : '<b>' + T('gm.pick') + '</b><span>' + T('gm.hint') + '</span>'; };
      const sync = () => {
        root.classList.toggle('ex', !!s.ex); root.classList.toggle('sel', !!s.sel);
        exBtn.setAttribute('aria-pressed', String(!!s.ex)); exBtn.textContent = T(s.ex ? 'gm.assemble' : 'gm.explode');
        el.querySelectorAll('[data-gm-sel]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.gmSel === s.sel)));
        showInfo(); if (api) api.kick();
      };
      const select = (id) => { s.sel = s.sel === id ? '' : id; sync(); };
      el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-gm]'), c = e.target.closest('[data-gm-sel]');
        if (c) { select(c.dataset.gmSel); return; }
        if (!b) return;
        if (b.dataset.gm === 'ex') s.ex = !s.ex; else { s.view = (s.view + 1) % VIEWS.length; s.rx = VIEWS[s.view][0]; s.ry = VIEWS[s.view][1]; }
        sync();
      });
      sync();
      if (!hasWebGL()) { root.classList.add('nogl'); root.textContent = T('gm.nogl'); return; }
      import('three').then((THREE) => {
        if (dead || !root.isConnected) return;
        const rgb = (n) => tokenRGB(root, n), col = (n, k = 1) => { const [r, g, b] = rgb(n); return new THREE.Color().setRGB(r * k, g * k, b * k, THREE.SRGBColorSpace); };
        const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return new THREE.Color().setRGB(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t, THREE.SRGBColorSpace); };
        const C = { top: mix('--cell', '--tint', 0.42), side: mix('--cell', '--tint', 0.7), dark: mix('--ink', '--cell', 0.15), metal: mix('--l3', '--cell', 0.15), pale: mix('--cell', '--l2', 0.2), ink: col('--ink'), tint: mix('--tint', '--ink', 0.1) };
        const gt = buildGuitar(THREE, C), pivot = new THREE.Group(), scene = new THREE.Scene(), K = 0.01;
        gt.group.scale.setScalar(K); gt.group.position.y = 3.07; pivot.add(gt.group); scene.add(pivot);
        scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8478, 1.15));
        const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-4, 6, 9); scene.add(key);
        const rim = new THREE.DirectionalLight(0xffffff, 0.8); rim.position.set(6, -3, -6); scene.add(rim);
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.domElement.className = 'gm-cv'; root.textContent = ''; root.appendChild(renderer.domElement);
        const cam = new THREE.PerspectiveCamera(28, 1, 0.5, 80), ray = new THREE.Raycaster(), P = new THREE.Vector2();
        let t = s.ex ? 1 : 0, raf = 0, zoom = s.zoom, dragging = false;
        const size = () => { const w = root.clientWidth || 300, h = root.clientHeight || 400; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
        const frame = () => {
          raf = 0;
          if (dead || !root.isConnected) { dispose(); return; }
          const tg = s.ex ? 1 : 0; t += (tg - t) * 0.14; if (Math.abs(tg - t) < 0.002) t = tg;
          for (const m of gt.meshes) { const o = m.userData.off, b = m.userData.base; m.position.set(b.x + o[0] * t, b.y + o[1] * t, b.z + o[2] * t); }
          pivot.rotation.set(s.rx, s.ry, 0);
          const asp = cam.aspect, dist = (22 + 7 * t) / Math.min(1, asp * 1.6) / zoom;
          cam.position.set(0, 0, dist); cam.lookAt(0, 0, 0);
          gt.meshes.forEach((m) => { const on = m.userData.part === s.sel, mm = m.material; if (mm.emissive) { mm.emissive.copy(C.tint); mm.emissiveIntensity = on ? 0.55 : 0; } });
          renderer.render(scene, cam);
          if (t !== tg || dragging) raf = requestAnimationFrame(frame);
        };
        const kick = () => { if (!raf && !dead) raf = requestAnimationFrame(frame); };
        const dispose = () => { dead = true; if (raf) cancelAnimationFrame(raf); raf = 0; ro && ro.disconnect(); gt.meshes.forEach((m) => { m.geometry.dispose(); }); gt.materials.forEach((m) => m.dispose()); renderer.dispose(); };
        api = { kick }; const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { size(); kick(); }) : null; if (ro) ro.observe(root);
        size(); kick();
        // жесты: тянуть — вращать (на касании только вбок: вертикальный жест — прокрутка страницы), щипок/колесо — приблизить, касание — деталь, два касания — разобрать
        const pts = new Map(); let d0 = 0, z0 = 1, st = null, last = 0;
        const cv = renderer.domElement;
        cv.addEventListener('pointerdown', (e) => { pts.set(e.pointerId, [e.clientX, e.clientY]); if (pts.size === 2) { const [a, b] = [...pts.values()]; d0 = Math.hypot(a[0] - b[0], a[1] - b[1]); z0 = zoom; st = null; } else st = { x: e.clientX, y: e.clientY, ry: s.ry, rx: s.rx, moved: false, t: e.pointerType }; });
        cv.addEventListener('pointermove', (e) => {
          if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, [e.clientX, e.clientY]);
          if (pts.size === 2) { const [a, b] = [...pts.values()]; zoom = s.zoom = Math.max(0.6, Math.min(2.2, z0 * Math.hypot(a[0] - b[0], a[1] - b[1]) / (d0 || 1))); kick(); return; }
          if (!st) return; const dx = e.clientX - st.x, dy = e.clientY - st.y;
          if (!st.moved && Math.abs(dx) < 6 && (st.t === 'touch' || Math.abs(dy) < 6)) return;
          if (!st.moved) { st.moved = true; dragging = true; try { cv.setPointerCapture(e.pointerId); } catch { /* */ } }
          s.ry = st.ry + dx * 0.008; if (st.t !== 'touch') s.rx = Math.max(-1.4, Math.min(1.4, st.rx + dy * 0.008)); kick();
        });
        const up = (e) => {
          pts.delete(e.pointerId); if (pts.size) return; dragging = false;
          const was = st; st = null; if (!was || was.moved || e.type === 'pointercancel') return;
          const r = cv.getBoundingClientRect(); P.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(P, cam);
          const hit = ray.intersectObjects(gt.meshes, false)[0], now = Date.now();
          if (now - last < 320) { last = 0; s.ex = !s.ex; sync(); return; }
          last = now; const id = hit ? hit.object.userData.part : ''; if (id !== s.sel) select(id); else if (!id) { s.sel = ''; sync(); }
        };
        cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
        cv.addEventListener('wheel', (e) => { if (!e.ctrlKey) return; e.preventDefault(); zoom = s.zoom = Math.max(0.6, Math.min(2.2, zoom * (e.deltaY < 0 ? 1.1 : 0.9))); kick(); }, { passive: false });
        root.__gm = { s, gt, dispose };
      }).catch((err) => { console.error('gm3', err && err.message); root.classList.add('nogl'); root.textContent = T('gm.nogl'); });
    },
  };
  return LABS;
}
