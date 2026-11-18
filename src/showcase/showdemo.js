// Витрина: демонстрационный набор «Пульта выступления» и студии. Звуки, шумы и лёгкие мелодии из классики синтезируются тут же,
// в браузере (чистый расчёт отсчётов, без звукового контекста): в репозитории нет ни одного файла. Решение автора 15.11.2026:
// в витрине задействованы все инструменты; треков как таковых не нужно — только легко нагенерированное, чтобы понять, что и как.
import { melodyById } from '../music/melodies.js';
import { normalizeShow, newEvent, newNumber, newBank, newPad, addCue } from '../music/show.js';

export const SR = 22050;
const TAU = Math.PI * 2;
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
// повторяемый случайный ряд: тот же звук при каждой загрузке
const rng = (seed) => { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const buf = (sec) => new Float32Array(Math.round(sec * SR));
// тон с затуханием: partials — [[кратность, сила]]
function tone(b, t0, f, dur, { gain = 0.3, a = 0.005, decay = 0.3, partials = [[1, 1]], saw = false } = {}) {
  const i0 = Math.round(t0 * SR), n = Math.min(b.length - i0, Math.round(dur * SR));
  for (let i = 0; i < n; i++) {
    const t = i / SR, e = Math.min(1, t / a) * Math.exp(-t / decay);
    let v = 0;
    for (const [k, p] of partials) v += p * (saw ? 2 * ((t * f * k) % 1) - 1 : Math.sin(TAU * f * k * t));
    b[i0 + i] += gain * e * v;
  }
}
// шум через простой фильтр: low/high — коэффициенты 0…1 (сглаживание)
function noise(b, t0, dur, r, { gain = 0.3, decay = 0.2, lp = 1, hp = 0 } = {}) {
  const i0 = Math.round(t0 * SR), n = Math.min(b.length - i0, Math.round(dur * SR));
  let y = 0, z = 0;
  for (let i = 0; i < n; i++) {
    y += lp * ((r() * 2 - 1) - y); z += hp * (y - z);
    const e = Math.exp(-(i / SR) / decay);
    b[i0 + i] += gain * e * (hp ? y - z : y);
  }
}
// зациклить: хвост плавно уходит в начало, шов не слышен
function loopify(b, sec = 0.4) {
  const xf = Math.round(sec * SR), n = b.length - xf, out = b.slice(0, n);
  for (let i = 0; i < xf; i++) { const k = i / xf; out[i] = b[i] * k + b[n + i] * (1 - k); }
  return out;
}
const norm = (b, peak = 0.9) => { let m = 0; for (const v of b) m = Math.max(m, Math.abs(v)); if (m > 0) { const k = peak / m; for (let i = 0; i < b.length; i++) b[i] *= k; } return b; };

/* ---------- звуки падов ---------- */
export const SOUNDS = {
  roll() { const b = buf(3.6), r = rng(1); let t = 0, step = 0.11; while (t < 2.9) { noise(b, t, 0.12, r, { gain: 0.25 + 0.5 * t / 2.9, decay: 0.03, lp: 0.55, hp: 0.05 }); t += step; step = Math.max(0.035, step * 0.965); } noise(b, 3.0, 0.6, r, { gain: 0.7, decay: 0.3, lp: 0.9, hp: 0.6 }); return norm(b); },
  fanfare() { const b = buf(3.2), P = [[1, 1], [2, 0.5], [3, 0.35], [4, 0.2]]; [[0, 67], [0.28, 67], [0.56, 67], [0.84, 72]].forEach(([t, m]) => { [0, 4, 7].forEach((d, k) => tone(b, t, hz(m + d - 12), t === 0.84 ? 2.2 : 0.3, { gain: 0.16 / (k + 1), decay: t === 0.84 ? 0.9 : 0.15, partials: P, saw: true, a: 0.02 })); }); return norm(b); },
  gong() { const b = buf(5), P = [[1, 1], [2.76, 0.6], [5.4, 0.4], [8.9, 0.25]]; tone(b, 0, 110, 5, { gain: 0.4, decay: 1.6, partials: P, a: 0.003 }); tone(b, 0, 220, 4, { gain: 0.15, decay: 1.2, partials: P }); return norm(b); },
  applause() { const b = buf(4.5), r = rng(7); for (let i = 0; i < 700; i++) noise(b, r() * 4.2, 0.03 + r() * 0.04, r, { gain: 0.08 + r() * 0.1, decay: 0.01, lp: 0.8, hp: 0.15 }); const sw = buf(4.5); for (let i = 0; i < b.length; i++) sw[i] = b[i] * Math.min(1, i / (SR * 0.5)) * Math.min(1, (b.length - i) / (SR * 1.2)); return norm(sw); },
  tick() { const b = buf(6), r = rng(3); for (let s = 0; s < 6; s++) { noise(b, s, 0.03, r, { gain: 0.5, decay: 0.01, lp: 0.7, hp: 0.3 }); tone(b, s, s % 2 ? 900 : 1200, 0.08, { gain: 0.25, decay: 0.02 }); } return norm(loopify(b, 0.05)); },
  right() { const b = buf(1.4), P = [[1, 1], [2, 0.3], [3, 0.1]]; tone(b, 0, 784, 0.6, { gain: 0.3, decay: 0.25, partials: P }); tone(b, 0.18, 1175, 1.0, { gain: 0.3, decay: 0.45, partials: P }); return norm(b); },
  wrong() { const b = buf(1.1); tone(b, 0, 110, 1, { gain: 0.35, decay: 0.7, saw: true, partials: [[1, 1], [1.04, 0.8]] }); tone(b, 0.35, 98, 0.7, { gain: 0.3, decay: 0.5, saw: true }); return norm(b); },
  hall() { const b = buf(8), r = rng(11); noise(b, 0, 8, r, { gain: 0.8, decay: 1e9, lp: 0.04 }); const m = buf(8); noise(m, 0, 8, r, { gain: 0.35, decay: 1e9, lp: 0.2, hp: 0.02 }); for (let i = 0; i < b.length; i++) b[i] += m[i] * (0.6 + 0.4 * Math.sin(TAU * 0.4 * i / SR)); return norm(loopify(b), 0.6); },
  rain() { const b = buf(8), r = rng(5); noise(b, 0, 8, r, { gain: 0.6, decay: 1e9, lp: 0.9, hp: 0.35 }); for (let i = 0; i < 260; i++) noise(b, r() * 7.8, 0.02, r, { gain: 0.3, decay: 0.006, lp: 0.9, hp: 0.5 }); return norm(loopify(b), 0.6); },
  wind() { const b = buf(10), r = rng(9), raw = buf(10); noise(raw, 0, 10, r, { gain: 1, decay: 1e9, lp: 0.08 }); for (let i = 0; i < b.length; i++) b[i] = raw[i] * (0.45 + 0.55 * Math.abs(Math.sin(TAU * 0.13 * i / SR + 1))); return norm(loopify(b, 0.8), 0.6); },
};

/* ---------- лёгкие мелодии из классики: мелодия фортепиано и мягкий бас ---------- */
export function melodyTrack(id) {
  const mel = melodyById(id); if (!mel) return null;
  const beat = 60 / mel.bpm, total = mel.notes.reduce((a, n) => a + n[1], 0) * beat + 2.5, b = buf(total);
  let t = 0.4;
  const P = [[1, 1], [2, 0.35], [3, 0.12], [4, 0.05]];
  mel.notes.forEach(([m, d], i) => {
    tone(b, t, hz(m), d * beat * 1.2, { gain: 0.2, decay: Math.max(0.25, d * beat * 0.5), partials: P, a: 0.004 });
    if (i % 4 === 0) tone(b, t, hz(m - 24), beat * 3.2, { gain: 0.14, decay: beat * 1.4, a: 0.02 });
    t += d * beat;
  });
  return norm(b);
}

// WAV 16 бит, моно
export function wavBlob(data) {
  const n = data.length, ab = new ArrayBuffer(44 + n * 2), v = new DataView(ab), str = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, SR, true); v.setUint32(28, SR * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, data[i])) * 32767, true);
  return new Blob([ab], { type: 'audio/wav' });
}

/* ---------- названия ---------- */
const NAMES = {
  ru: { event: 'День студента', banks: ['Сбивки', 'Фон'], roll: 'Барабанная дробь', fanfare: 'Фанфары', gong: 'Гонг', applause: 'Овации', tick: 'Тик-так', right: 'Верно', wrong: 'Неверно', hall: 'Зал', rain: 'Дождь', wind: 'Ветер',
    tracks: { ode: 'Ода к радости', jingle: 'Бубенцы', twinkle: 'Мерцай, звёздочка' },
    n: ['Сбор гостей', 'Открытие', 'Приветствие ведущих', 'Конкурс «Угадай мелодию»', 'Танец выпускников', 'Награждение', 'Дискотека'],
    notes: ['Фон: зал, пэд на квинте. Свет приглушён.', 'Выход ведущих справа. После гимна — сразу приветствие.', 'Без музыки. Свет тёплый, микрофоны проверены.', 'Тик-так — на время ответа, «Верно» и «Неверно» — внизу страницы «Звуки». Дробь перед ответом.', 'Танцоры выходят слева. После танца — сразу ведущий.', 'Фанфары перед вручением, овации после каждого.', 'Громкость фона вниз, трек — на 85.'],
    cues: { ode: ['Ведущие выходят', 'Тише: приветствие'], jingle: ['Свет на сцену', 'Выход ведущего справа'], twinkle: ['Фанфары — пад'] } },
  en: { event: 'Student Day', banks: ['Stings', 'Beds'], roll: 'Drum roll', fanfare: 'Fanfare', gong: 'Gong', applause: 'Applause', tick: 'Tick-tock', right: 'Right', wrong: 'Wrong', hall: 'Hall', rain: 'Rain', wind: 'Wind',
    tracks: { ode: 'Ode to Joy', jingle: 'Jingle Bells', twinkle: 'Twinkle, Twinkle' },
    n: ['Guests arrive', 'Opening', 'Hosts’ welcome', 'Quiz: guess the tune', 'Graduates’ dance', 'Awards', 'Disco'],
    notes: ['Bed: hall, fifth pad. Lights low.', 'Hosts come out on the right. Welcome right after the anthem.', 'No music. Warm light, mics checked.', 'Tick-tock while they answer, “Right” and “Wrong” at the bottom of Sounds. Drum roll before the answer.', 'Dancers enter from the left. The host comes right after.', 'Fanfare before each award, applause after.', 'Bed level down, track at 85.'],
    cues: { ode: ['Hosts come out', 'Lower: welcome'], jingle: ['Light on stage', 'Host enters right'], twinkle: ['Fanfare pad'] } },
};
NAMES.uz = { ...NAMES.en, event: 'Talaba kuni', banks: ['Sbivkalar', 'Fon'], roll: 'Baraban zarbi', fanfare: 'Fanfara', gong: 'Gong', applause: 'Qarsaklar', right: 'To‘g‘ri', wrong: 'Noto‘g‘ri', hall: 'Zal', rain: 'Yomg‘ir', wind: 'Shamol' };

// Данные пульта по готовым файлам: f — { ключ: id записи }, noises — { hall, rain, wind: id }
export function showData(f, lang = 'ru', now = Date.now()) {
  const N = NAMES[lang] || NAMES.ru;
  const start = (() => { const d = new Date(now); d.setHours(19, 0, 0, 0); if (d.getTime() < now - 3600000) d.setDate(d.getDate() + 1); return d.getTime(); })();
  const pad = (key, color, o = {}) => newPad({ name: N[key], file: f[key], color, ...o });
  const banks = [
    newBank(N.banks[0], { cols: 3, rows: 4, pads: [pad('roll', 'pink'), pad('fanfare', 'amber'), pad('gong', 'violet'), pad('applause', 'teal', { duck: true }), pad('tick', 'blue', { mode: 'loop' })] }),
    newBank(N.banks[1], { cols: 3, rows: 4, pads: [pad('hall', 'gray', { mode: 'loop', level: 55, name: N.hall }), pad('rain', 'blue', { mode: 'loop', level: 55, name: N.rain }), pad('wind', 'gray', { mode: 'loop', level: 55, name: N.wind })] }),
    newBank('', { cols: 2, rows: 1, pinned: true, pads: [pad('right', 'green'), pad('wrong', 'red')] }),
  ];
  const noises = [['hall', N.hall], ['rain', N.rain], ['wind', N.wind]].map(([k, name], i) => ({ id: 'demo-s' + i, name, file: f['n_' + k], level: 100 }));
  const nid = (k) => noises.find((x) => x.file === f['n_' + k]).id;
  const num = (i, o) => newNumber({ title: N.n[i], note: N.notes[i], ...o });
  const track = (id, i, at, o = {}) => { const n = num(i, { kind: 'track', file: f['t_' + id], at, ...o }); (N.cues[id] || []).forEach((c, k) => addCue(n, 8 + k * 17, c)); return n; };
  const numbers = [
    num(0, { kind: 'none', at: 18 * 60 + 30, bed: { pad: true, noise: nid('hall') } }),
    track('ode', 1, 19 * 60, { bed: { pad: true, noise: '', padLevel: 45 } }),
    num(2, { kind: 'none', at: 19 * 60 + 10, bed: { pad: false, noise: nid('hall'), noiseLevel: 40 } }),
    num(3, { kind: 'none', at: 19 * 60 + 30, bed: { pad: false, noise: '' } }),
    track('jingle', 4, 19 * 60 + 50, { shift: 2, bed: { pad: true, noise: nid('rain'), padLevel: 40 } }),
    track('twinkle', 5, 20 * 60 + 20, { level: 75 }),
    num(6, { kind: 'none', at: 20 * 60 + 45 }),
  ];
  const ev = newEvent({ title: N.event, start, timer: 'start', note: '', numbers });
  return normalizeShow({ page: 'prog', events: [ev], event: ev.id, banks, noises, bed: { pad: { on: false, sound: 'warm', level: 55, tonic: null }, noise: { cur: null, level: 70, xfade: 6 } } });
}

/* ---------- студия: проект из мелодии ---------- */
// Мелодия «Ода к радости» + бас + ударные (бочка и малый на 4/4); время — в долях
export function studioSong(lang = 'ru') {
  const mel = melodyById('ode'), notes = []; let t = 0;
  mel.notes.forEach(([m, d]) => { notes.push({ t, d: d * 0.95, m, v: 0.8 }); t += d; });
  const bars = Math.ceil(t / 4), bass = [], drums = [];
  const roots = [48, 55, 48, 55, 53, 48, 55, 48];
  for (let b = 0; b < bars; b++) { bass.push({ t: b * 4, d: 2, m: roots[b % roots.length] - 12, v: 0.7 }, { t: b * 4 + 2, d: 2, m: roots[b % roots.length] - 5, v: 0.6 }); drums.push({ t: b * 4, d: 0.25, m: 36, v: 0.9 }, { t: b * 4 + 1, d: 0.25, m: 38, v: 0.8 }, { t: b * 4 + 2, d: 0.25, m: 36, v: 0.9 }, { t: b * 4 + 3, d: 0.25, m: 38, v: 0.8 }); }
  const T = { ru: ['Мелодия', 'Бас', 'Ударные'], en: ['Melody', 'Bass', 'Drums'], uz: ['Kuy', 'Bas', 'Zarb'] }[lang] || ['Melody', 'Bass', 'Drums'];
  return { name: (NAMES[lang] || NAMES.ru).tracks.ode, bpm: mel.bpm, num: 4, den: 4, key: { pc: 0, minor: false }, tracks: [{ name: T[0], notes }, { name: T[1], notes: bass }, { name: T[2], drums: 'kit', notes: drums }] };
}
