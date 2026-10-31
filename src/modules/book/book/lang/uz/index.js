// Учебник (uz): base.js + части p1…p6 в один языковой объект (S, названия, TERMS, CH).
import base from './base.js';
import * as p1 from './p1.js';
import * as p2 from './p2.js';
import * as p3 from './p3.js';
import * as p4 from './p4.js';
import * as p5 from './p5.js';
import * as p6 from './p6.js';
import * as p7 from './p7.js';
import * as p8 from './p8.js';
import * as p9 from './p9.js';
// простые версии глав для среднего уровня (те же подзаголовки и схемы, проще текст)
import * as m1 from './m1.js';
import * as m2 from './m2.js';
import * as m3 from './m3.js';

const parts = [p1, p2, p3, p4, p5, p6, p7, p8, p9];
export default { ...base, S: Object.assign({}, base.S, ...parts.map((p) => p.S)), TERMS: Object.assign({}, base.TERMS, ...parts.map((p) => p.TERMS)), CH: parts.flatMap((p) => p.CH), NN: parts.map((p) => p.NN).find(Boolean), VERSE: parts.map((p) => p.VERSE).find(Boolean), CHM: Object.assign({}, m1.CHM, m2.CHM, m3.CHM) };
