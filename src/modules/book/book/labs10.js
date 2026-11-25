// Устройство гитары в 3D (слово автора 25.11.2026): классика, акустика, электро. Размеры — по опубликованным спецификациям и открытым
// чертежам (мензура, ширина порожка, длина и ширины корпуса, глубина, число ладов); формы своё, чужие рисунки и знаки фирм не берутся.
// Классика: мензура 650, корпус 480. Акустика (дредноут): мензура 645, корпус 508, дека 292/250/400. Электро: мензура 648, корпус ≈ 400×320, толщина 45.
// Цвета — из токенов темы. three.js (MIT) грузится лениво, только в этом уроке. Тексты частей — gp.<id>.n / gp.<id>.d (+ запасные для типа).
export const TYPES = ['classic', 'acoustic', 'electric'];
export const PARTS = {
  classic: ['head', 'pegs', 'nut', 'neck', 'fret', 'strings', 'hole', 'body', 'bridge'],
  acoustic: ['head', 'pegs', 'nut', 'neck', 'rod', 'fret', 'strings', 'hole', 'top', 'braces', 'body', 'bridge', 'pickguard'],
  electric: ['head', 'pegs', 'nut', 'neck', 'rod', 'fret', 'strings', 'body', 'pickguard', 'pickups', 'controls', 'bridge'],
};
// Особые тексты: у типа — свой ключ вместо общего
const ALT = { acoustic: { body: 'sides', bridge: 'bridge.a', strings: 'strings.s' }, electric: { body: 'body.e', bridge: 'bridge.e', strings: 'strings.s' } };
export const partKey = (type, id) => 'gp.' + ((ALT[type] && ALT[type][id]) || id);
// Виды: [наклон, поворот] в радианах
export const VIEWS = [[0.22, -0.55], [0, 0], [0, Math.PI / 2], [0.2, Math.PI + 0.5], [1.2, 0]];
export const SPEC = {
  classic: { S: 650, J: 325, nutW: 52, endW: 62, endAt: 325, frets: 19, zfj: 6, zs: 12.5, nutP: 8.4, brP: 11.6, brk: -0.26, mid: -307, len: 1000 },
  acoustic: { S: 645, J: 358, nutW: 43, endW: 56, endAt: 358, frets: 20, zfj: 6.5, zs: 12, nutP: 7.2, brP: 10.8, brk: -0.24, mid: -340, len: 1060 },
  electric: { S: 648, J: 391, nutW: 42, endW: 56, endAt: 466, frets: 22, zfj: 5, zs: 14, nutP: 7, brP: 10.5, brk: -0.1, mid: -283, len: 990 },
};
// Контуры корпуса: [x — половина ширины, yd — вниз от верха], мм
export const CLASSIC_R = [[0, 0], [40, 2], [75, 12], [110, 35], [132, 75], [140, 120], [133, 165], [118, 205], [112, 240], [122, 275], [150, 315], [175, 355], [183, 400], [165, 445], [110, 473], [0, 480]];
export const DREAD_R = [[0, 0], [45, 3], [90, 15], [125, 40], [144, 85], [146, 130], [135, 170], [124, 205], [122, 235], [132, 270], [160, 315], [190, 360], [200, 410], [185, 465], [120, 500], [0, 508]];
export const ELEC_R = [[0, 30], [35, 28], [70, 10], [100, 0], [122, 20], [125, 60], [115, 100], [125, 130], [150, 160], [160, 205], [155, 260], [135, 320], [90, 365], [0, 380]];
export const ELEC_L = [[-35, 28], [-70, 5], [-105, -25], [-128, -15], [-135, 20], [-128, 65], [-118, 100], [-128, 130], [-152, 165], [-160, 210], [-155, 262], [-135, 322], [-90, 367]];
export const fretPos = (n, S = 650) => S * (1 - Math.pow(2, -n / 12)); // расстояние лада от порожка
export const widthAt = (sp, d) => sp.nutW + (sp.endW - sp.nutW) * d / sp.endAt;
export function outlinePts(THREE, top, R, Lmid, seg = 150) {
  const mir = Lmid || R.slice(1, -1).map(([x, y]) => [-x, y]);
  const pts = [...R, ...mir.slice().reverse()].map(([x, yd]) => new THREE.Vector2(x, -(top + yd)));
  return new THREE.SplineCurve(pts).getPoints(seg);
}
export const hasWebGL = () => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } };

// Зерно дерева: полосы вдоль грифа, умножается на цвет материала
function grainTex(THREE, seed = 1) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d');
  let r = seed * 9301 + 49297; const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
  g.fillStyle = 'rgb(236,236,236)'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 90; i++) { const x = rnd() * 256, w = 0.6 + rnd() * 2.4, a = 0.05 + rnd() * 0.16, v = rnd() < 0.5 ? 0 : 255; g.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + a + ')'; g.fillRect(x, 0, w, 256); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

export function buildGuitar(THREE, C, type) {
  const sp = SPEC[type], S = sp.S, J = sp.J, g = new THREE.Group(), set = [], reps = {}, textures = [], V3 = THREE.Vector3;
  const grain = grainTex(THREE, type.length); textures.push(grain); grain.repeat.set(1 / 150, 1 / 420);
  const mat = (col, o = {}) => new THREE.MeshStandardMaterial({ color: col, roughness: 0.55, metalness: 0.04, ...o });
  const gmat = (col, o = {}) => mat(col, { map: grain, ...o });
  const at = (m, x, y, z) => { m.position.set(x, y, z); return m; };
  const add = (id, mesh, off = [0, 0, 0], rep = false) => { mesh.userData.part = id; mesh.userData.off = off; g.add(mesh); set.push(mesh); if (rep || !reps[id]) reps[id] = mesh; return mesh; };
  const ext = (shape, depth, bevel = 0.8) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 24 });
  const trap = (w0, y0, w1, y1) => { const s = new THREE.Shape(); s.moveTo(-w0 / 2, y0); s.lineTo(w0 / 2, y0); s.lineTo(w1 / 2, y1); s.lineTo(-w1 / 2, y1); s.closePath(); return s; };
  const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  const cyl = (r, h, m, seg = 16) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), m);
  const scaled = (pts, k) => { const c = pts.reduce((a, p) => a.add(p), new THREE.Vector2()).multiplyScalar(1 / pts.length); return pts.map((p) => p.clone().sub(c).multiplyScalar(k).add(c)); };
  const ring = (pts, k, depth, m, bevel = 0) => { const sh = new THREE.Shape(pts); sh.holes.push(new THREE.Path(scaled(pts, k).reverse())); return new THREE.Mesh(ext(sh, depth, bevel), m); };
  const wood = gmat(C.top), side = gmat(C.side), dark = mat(C.dark, { roughness: 0.4 }), metal = mat(C.metal, { metalness: 0.85, roughness: 0.28 }), pale = mat(C.pale, { roughness: 0.4 });
  const neckM = gmat(C.neck), headM = gmat(C.neck);
  const materials = [wood, side, dark, metal, pale, neckM, headM];
  // — геометрия грифа: наклон назад так, чтобы струна шла над ладами с зазором
  const fbTop = sp.zfj - 1.7, woodTop = fbTop - 5, zj = sp.zfj + 2.2, zn = (zj - sp.zs * J / S) / (1 - J / S), ang = ((zn - 1.2) - sp.zfj) / J;
  const tp = (x, y, z) => { const dy = y + J, cs = Math.cos(ang), sn = Math.sin(ang); return new V3(x, -J + dy * cs - z * sn, dy * sn + z * cs); };
  const N = (m) => { m.position.copy(tp(m.position.x, m.position.y, m.position.z)); m.rotation.x += ang; return m; };
  const FBL = fretPos(sp.frets, S) + 12, NL = type === 'classic' ? 440 : FBL + 4;
  add('neck', N(at(new THREE.Mesh(ext(trap(widthAt(sp, 0) - 2, 0, widthAt(sp, NL) - 2, -NL), 20, 1), neckM), 0, 0, woodTop - 20)), [0, 45, 0], true);
  add('neck', N(at(new THREE.Mesh(ext(trap(widthAt(sp, 0), 0, widthAt(sp, FBL), -FBL), 5, 0.25), dark), 0, -2, fbTop - 5)), [0, 45, 55]);
  for (let n = 1; n <= sp.frets; n++) { const y = -fretPos(n, S); add('fret', N(at(box(widthAt(sp, -y) + 1, 1.4, 2.4, metal), 0, y, fbTop + 0.5)), [0, 45, 115], n === 12); }
  if (type !== 'classic') {
    [3, 5, 7, 9, 12, 15, 17, 19, 21].filter((n) => n <= sp.frets).forEach((n) => {
      const y = -(fretPos(n - 1, S) + fretPos(n, S)) / 2, xs = n === 12 ? [-8, 8] : [0];
      xs.forEach((x) => { const d = cyl(2.2, 0.8, pale, 20); d.rotation.x = Math.PI / 2; add('neck', N(at(d, x, y, fbTop + 0.2)), [0, 45, 60]); });
    });
  }
  add('nut', N(at(box(widthAt(sp, 0) + 1, 4, 6, pale), 0, 0, fbTop + 1)), [0, 55, 95]);
  // — голова и колки (в своей системе: y вверх по голове)
  const headG = new THREE.Group(); headG.position.copy(tp(0, 0, 0)); headG.rotation.x = ang + sp.brk; g.add(headG);
  const pegG = new THREE.Group(); pegG.position.copy(headG.position); pegG.rotation.x = headG.rotation.x; g.add(pegG);
  const hs = new THREE.Shape(); let pegSpec = [];
  if (type === 'classic') {
    hs.moveTo(-38, 0); hs.lineTo(38, 0); hs.lineTo(46, 150); hs.quadraticCurveTo(48, 188, 20, 190); hs.lineTo(-20, 190); hs.quadraticCurveTo(-48, 188, -46, 150); hs.closePath();
    [-1, 1].forEach((sd) => { const h = new THREE.Path(); h.moveTo(sd * 17, 30); h.lineTo(sd * 31, 30); h.lineTo(sd * 31, 165); h.lineTo(sd * 17, 165); h.closePath(); hs.holes.push(h); });
  } else if (type === 'acoustic') {
    hs.moveTo(-26, 0); hs.lineTo(26, 0); hs.bezierCurveTo(36, 40, 50, 90, 52, 150); hs.bezierCurveTo(52, 186, 34, 196, 0, 196); hs.bezierCurveTo(-34, 196, -52, 186, -52, 150); hs.bezierCurveTo(-50, 90, -36, 40, -26, 0);
  } else {
    hs.moveTo(-21, 0); hs.lineTo(21, 0); hs.bezierCurveTo(23, 50, 27, 110, 33, 160); hs.bezierCurveTo(40, 190, 34, 210, 4, 212); hs.bezierCurveTo(-14, 212, -26, 200, -27, 170); hs.bezierCurveTo(-26, 110, -22, 50, -21, 0);
  }
  const hm = at(new THREE.Mesh(ext(hs, 14, 0.8), headM), 0, 0, woodTop - 14); hm.userData = { part: 'head', off: [0, 150, -70] }; headG.add(hm); set.push(hm); reps.head = hm;
  const peg = (m, x, y, z) => { m.position.set(x, y, z); m.userData = { part: 'pegs', off: [0, 150, 70] }; pegG.add(m); set.push(m); if (!reps.pegs) reps.pegs = m; return m; };
  if (type === 'classic') {
    [-1, 1].forEach((sd) => [55, 100, 145].forEach((y) => {
      const sh = cyl(2.2, 52, metal, 12); sh.rotation.z = Math.PI / 2; peg(sh, sd * 38, y, woodTop - 7);
      const ro = cyl(4.6, 12, metal); ro.rotation.z = Math.PI / 2; peg(ro, sd * 24, y, woodTop - 7);
      peg(box(7, 22, 13, pale), sd * 66, y, woodTop - 7);
    }));
  } else if (type === 'acoustic') {
    [-1, 1].forEach((sd) => [48, 92, 136].forEach((y) => {
      peg(cyl(4, 22, metal), sd * 33, y, woodTop - 2);
      const sh = cyl(1.6, 24, metal, 10); sh.rotation.z = Math.PI / 2; peg(sh, sd * 46, y, woodTop - 7);
      peg(box(5, 18, 9, pale), sd * 60, y, woodTop - 7);
    }));
  } else {
    [0, 1, 2, 3, 4, 5].forEach((i) => {
      const y = 36 + i * 28, ex = 21 + (36 - 21) * (y / 190);
      peg(cyl(5, 20, metal), ex - 11, y, woodTop - 2);
      const sh = cyl(1.5, 22, metal, 10); sh.rotation.z = Math.PI / 2; peg(sh, ex + 2, y, woodTop - 7);
      peg(box(5, 16, 9, pale), ex + 14, y, woodTop - 7);
    });
  }
  if (type !== 'classic') {
    const rb = at(box(4.5, NL - 8, 4, metal), 0, -NL / 2, woodTop - 8); add('rod', N(rb), [0, 30, -90], true);
    const cv = box(type === 'acoustic' ? 24 : 20, 34, 1.6, dark); cv.position.set(0, 26, woodTop + 0.8); cv.userData = { part: 'rod', off: [0, 150, 150] }; headG.add(cv); set.push(cv);
  }
  // — струны
  const gauge = type === 'classic' ? [1.5, 1.3, 1.1, 0.8, 0.7, 0.6] : [1.15, 0.95, 0.75, 0.55, 0.42, 0.32];
  for (let i = 0; i < 6; i++) {
    const a = tp(-sp.nutP * 2.5 + i * sp.nutP, 0, fbTop + 3.4), b = new V3(-sp.brP * 2.5 + i * sp.brP, -S, sp.zs + 0.4), d = b.clone().sub(a);
    const wound = i < 3, col = type === 'classic' ? (wound ? C.tint : C.pale) : (wound ? C.bronze : C.metal);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(gauge[i], gauge[i], d.length(), 8), mat(col, { roughness: 0.3, metalness: type === 'classic' && !wound ? 0 : 0.7 }));
    m.position.copy(a.clone().add(b).multiplyScalar(0.5)); m.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize());
    add('strings', m, [0, 0, 200], i === 2);
  }
  // — корпус: свой для каждого типа
  const bodyTop = J;
  if (type === 'classic' || type === 'acoustic') {
    const dd = type === 'classic', O = outlinePts(THREE, bodyTop, dd ? CLASSIC_R : DREAD_R), dep = dd ? 95 : 108, th = 3.2, cy = -bodyTop - (dd ? 165 : 150), hr = dd ? 43 : 50;
    const topS = new THREE.Shape(O), hole = new THREE.Path(); hole.absarc(0, cy, hr, 0, Math.PI * 2, true); topS.holes.push(hole);
    add('top', at(new THREE.Mesh(ext(topS, th, 0.3), wood), 0, 0, -th), dd ? [0, 0, 55] : [0, 0, 70], true);
    add('body', at(ring(O, 0.975, dep - 2 * th, side), 0, 0, -dep + th), dd ? [0, 0, -45] : [0, 0, -75], true);
    add('body', at(new THREE.Mesh(ext(new THREE.Shape(O), th, 0.3), side), 0, 0, -dep), dd ? [0, 0, -135] : [0, 0, -150]);
    if (!dd) { // кант по краю деки
      add('top', at(ring(O, 0.985, 0.9, pale), 0, 0, 0), [0, 0, 70]);
      add('body', at(ring(O, 0.985, 0.9, pale), 0, 0, -dep - 0.9), [0, 0, -150]);
    }
    const z = dd ? 110 : 125;
    [[hr, hr + 4, dark], [hr + 4, hr + 9, pale], [hr + 9, hr + 12, dark]].forEach(([a, b, m], i) => add('hole', at(new THREE.Mesh(new THREE.RingGeometry(a, b, 64), m), 0, cy, 0.25 + i * 0.02), [0, 0, z], i === 0));
    add('hole', at(new THREE.Mesh(new THREE.CircleGeometry(hr + 14, 48), mat(C.ink, { roughness: 1 })), 0, cy, -dep + th + 0.5), [0, 0, dd ? 0 : -150]);
    if (!dd) { // пружины: X-образные, поперечные, кольцо у отверстия
      const wd = mat(C.brace, { roughness: 0.7 }), bar = (x1, y1, x2, y2, w, h) => { const len = Math.hypot(x2 - x1, y2 - y1), m = box(len, w, h, wd); m.position.set((x1 + x2) / 2, -bodyTop - (y1 + y2) / 2, -th - h / 2); m.rotation.z = Math.atan2(-(y2 - y1), x2 - x1); return add('braces', m, [0, 0, 25]); };
      bar(-112, 330, 112, 100, 14, 8); bar(112, 330, -112, 100, 14, 8); bar(-40, 345, -115, 440, 10, 6); bar(40, 345, 115, 440, 10, 6); bar(-100, 45, 100, 45, 12, 6); bar(-125, 295, 125, 295, 9, 5);
      add('braces', at(new THREE.Mesh(new THREE.RingGeometry(hr + 2, hr + 12, 48), wd), 0, cy, -th - 0.5), [0, 0, 25]);
      const pg = new THREE.Shape(new THREE.SplineCurve([[60, 130], [88, 124], [112, 146], [120, 190], [106, 232], [80, 248], [62, 222], [57, 170]].map(([x, yd]) => new THREE.Vector2(x, -bodyTop - yd))).getPoints(40));
      add('pickguard', at(new THREE.Mesh(ext(pg, 0.8, 0.2), mat(C.guard, { roughness: 0.25 })), 0, 0, 0.1), [0, 0, 135], true);
    }
    // подставка (бридж) и седло
    const bw = dd ? 190 : 175, bs = new THREE.Shape(); bs.moveTo(-bw / 2, -S - 24); bs.lineTo(bw / 2, -S - 24); bs.quadraticCurveTo(bw / 2 + 8, -S - 2, bw / 2 - 14, -S + 9); bs.lineTo(-bw / 2 + 14, -S + 9); bs.quadraticCurveTo(-bw / 2 - 8, -S - 2, -bw / 2, -S - 24);
    add('bridge', at(new THREE.Mesh(ext(bs, 7, 0.8), dark), 0, 0, 0), dd ? [0, 0, 150] : [0, 0, 175], true);
    add('bridge', at(box(dd ? 80 : 76, 3, 5.5, pale), 0, -S, 10.5), dd ? [0, 0, 160] : [0, 0, 185]);
    if (!dd) for (let i = 0; i < 6; i++) add('bridge', at(cyl(2.6, 9, pale, 12), -27 + i * 10.8, -S - 14, 11), [0, 0, 185]);
    if (dd) { /* у классики — привязка струн за подставкой */ }
  } else {
    const O = outlinePts(THREE, bodyTop, ELEC_R, ELEC_L, 170), dep = 45, bv = 2.5;
    add('body', at(new THREE.Mesh(ext(new THREE.Shape(O), dep, bv), mat(C.paint, { roughness: 0.32, metalness: 0.1 })), 0, 0, -dep - bv), [0, 0, -30], true);
    add('pickguard', at(new THREE.Mesh(ext(new THREE.Shape(scaled(O, 0.84)), 2, 0.3), mat(C.guard, { roughness: 0.3 })), 0, 0, 0), [0, 0, 55], true);
    [45, 92, 150].forEach((d, i) => {
      const y = -(S - d), pk = at(box(72, 19, 9, pale), 0, y, 6.5); add('pickups', pk, [0, 0, 105], i === 1);
      for (let k = 0; k < 6; k++) add('pickups', at(cyl(1.9, 4, metal, 12), -26.25 + k * 10.5, y, 11.5), [0, 0, 105]);
    });
    [[50, -bodyTop - 300], [32, -bodyTop - 335], [14, -bodyTop - 370]].forEach(([x, y], i) => { const k = cyl(11, 16, C.pk ? mat(C.pk, { roughness: 0.4 }) : pale, 24); k.rotation.x = Math.PI / 2; add('controls', at(k, x, y, 10), [0, 0, 120], i === 1); add('controls', at(cyl(11.6, 1.2, metal, 24), x, y, 2.6), [0, 0, 95]).rotation.x = Math.PI / 2; });
    add('controls', at(box(34, 8, 3, metal), -58, -bodyTop - 300, 3.5), [0, 0, 95]); add('controls', at(box(5, 16, 11, pale), -58, -bodyTop - 303, 9), [0, 0, 120]);
    add('controls', at(box(26, 22, 3, metal), -92, -bodyTop - 352, 3.5), [0, 0, 95]); const jk = cyl(5, 8, dark, 16); jk.rotation.x = Math.PI / 2; add('controls', at(jk, -92, -bodyTop - 352, 7), [0, 0, 110]);
    add('bridge', at(box(86, 38, 3, metal), 0, -S - 6, 2.2), [0, 0, 140], true);
    for (let i = 0; i < 6; i++) add('bridge', at(box(8.5, 20, 6, metal), -26.25 + i * 10.5, -S - 2, 7.5), [0, 0, 160]);
  }
  set.forEach((m) => { m.userData.base = m.position.clone(); if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); });
  return { group: g, meshes: set, reps, materials, textures, sp };
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
    st: { rx: VIEWS[0][0], ry: VIEWS[0][1], ex: false, sel: '', view: 0, zoom: 1, type: 'classic' },
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
        const palette = (type) => {
          const base = { dark: mix('--ink', '--cell', 0.15), metal: mix('--l3', '--cell', 0.2), pale: mix('--cell', '--l2', 0.2), ink: mix('--ink', '--ink', 0), tint: mix('--tint', '--ink', 0.1), bronze: mix('--tint', '--l3', 0.5), brace: mix('--cell', '--tint', 0.22), guard: mix('--ink', '--tint', 0.25), paint: mix('--tint', '--cell', 0.1) };
          if (type === 'acoustic') return { ...base, top: mix('--cell', '--tint', 0.34), side: mix('--tint', '--ink', 0.4), neck: mix('--tint', '--ink', 0.28) };
          if (type === 'electric') return { ...base, top: mix('--cell', '--tint', 0.4), side: mix('--tint', '--ink', 0.3), neck: mix('--cell', '--tint', 0.34), metal: mix('--l3', '--cell', 0.45), guard: mix('--cell', '--l2', 0.35), pk: mix('--ink', '--cell', 0.1) };
          return { ...base, top: mix('--cell', '--tint', 0.42), side: mix('--cell', '--tint', 0.7), neck: mix('--cell', '--tint', 0.7) };
        };
        const scene = new THREE.Scene(), pivot = new THREE.Group(); scene.add(pivot);
        scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8478, 0.9));
        const key = new THREE.DirectionalLight(0xffffff, 1.9); key.position.set(-4, 6, 9); scene.add(key);
        const rimL = new THREE.DirectionalLight(0xffffff, 0.7); rimL.position.set(6, -3, -6); scene.add(rimL);
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.domElement.className = 'gm-cv';
        let envTex = null;
        try { if (env) { const pm = new THREE.PMREMGenerator(renderer); envTex = pm.fromScene(new env.RoomEnvironment(), 0.04).texture; scene.environment = envTex; scene.environmentIntensity = 0.55; pm.dispose(); } } catch { /* без отражений */ }
        root.textContent = ''; root.appendChild(renderer.domElement);
        const dots = document.createElement('div'); dots.className = 'gm-dots'; root.appendChild(dots);
        const cam = new THREE.PerspectiveCamera(28, 1, 0.5, 80), ray = new THREE.Raycaster(), P = new THREE.Vector2(), tmp = new THREE.Vector3();
        let gt = null, t = s.ex ? 1 : 0, raf = 0, zoom = s.zoom, dragging = false, centers = {};
        const freeGt = () => { if (!gt) return; pivot.remove(gt.group); gt.meshes.forEach((m) => m.geometry.dispose()); gt.materials.forEach((m) => m.dispose()); gt.textures.forEach((x) => x.dispose()); gt = null; };
        const rebuild = () => {
          freeGt(); gt = buildGuitar(THREE, palette(s.type), s.type);
          gt.group.scale.setScalar(K); gt.group.position.y = -gt.sp.mid * K; pivot.add(gt.group);
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
          const asp = cam.aspect, dist = ((gt.sp.len * K / 2) / Math.tan(14 * Math.PI / 180) * 1.08) * (1 + 0.3 * t) / Math.min(1, asp * 1.6) / zoom;
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
