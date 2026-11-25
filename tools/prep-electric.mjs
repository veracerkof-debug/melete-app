// Электро (Electric Guitar Explorer, Skabl, CC BY 4.0): 12 мешей → детали. Текстуры автора (albedo, AO) лежат в assets/.
import { tris, normalize, exportParts, load } from './prep-guitars.mjs';
const T = tris(load('electric.fbx'));
normalize(T, { headTest: (t) => t.mesh.startsWith('kolki'), xHint: (t) => t.mesh === 'corpuse_1_low', zHint: (t) => t.mesh === 'hamb1_low' || t.mesh === 'hamb2_low' });
const MAP = { corpuse_low: 'body', corpuse_1_low: 'pickguard', bridge_low: 'bridge', hamb_low: 'pickups', hamb1_low: 'bridge', hamb2_low: 'bridge', hamb3_low: 'controls', strings_low: 'strings', kolki_low: 'pegs', kolki_1_low: 'pegs', poroj_low: 'fret' };
let nutY = -1e9; T.filter((t) => t.mesh === 'poroj_low').forEach((t) => { nutY = Math.max(nutY, t.p[0].y, t.p[1].y, t.p[2].y); });
console.log('nutY', nutY.toFixed(1));
for (const t of T) { if (t.mesh === 'grif_low') { const y = (t.p[0].y + t.p[1].y + t.p[2].y) / 3; t.part = y > nutY + 5 ? 'head' : 'neck'; } else t.part = MAP[t.mesh]; }
await exportParts(T, 'guitar-electric.glb', 'electric');
