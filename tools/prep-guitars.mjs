// Готовит модели гитар для урока «Устройство гитары»: читает исходные FBX (Sketchfab, CC BY: «DD Acoustic Guitar» — piscopancer,
// «Electric Guitar Explorer» — Skabl), приводит к своим осям (y — вдоль грифа к голове, x — к тонким струнам, z — вверх по деке),
// разбивает на именованные детали и пишет компактные GLB в src/modules/book/book/assets/. Запуск: node tools/prep-guitars.mjs <папка с FBX>
import fs from 'fs';
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
globalThis.FileReader = class { readAsArrayBuffer(b) { b.arrayBuffer().then((r) => { this.result = r; this.onloadend && this.onloadend(); }); } readAsDataURL(b) { b.arrayBuffer().then((r) => { this.result = 'data:application/octet-stream;base64,' + Buffer.from(r).toString('base64'); this.onloadend && this.onloadend(); }); } };
const dir = process.argv[2] || '.', out = 'src/modules/book/book/assets', DEBUG = !!process.env.DEBUG;
const load = (f) => { const b = fs.readFileSync(dir + '/' + f); return new FBXLoader().parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), ''); };
// Треугольники: {p:[3 Vector3], n:[3 Vector3], uv, m (материал), mesh}
function tris(root) {
  root.updateMatrixWorld(true); const T = [];
  root.traverse((o) => {
    if (!o.isMesh) return; const g = o.geometry, pos = g.attributes.position, nor = g.attributes.normal, uvA = g.attributes.uv, idx = g.index, mats = Array.isArray(o.material) ? o.material.length : 1;
    const groups = g.groups.length ? g.groups : [{ start: 0, count: idx ? idx.count : pos.count, materialIndex: 0 }];
    const nm = new THREE.Matrix3().getNormalMatrix(o.matrixWorld);
    for (const gr of groups) for (let i = gr.start; i < gr.start + gr.count; i += 3) {
      const ix = [0, 1, 2].map((k) => (idx ? idx.getX(i + k) : i + k));
      T.push({ p: ix.map((j) => new THREE.Vector3().fromBufferAttribute(pos, j).applyMatrix4(o.matrixWorld)), n: ix.map((j) => nor ? new THREE.Vector3().fromBufferAttribute(nor, j).applyMatrix3(nm).normalize() : new THREE.Vector3(0, 0, 1)), uv: ix.map((j) => (uvA ? [uvA.getX(j), uvA.getY(j)] : [0, 0])), m: gr.materialIndex, mesh: o.name, mats });
    }
  });
  return T;
}
const cen = (t) => t.p[0].clone().add(t.p[1]).add(t.p[2]).multiplyScalar(1 / 3);
// Оси по главным компонентам: самая длинная — вдоль грифа
function pca(T) {
  const pts = T.map(cen), mean = pts.reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(1 / pts.length);
  const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; pts.forEach((p) => { const d = p.clone().sub(mean).toArray(); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[i][j] += d[i] * d[j]; });
  let axes = []; let M = C.map((r) => r.slice());
  for (let k = 0; k < 3; k++) { let v = new THREE.Vector3(Math.random() + 0.1, Math.random() + 0.1, Math.random() + 0.1).normalize(); for (let it = 0; it < 200; it++) { const a = v.toArray(); const w = [0, 1, 2].map((i) => M[i][0] * a[0] + M[i][1] * a[1] + M[i][2] * a[2]); v = new THREE.Vector3(...w).normalize(); } const lam = v.toArray().reduce((s, x, i) => s + x * (M[i][0] * v.x + M[i][1] * v.y + M[i][2] * v.z), 0); axes.push(v.clone()); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) M[i][j] -= lam * v.toArray()[i] * v.toArray()[j]; }
  return { mean, axes };
}
// Переводит треугольники в наши оси: y — к голове, x — к тонким струнам (сторона накладки/«тонкой» стороны задаётся hintX), z — вверх (hintZ)
function normalize(T, { headMats, headTest, xHint, zHint }) {
  const { mean, axes } = pca(T); let [L, W, D] = axes;
  const proj = (v, a) => v.clone().sub(mean).dot(a);
  const headC = T.filter(headTest).map(cen).reduce((a, p) => a.add(p), new THREE.Vector3()), nh = T.filter(headTest).length; headC.multiplyScalar(1 / nh);
  if (proj(headC, L) < 0) L.negate();
  const xC = T.filter(xHint).map(cen).reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(1 / T.filter(xHint).length); if (proj(xC, W) < 0) W.negate();
  const zC = T.filter(zHint).map(cen).reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(1 / T.filter(zHint).length); if (proj(zC, D) < 0) D.negate();
  const det = new THREE.Matrix3().set(W.x, W.y, W.z, L.x, L.y, L.z, D.x, D.y, D.z).determinant();
  if (DEBUG) console.log('det', det.toFixed(2));
  const M = new THREE.Matrix4().makeBasis(W, L, D).transpose(); // из модели в (x=W, y=L, z=D)
  const flip = det < 0; // зеркальная система: отражаем x и меняем обход вершин
  for (const t of T) { t.p = t.p.map((p) => p.clone().sub(mean).applyMatrix4(M)); t.n = t.n.map((n) => n.clone().applyMatrix4(M).normalize()); if (flip) { t.p.forEach((p) => { p.x = -p.x; }); t.n.forEach((n) => { n.x = -n.x; }); t.p.reverse(); t.n.reverse(); t.uv.reverse(); } }
  const all = T.flatMap((t) => t.p), bb = new THREE.Box3().setFromPoints(all), len = bb.max.y - bb.min.y, k = 1000 / len, c = bb.getCenter(new THREE.Vector3());
  for (const t of T) { t.p.forEach((p) => p.sub(c).multiplyScalar(k)); }
  return { flip, k };
}
function exportParts(T, name, label, withUV = true) {
  const by = {}; for (const t of T) (by[t.part + (t.sub || '')] ||= []).push(t);
  const scene = new THREE.Scene(), report = {};
  for (const [part, ts] of Object.entries(by)) {
    const pos = new Float32Array(ts.length * 9), nor = new Float32Array(ts.length * 9), uv = new Float32Array(ts.length * 6);
    ts.forEach((t, i) => t.p.forEach((p, k) => { pos.set(p.toArray(), i * 9 + k * 3); nor.set(t.n[k].toArray(), i * 9 + k * 3); uv.set(t.uv[k], i * 6 + k * 2); }));
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); if (withUV) g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xcccccc })); m.name = part; scene.add(m); report[part] = ts.length;
  }
  console.log(label, report);
  return new Promise((res) => new GLTFExporter().parse(scene, (buf) => { fs.writeFileSync(out + '/' + name, Buffer.from(buf)); console.log('->', name, (buf.byteLength / 1024).toFixed(0), 'КБ'); res(); }, (e) => { throw e; }, { binary: true }));
}
export { tris, normalize, exportParts, cen, load, DEBUG, out };
// Связные компоненты (по общим вершинам) внутри одного материала
export function components(T, key = (t) => t.m) {
  const q = (p) => Math.round(p.x * 4) + ',' + Math.round(p.y * 4) + ',' + Math.round(p.z * 4), par = new Map(); const find = (a) => { while (par.get(a) !== a) { par.set(a, par.get(par.get(a))); a = par.get(a); } return a; };
  const uni = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) par.set(ra, rb); };
  T.forEach((t) => t.p.forEach((p) => { const k = key(t) + '|' + q(p); if (!par.has(k)) par.set(k, k); })); T.forEach((t) => { const ks = t.p.map((p) => key(t) + '|' + q(p)); uni(ks[0], ks[1]); uni(ks[1], ks[2]); });
  const comp = new Map(); T.forEach((t) => { const r = find(key(t) + '|' + q(t.p[0])); t.c = r; if (!comp.has(r)) comp.set(r, []); comp.get(r).push(t); });
  return [...comp.values()];
}
