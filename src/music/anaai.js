// «Улучшить разбор» (слово автора 26.11.2026): измеряет наша программа (темп, доли, сырые аккорды, повторы), истолковывает нейросеть
// (красивая запись аккордов, названия частей, проверка темпа и тональности, гипотеза о составе). Модели уходит маленькая сводка по тактам,
// а не секунды и сырые данные; ответ — только правки по номерам тактов. Звука и текстов песен здесь нет.
// Чистые функции без DOM и сети: сетка тактов, сжатие повторов, кандидаты в части по повторам аккордов, сводка, задачи, перевод тактов в секунды.
import { labelText, parseText } from './chordedit.js';

export const DIGEST_LIMITS = { bars: 400, marks: 60, line: 8 };
const NOTE = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const one = (v) => String(v == null ? '' : v).replace(/[\r\n|]+/g, ' ').trim();
const r1 = (x) => Math.round(x * 10) / 10;
export const keyName = (a) => (a && a.pc != null ? NOTE[a.pc] + (a.minor ? 'm' : '') : '');

// Начала тактов, с: сильные доли разбора; нет их — по темпу и первой доле. Такт 1 — первая сильная доля.
export function barStarts(ana, dur = 0) {
  if (!ana) return [];
  const dn = (ana.downbeats || []).filter((x) => Number.isFinite(x)).slice().sort((a, b) => a - b);
  if (dn.length >= 2) return dn.slice(0, DIGEST_LIMITS.bars);
  if (!(ana.bpm > 0)) return [];
  const bpb = ana.bpb > 0 ? ana.bpb : 4, len = (60 / ana.bpm) * bpb, t0 = (ana.beats && ana.beats[0]) || 0, out = [];
  for (let t = t0; t < (dur || t0 + len * 64) - len * 0.5 && out.length < DIGEST_LIMITS.bars; t += len) out.push(Math.round(t * 1000) / 1000);
  return out;
}

// Аккорды по тактам: у каждого такта — один или два аккорда (занявшие хотя бы четверть такта); нет аккорда — «N»
export function chordsByBar(ana, starts, dur = 0) {
  const ch = (ana && Array.isArray(ana.chords) ? ana.chords : []).filter((x) => x && Number.isFinite(x.t) && x.d > 0);
  return starts.map((t0, i) => {
    const t1 = i + 1 < starts.length ? starts[i + 1] : (dur && dur > t0 ? dur : t0 + (starts[i] - (starts[i - 1] ?? starts[i] - 2)));
    const len = Math.max(0.01, t1 - t0), runs = [];
    ch.forEach((c) => { const a = Math.max(t0, c.t), b = Math.min(t1, c.t + c.d); if (b - a > 0.001) runs.push({ c: c.c, a, w: b - a }); });
    runs.sort((x, y) => x.a - y.a);
    const keep = runs.filter((x) => x.w >= len * 0.25), seq = [];
    (keep.length ? keep : runs.slice().sort((x, y) => y.w - x.w).slice(0, 1)).forEach((x) => { const s = labelText(x.c); if (seq[seq.length - 1] !== s) seq.push(s); });
    return seq.length ? seq.slice(0, 2).join(' ') : 'N';
  });
}

// Сжатие повторов: подряд идущие одинаковые такты → «Am×4»; строки по 8 тактов с номером начала
export function gridText(rows) {
  const toks = []; let i = 0;
  while (i < rows.length) { let j = i; while (j + 1 < rows.length && rows[j + 1] === rows[i]) j++; toks.push({ at: i + 1, s: rows[i].replace(/ /g, '·') + (j > i ? '×' + (j - i + 1) : ''), n: j - i + 1 }); i = j + 1; }
  const lines = []; let cur = null, bars = 0;
  toks.forEach((tk) => { if (!cur || bars >= DIGEST_LIMITS.line) { cur = { at: tk.at, parts: [] }; lines.push(cur); bars = 0; } cur.parts.push(tk.s); bars += tk.n; });
  return lines.map((l) => 'такт ' + l.at + ': ' + l.parts.join(' | ')).join('\n');
}

// Кандидаты в части по повторам: одинаковые куски последовательности тактов получают одну букву (A, B, C…). Берутся самые мелкие повторяющиеся
// единицы (4, затем 2 такта), соседние одинаковые склеиваются (куплет из двух одинаковых четвёрок — одна часть); короткие куски, чья пара
// повторяется дальше (B C … B C), собираются в одну часть. Куски без повтора — свои буквы. Имена не даются — их выбирает нейросеть.
// → [{ from, to (такты с 1), g, times }]
export function localSections(rows) {
  const n = rows.length; if (n < 4) return [];
  const key = (i, L) => rows.slice(i, i + L).join('/');
  const count = (i, L) => { const k = key(i, L); let c = 0; for (let j = 0; j + L <= n; j++) if (key(j, L) === k) c++; return c; };
  const segs = []; let i = 0, spill = 0, uniq = 0;
  const flush = (upto) => { if (upto > spill) segs.push({ from: spill + 1, to: upto, k: 'u' + uniq++, times: 1 }); };
  while (i < n) {
    let hit = 0;
    for (const L of [4, 2]) if (i + L <= n && count(i, L) > 1 && (L === 2 || new Set(rows.slice(i, i + L)).size > 1)) { hit = L; break; }
    if (!hit) { i++; continue; }
    flush(i);
    segs.push({ from: i + 1, to: i + hit, k: key(i, hit), times: count(i, hit) });
    i += hit; spill = i;
  }
  flush(n);
  const join = (list) => { const m = []; list.forEach((s) => { const p = m[m.length - 1]; if (p && p.k === s.k) { p.to = s.to; p.times += s.times; } else m.push({ ...s }); }); return m; };
  let out = join(segs);
  // короткие (≤ 4 такта) соседние части, чья последовательность повторяется дальше, — одна часть
  for (let guard = 0; guard < 8; guard++) {
    let did = false;
    for (const K of [3, 2]) {
      for (let a = 0; a + K <= out.length && !did; a++) {
        const grp = out.slice(a, a + K);
        if (grp.some((x) => x.to - x.from + 1 > 4) || new Set(grp.map((x) => x.k)).size < 2) continue;
        const sig = grp.map((x) => x.k).join('>');
        const hits = [a]; for (let b = a + K; b + K <= out.length; b++) if (out.slice(b, b + K).map((x) => x.k).join('>') === sig) { hits.push(b); b += K - 1; }
        if (hits.length < 2) continue;
        const merged = out.slice(); // с конца, чтобы индексы не сдвигались
        hits.slice().reverse().forEach((h) => merged.splice(h, K, { from: out[h].from, to: out[h + K - 1].to, k: 'g' + sig, times: hits.length }));
        out = merged; did = true;
      }
      if (did) break;
    }
    if (!did) break;
  }
  const letters = new Map();
  return out.map((s) => { if (!letters.has(s.k)) letters.set(s.k, String.fromCharCode(65 + (letters.size % 26))); return { from: s.from, to: s.to, g: letters.get(s.k), times: s.times }; });
}

// Сводка записи для модели (кратко: сетка тактов, кандидаты в части, метки, дорожки). r — запись файла; names — разделённые дорожки (parts), если есть
export function recDigest(r, names = []) {
  if (!r) return '';
  const a = r.ana;
  let s = 'ЗАПИСЬ ' + r.id + ' «' + one(r.name) + '»: длина ' + Math.floor((r.dur || 0) / 60) + ':' + String(Math.round((r.dur || 0) % 60)).padStart(2, '0') + '.';
  if (!a) return s + '\nРазбора записи ещё нет: темп, тональность и аккорды неизвестны. Скажи об этом человеку — разбор запускает он в медиатеке. Не выдумывай их.';
  const starts = barStarts(a, r.dur || 0);
  s += '\nИЗМЕРЕНО программой: тональность ' + keyName(a) + (a.conf != null ? ' (уверенность ' + Math.round(a.conf * 100) + ' %)' : '') + (a.cents != null && Math.abs(a.cents) >= 15 ? ', строй ' + (a.cents > 0 ? '+' : '') + Math.round(a.cents) + ' центов' : '') + ', темп ' + (a.bpm || '?') + ', ' + (a.bpb || 4) + ' доли в такте, тактов ≈ ' + starts.length + '.';
  if (a.cedit) s += '\n' + (a.cai ? 'Аккорды уже правила нейросеть (человек не проверял).' : 'Аккорды правил человек — это подтверждено, не меняй без причины.');
  if (!starts.length) return s + '\nСетки тактов нет (нет сильных долей и темпа): работать по тактам нельзя.';
  const rows = chordsByBar(a, starts, r.dur || 0);
  s += '\nАККОРДЫ ПО ТАКТАМ (из разбора; «·» — два аккорда в такте, N — нет, ×n — повтор; номера тактов с 1):\n' + gridText(rows);
  const sec = localSections(rows);
  if (sec.length) s += '\nКАНДИДАТЫ В ЧАСТИ (посчитаны по повторам аккордов, имён нет): ' + sec.map((x) => x.g + ' такты ' + x.from + '–' + x.to + (x.times > 1 ? ' (повторов ' + x.times + ')' : '')).join('; ') + '.';
  const ms = (r.marks || []).slice(0, DIGEST_LIMITS.marks).map((m) => { const bi = starts.findIndex((t, i) => m.t >= t - 0.3 && (i + 1 >= starts.length || m.t < starts[i + 1] - 0.3)); return (bi >= 0 ? 'такт ' + (bi + 1) : r1(m.t) + ' с') + ' «' + one(m.name || '—') + '»' + (m.ai ? ' (ИИ)' : ' (человек)'); });
  s += '\nМЕТКИ ЧАСТЕЙ: ' + (ms.join('; ') || 'нет') + '.';
  if (names.length) s += '\nРАЗДЕЛЁННЫЕ ДОРОЖКИ (разделение сделано, громкость не измерена): ' + names.join(', ') + '.';
  return s;
}

// Номер такта (с 1) → начало и конец, с. Нет такого такта — null
export function barSpan(starts, bar, dur = 0) {
  const i = Math.floor(bar) - 1; if (!(i >= 0 && i < starts.length)) return null;
  const t0 = starts[i], t1 = i + 1 < starts.length ? starts[i + 1] : dur > t0 ? dur : t0 + (t0 - (starts[i - 1] ?? t0 - 2));
  return { t0, t1 };
}
// Правки по тактам [{ bar, c: «Am» | «Am F» }] → элементы по времени для applyItems; два аккорда делят такт пополам. → { items, bad }
export function barItems(starts, items, dur = 0) {
  const out = []; let bad = 0;
  (Array.isArray(items) ? items : []).forEach((x) => {
    const sp = x && barSpan(starts, +x.bar, dur); if (!sp) { bad++; return; }
    const cs = String(x.c == null ? '' : x.c).trim().split(/\s+/).filter(Boolean).slice(0, 2);
    if (!cs.length || cs.some((c) => !parseText(c).ok)) { bad++; return; }
    const half = (sp.t1 - sp.t0) / cs.length;
    cs.forEach((c, k) => out.push({ t: sp.t0 + half * k, d: half, c }));
  });
  return { items: out, bad };
}

// Задачи «Улучшить разбор»: подпись, ТЗ (текст в поле ввода), какой блок вернуть
export const TASKS = [
  { id: 'chords', label: 'Аккорды красиво', tz: 'Приведи запись аккордов этой записи в красивый, играбельный вид. Опирайся на сетку тактов и тональность из данных: убери дрожание и случайные аккорды вне тональности, где уверен; пиши аккорды понятно и в нужном написании (♯ или ♭ по тональности); не меняй то, что подтвердил человек. Верни только изменённые такты блоком melete-rec с op "barchords" (по номерам тактов). Если не уверен — оставь как есть и скажи, где сомневаешься.' },
  { id: 'structure', label: 'Части песни', tz: 'Назови части песни по кандидатам в части и аккордам (вступление, куплет, припев, мост, проигрыш, концовка). Верни блок melete-rec с op "parts" — только начала частей по номерам тактов. Если в чём-то не уверен, скажи и не ставь метку.' },
  { id: 'check', label: 'Проверить темп и тональность', tz: 'Проверь измеренные темп и тональность: не удвоен ли и не поделён ли темп, не перепутаны ли параллельные мажор и минор. Верни блок melete-rec с op "check" и честной уверенностью; сами данные не меняй.' },
  { id: 'instruments', label: 'Состав инструментов', tz: 'Подскажи, какие инструменты, вероятно, звучат в этой песне, по названию, исполнителю и данным. Это гипотеза: верни блок melete-rec с op "meta" и полем instruments (до 12 коротких названий) и пометкой, в чём не уверен. Не выдумывай, если песню не знаешь.' },
  { id: 'meta', label: 'Название и исполнитель', tz: 'Очисти название и исполнителя по имени файла (уберите мусор вроде «official video», качество, номера), предложи жанр. Верни блок melete-rec с op "meta" (title, artist, genre). Если не уверен — ответь «не уверен» и ничего не предлагай.' },
];

// Часть системной инструкции: форматы правок записи по тактам (когда открыта правка медиатеки)
export const ANA_PROMPT = [
  '4а) «Улучшить разбор» — правки записи по ТАКТАМ (номера с 1, как в сводке), блок ```melete-rec с массивом:',
  '{"op":"barchords","ref":"<id записи>","items":[{"bar":1,"c":"Am"},{"bar":2,"c":"F C"}]} — аккорд такта; два аккорда через пробел делят такт пополам; названия: C, Am7, F♯m, B♭maj7, Gsus4, Edim, N (нет аккорда).',
  '{"op":"parts","ref":"<id записи>","items":[{"bar":9,"name":"Куплет 1"},{"bar":25,"name":"Припев"}]} — начала частей. {"op":"meta","ref":"<id записи>","title":"…","artist":"…","genre":"…","instruments":["гитара","бас","ударные","вокал"],"note":"в чём не уверен"} — гипотеза, не факт. {"op":"check","ref":"<id записи>","tempo":"ok|double|half|unsure","key":"Am","confidence":0.7,"note":"…"} — заключение, данные не меняет.',
  'В сводке отмечено, что ИЗМЕРЕНО программой, что правил человек (подтверждено) и что правила нейросеть: человеческое не меняй. Всё твоё — гипотеза и будет помечено «от ИИ»; не уверен — так и скажи, а не угадывай. Ты не слышишь звук и не знаешь точных версий песен: чужие аккорды «по памяти» — только подсказка, помечай «проверьте». Текст песен не выдавай.',
].join('\n');
