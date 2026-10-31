// Произведения для уроков — только общественное достояние (народные мелодии и композиторы, умершие больше 70 лет назад);
// запись — своя: мелодия без чужой редакции и аранжировки. mel — ноты в высоте пианино (как в labs1.js: «E4q» — ми первой
// октавы четвертью, «rq» — пауза, «|» — тактовая черта, «||» — конец); ch — аккорды по тактам (первая строка — затакт,
// если он есть: ''); g, b — сдвиг высоты для гитары и баса в полутонах (звучащая высота; по умолчанию −12 и −24);
// sig — ключевые знаки (+ диезы, − бемоли). Название и автор — строки pc.<id>, pc.<id>.by.
export const PIECES = {
  twinkle: { time: [4, 4], bpm: 90, mel: 'C4q C4q G4q G4q | A4q A4q G4h | F4q F4q E4q E4q | D4q D4q C4h | G4q G4q F4q F4q | E4q E4q D4h | G4q G4q F4q F4q | E4q E4q D4h | C4q C4q G4q G4q | A4q A4q G4h | F4q F4q E4q E4q | D4q D4q C4h ||',
    ch: ['C', 'F C', 'F C', 'G C', 'C F', 'C G', 'C F', 'C G', 'C', 'F C', 'F C', 'G C'] },
  lightly: { time: [4, 4], bpm: 92, mel: 'G4q E4q E4h | F4q D4q D4h | C4q D4q E4q F4q | G4q G4q G4h | G4q E4q E4h | F4q D4q D4h | C4q E4q G4q G4q | C4w ||',
    ch: ['C', 'G7', 'C', 'C', 'C', 'G7', 'C', 'C'] },
  jacques: { time: [4, 4], bpm: 100, mel: 'C4q D4q E4q C4q | C4q D4q E4q C4q | E4q F4q G4h | E4q F4q G4h | G4e A4e G4e F4e E4q C4q | G4e A4e G4e F4e E4q C4q | C4q G3q C4h | C4q G3q C4h ||',
    ch: ['C', 'C', 'C', 'C', 'C', 'C', 'C', 'C'] },
  korobeiniki: { time: [4, 4], bpm: 120, mel: 'E5q B4e C5e D5q C5e B4e | A4q A4e C5e E5q D5e C5e | B4q. C5e D5q E5q | C5q A4q A4h | re D5q F5e A5q G5e F5e | E5q. C5e E5q D5e C5e | B4q B4e C5e D5q E5q | C5q A4q A4h ||',
    ch: ['Am', 'Am', 'E', 'Am', 'Dm', 'C', 'E', 'Am'] },
  ode: { time: [4, 4], bpm: 96, mel: 'E4q E4q F4q G4q | G4q F4q E4q D4q | C4q C4q D4q E4q | E4q. D4e D4h | E4q E4q F4q G4q | G4q F4q E4q D4q | C4q C4q D4q E4q | D4q. C4e C4h ||',
    ch: ['C', 'G', 'C', 'G', 'C', 'G', 'C', 'G C'] },
  saints: { time: [4, 4], bpm: 110, mel: 'C4q E4q F4q | G4w | rq C4q E4q F4q | G4w | rq C4q E4q F4q | G4h E4h | C4h E4h | D4w | rq E4q E4q D4q | C4h. C4q | E4h G4q G4q | F4w | rq E4q F4q G4q | E4h C4h | D4w | C4w ||',
    ch: ['', 'C', 'C', 'C', 'C', 'C', 'C', 'G', 'G', 'C', 'C7', 'F', 'C', 'C', 'G', 'C'] },
  jingle: { time: [4, 4], bpm: 120, mel: 'E4q E4q E4h | E4q E4q E4h | E4q G4q C4q. D4e | E4w | F4q F4q F4q. F4e | F4q E4q E4q E4e E4e | E4q D4q D4q E4q | D4h G4h | E4q E4q E4h | E4q E4q E4h | E4q G4q C4q. D4e | E4w | F4q F4q F4q F4q | F4q E4q E4q E4e E4e | G4q G4q F4q D4q | C4w ||',
    ch: ['C', 'C', 'C', 'C', 'F', 'C', 'D7', 'G', 'C', 'C', 'C', 'C', 'F', 'C', 'G7', 'C'] },
  amazing: { time: [3, 4], bpm: 84, sig: 1, mel: 'D4q | G4h B4e G4e | B4h A4q | G4h E4q | D4h D4q | G4h B4e G4e | B4h A4q | G4h. ||',
    ch: ['', 'G', 'G7', 'C', 'G', 'G', 'D', 'G'] },
  minuet: { time: [3, 4], bpm: 100, sig: 1, mel: 'D5q G4e A4e B4e C5e | D5q G4q G4q | E5q C5e D5e E5e F#5e | G5q G4q G4q | C5q D5e C5e B4e A4e | B4q C5e B4e A4e G4e | F#4q G4e A4e B4e G4e | A4h. ||',
    ch: ['G', 'G', 'C', 'G', 'C', 'G', 'D', 'D'] },
  greensleeves: { time: [3, 4], bpm: 96, mel: 'A4q | C5h D5q | E5q. F5e E5q | D5h B4q | G4q. A4e B4q | C5h A4q | A4q. G#4e A4q | B4h G#4q | E4h A4q | C5h D5q | E5q. F5e E5q | D5h B4q | G4q. A4e B4q | C5q. B4e A4q | G#4q. F#4e G#4q | A4h. ||',
    ch: ['', 'Am', 'C', 'G', 'Em', 'Am', 'E', 'E', 'Am', 'C', 'C', 'G', 'Em', 'Am', 'E', 'Am'] },
  furelise: { time: [3, 8], bpm: 120, beat: 'e', mel: 'E5s D#5s | E5s D#5s E5s B4s D5s C5s | A4e rs C4s E4s A4s | B4e rs E4s G#4s B4s | C5e rs E4s E5s D#5s | E5s D#5s E5s B4s D5s C5s | A4e rs C4s E4s A4s | B4e rs E4s C5s B4s | A4q. ||',
    ch: ['', '', 'Am', 'E', 'Am', '', 'Am', 'E', 'Am'] },
  mountain: { time: [4, 4], bpm: 100, mel: 'B3e C#4e D4e E4e F#4e D4e F#4q | F4e C#4e F4q E4e C4e E4q | B3e C#4e D4e E4e F#4e D4e F#4e B4e | A4e F#4e D4e F#4e A4h ||',
  },
  canon: { time: [4, 4], bpm: 60, sig: 2, mel: 'D3h A2h | B2h F#2h | G2h D2h | G2h A2h ||', ch: ['D A', 'Bm F#m', 'G D', 'G A'], g: 12, b: 0 },
  prelude: { time: [4, 4], bpm: 66, beat: 's', mel:
    'C4s E4s G4s C5s E5s G4s C5s E5s C4s E4s G4s C5s E5s G4s C5s E5s | C4s D4s A4s D5s F5s A4s D5s F5s C4s D4s A4s D5s F5s A4s D5s F5s | B3s D4s G4s D5s F5s G4s D5s F5s B3s D4s G4s D5s F5s G4s D5s F5s | C4s E4s G4s C5s E5s G4s C5s E5s C4s E4s G4s C5s E5s G4s C5s E5s ||',
    ch: ['C', 'Dm/C', 'G7/B', 'C'] },
  rising: { time: [6, 8], bpm: 160, beat: 'e', arp: true, mel: '', ch: ['Am', 'C', 'D', 'F', 'Am', 'C', 'E', 'E', 'Am', 'C', 'D', 'F', 'Am', 'E', 'Am', 'E'] },
  // свои учебные темы (Melete): блюз в F и рифф ii–V–I — для джазовых уроков
  mblues: { time: [4, 4], bpm: 120, swing: true, sig: -1, mel: 'F4e A4e C5e D5e Eb5q D5q | C5h rh | F4e A4e C5e D5e Eb5q D5q | C5h rh | Bb4e D5e F5e G5e Ab5q G5q | F5h rh | F4e A4e C5e D5e Eb5q D5q | C5h rh | G4e Bb4e D5e E5e F5q E5q | Eb5e D5e C5e Bb4e A4q G4q | F4h rq C4q | F4h rh ||',
    ch: ['F7', 'Bb7', 'F7', 'F7', 'Bb7', 'Bb7', 'F7', 'D7', 'Gm7', 'C7', 'F7 D7', 'Gm7 C7'] },
  miivi: { time: [4, 4], bpm: 112, swing: true, mel: 'F4e A4e C5e E5e D5q C5q | B4e G4e F4e D4e B3q D4q | E4e G4e B4e D5e C5q B4q | C5w ||', ch: ['Dm7', 'G7', 'Cmaj7', 'Cmaj7'] },
};

// Октава для гитары и баса: заданная (g, b) или та, где мелодия ложится в первые позиции (звучащая высота)
export function shiftFor(pc, inst, ms) {
  if (inst === 'p') return 0;
  if (inst === 'g' && pc.g != null) return pc.g;
  if (inst === 'b' && pc.b != null) return pc.b;
  const [lo, hi, cand] = inst === 'g' ? [40, 69, [-12, 0, -24]] : [28, 50, [-24, -36, -12]];
  const mn = Math.min(...ms), mx = Math.max(...ms);
  return cand.find((k) => mn + k >= lo && mx + k <= hi) ?? cand.filter((k) => mn + k >= lo).sort((a, b) => a - b)[0] ?? cand[0];
}

const T0 = [40, 45, 50, 55, 59, 64], B0 = [28, 33, 38, 43]; // строй гитары и баса (снизу вверх)
// Табулатура: для каждой ноты — струна и лад; первая позиция (лады 0–4), выше — ближе к прошлому ладу
export function tabOf(ms, inst) {
  const open = inst === 'b' ? B0 : T0; let prev = 2;
  return ms.map((m) => {
    if (m == null) return null;
    const c = open.map((o, s) => ({ s, f: m - o })).filter((x) => x.f >= 0 && x.f <= 17);
    if (!c.length) return null;
    const low = c.filter((x) => x.f <= 4).sort((a, b) => a.f - b.f);
    const pick = low.length ? low[0] : c.sort((a, b) => Math.abs(a.f - prev) - Math.abs(b.f - prev))[0];
    prev = pick.f || prev;
    return pick;
  });
}
