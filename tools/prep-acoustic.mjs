// Акустика (DD Acoustic Guitar, piscopancer, CC BY 4.0): один меш, 8 материалов → детали по связным компонентам и положению.
import * as THREE from 'three';
import { tris, normalize, exportParts, components, load, out } from './prep-guitars.mjs';
const T = tris(load('acoustic.fbx'));
normalize(T, { headTest: (t) => t.m === 5, xHint: (t) => t.m === 7, zHint: (t) => t.m === 0 });
const HEAD_Y = 345, NECK_BOTTOM = -112;
for (const c of components(T)) {
  const b = new THREE.Box3(); c.forEach((t) => t.p.forEach((p) => b.expandByPoint(p)));
  const m = c[0].m, w = b.max.x - b.min.x, zr = b.max.z - b.min.z, zc = (b.max.z + b.min.z) / 2, yc = (b.max.y + b.min.y) / 2, xc = (b.max.x + b.min.x) / 2;
  let part;
  if (m === 5) part = 'pegs'; else if (m === 6) part = 'strings'; else if (m === 7) part = 'pickguard';
  else if (yc > -340 && yc < -290 && zc > 38 && b.min.y > -345 && b.max.y < -290 && w < 180) part = 'bridge';
  else if (w > 150) part = (zr > 60 || zc < 0) ? 'body' : 'top';
  else if (m === 3 && yc > -330 && yc < -300 && zc > 50) part = 'bridge';
  else if (yc > -230 && yc < -95 && w > 90 && (m === 2 || m === 3) && zc > 36 && zc < 46) part = 'hole';
  else if (yc < -400) part = 'body';
  else if (b.max.y < -10 && b.min.y > -60 && xc < -30) part = 'body';
  else part = null; // шея и голова — по треугольникам
  for (const t of c) {
    t.sub = '_' + t.m; // материал исходной модели: от него зависит цвет (дерево, эбен, кант, металл…)
    if (part) { t.part = part; continue; }
    const y = (t.p[0].y + t.p[1].y + t.p[2].y) / 3;
    if (y > HEAD_Y) t.part = t.m === 4 ? 'pegs' : 'head'; else t.part = t.m === 4 ? 'fret' : 'neck';
  }
}
await exportParts(T, 'guitar-acoustic.glb', 'acoustic', false);
