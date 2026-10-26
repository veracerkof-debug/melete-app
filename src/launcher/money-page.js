// Черновик «Денег» для Ἐλάχιστον: один файл, данные — в localStorage браузера.
const KEY = 'elachiston.money.draft';
const CUR = 'сум';
const EXP = [['food','Еда','#4FB286'],['groc','Продукты','#8AB34F'],['trans','Транспорт','#C98B7C'],['util','Коммуналка','#A882D0'],
  ['phone','Телефон','#5E9BD6'],['cig','Сигареты','#9AA645'],['tithe','Десятина','#D2A541'],['give','Пожертвования','#E0A06A'],
  ['gift','Подарки','#E07B4F'],['cloth','Одежда','#6CB7C9'],['health','Здоровье','#D96C7E'],['music','Музыка','#7C8BD9'],
  ['fun','Развлечения','#C98BC9'],['tech','Электроника','#7AA0B0'],['online','Интернет-покупки','#B0A27A'],['home','Мебель','#A08060'],
  ['care','Уход за собой','#E09AB8'],['pet','Питомец','#B88A5A'],['study','Учёба','#6A9F8A'],['save','Накопления','#4C8C9C'],['other','Другое','#999']];
const INC = [['salary','Зарплата','#C99A3C'],['gig','Концерты','#7C8BD9'],['side','Подработка','#4FB286'],['gifti','Подарок','#E07B4F'],
  ['refund','Возврат','#5E9BD6'],['otheri','Другое','#999']];
const CATS = {}; [...EXP.map(c => [...c, 'e']), ...INC.map(c => [...c, 'i'])].forEach(([id, n, c, k]) => CATS[id] = { id, n, c, k });
const HUES = ['#4FB286','#C98B7C','#A882D0','#5E9BD6','#D2A541','#E07B4F','#6CB7C9','#D96C7E','#7C8BD9','#8AB34F'];
function addCustom(c) { CATS[c.id] = { id: c.id, n: c.n, c: c.c, k: c.k }; }
const MONTHS = ['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];
const MON_S = ['янв.','февр.','март','апр.','май','июнь','июль','авг.','сент.','окт.','нояб.','дек.'];
const WD = ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'];
const DAY = 864e5;

const fmt = (n) => Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ');
const signed = (r) => (r.k === 'e' ? '−' : '+') + fmt(r.a);
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const monthStart = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const inMonth = (t, m) => { const d = new Date(t); return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth(); };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// ── хранение ──
let db;
function load() {
  try { db = JSON.parse(localStorage.getItem(KEY)); } catch { db = null; }
  if (!db || !Array.isArray(db.recs)) { db = { recs: sample(), budget: 4000000 }; save(); }
  (db.custom || []).forEach(addCustom);
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {} }

// пример: три месяца правдоподобных записей
function sample() {
  let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const recs = []; const now = new Date();
  const add = (d, h, k, c, a, n = '') => { const t = new Date(d); t.setHours(h, Math.floor(rnd() * 60)); if (t <= now) recs.push({ id: uid() + recs.length, t: t.getTime(), k, c, a, n }); };
  for (let i = 95; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    if (rnd() < .8) add(d, 13, 'e', 'food', pick([18000, 25000, 25000, 30000, 45000]));
    if (rnd() < .6) add(d, 8, 'e', 'trans', pick([13000, 29000, 29000, 6000]));
    if (rnd() < .5) add(d, 18, 'e', 'cig', pick([34000, 34000, 68000]));
    if (d.getDay() === 6) add(d, 11, 'e', 'groc', pick([180000, 240000, 310000]));
    if (d.getDate() === 5) { add(d, 10, 'i', 'salary', 4200000); add(d, 12, 'e', 'tithe', 420000); add(d, 15, 'e', 'util', 380000); }
    if (d.getDate() === 12) add(d, 9, 'e', 'phone', 65000, 'тариф');
    if (rnd() < .06) add(d, 20, 'i', 'gig', pick([600000, 900000]), 'свадьба');
    if (rnd() < .05) add(d, 17, 'e', pick(['gift', 'cloth', 'music', 'health', 'online']), pick([120000, 250000, 400000]));
  }
  return recs;
}

// ── частые: категории по частоте и времени суток, пары «категория + сумма» ──
function sortedCats(kind) {
  const now = Date.now(), h = new Date().getHours(), score = {};
  for (const r of db.recs) {
    if (r.k !== kind || now - r.t > 60 * DAY) continue;
    const dh = Math.abs(new Date(r.t).getHours() - h);
    score[r.c] = (score[r.c] || 0) + 1 + (Math.min(dh, 24 - dh) <= 2 ? 2 : 0);
  }
  const all = Object.values(CATS).filter((c) => c.k === kind).map((c) => c.id);
  return all.sort((a, b) => (score[b] || 0) - (score[a] || 0)); // без записей — в исходном порядке
}
function quickPairs(kind) {
  const now = Date.now(), cnt = {};
  for (const r of db.recs) if (r.k === kind && now - r.t < 45 * DAY) { const k = r.c + ':' + r.a; cnt[k] = (cnt[k] || 0) + 1; }
  return Object.entries(cnt).filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k]) => { const [c, a] = k.split(':'); return { c, a: +a }; });
}

// ── состояние ──
const S = { amt: '', kind: 'e', month: monthStart(new Date()) };
const app = document.getElementById('app');
const h = (tag, attrs = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') for (const [sk, sv] of Object.entries(v)) sk.startsWith('--') ? el.style.setProperty(sk, sv) : (el.style[sk] = sv);
    else if (v != null && v !== false) el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c));
  return el;
};
const vibr = () => { try { navigator.vibrate && navigator.vibrate(8); } catch {} };

// ── экран ввода ──
const entry = h('div', { class: 'entry' });
const over = h('div', { class: 'over' });
app.append(entry, over);

function renderEntry() {
  const m = monthStart(new Date());
  const recs = db.recs.filter((r) => inMonth(r.t, m));
  const spent = recs.filter((r) => r.k === 'e').reduce((a, r) => a + r.a, 0);
  const left = db.budget ? db.budget - spent : null;
  entry.replaceChildren(
    h('div', { class: 'top' },
      parent !== window ? h('button', { class: 'back', onclick: () => parent.postMessage('money:close', '*'), 'aria-label': 'На главный экран' }, '‹') : null,
      h('button', { onclick: openOver, 'aria-label': 'Обзор месяца' }, MONTHS[m.getMonth()][0].toUpperCase() + MONTHS[m.getMonth()].slice(1) + ': ', h('b', { class: 'num' }, '−' + fmt(spent))),
      left != null ? h('button', { onclick: openOver }, 'остаток ', h('b', { class: 'num' + (left < 0 ? ' neg' : '') }, fmt(left))) : null,
      parent !== window ? h('button', { class: 'lockbtn', onclick: () => parent.postMessage('money:lock', '*'), 'aria-label': 'Код и отпечаток',
        html: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>' }) : null),
    h('div', { class: 'seg kindseg', role: 'tablist' },
      h('button', { class: S.kind === 'e' ? 'on' : '', onclick: () => setKind('e') }, 'Расход'),
      h('button', { class: S.kind === 'i' ? 'on' : '', onclick: () => setKind('i') }, 'Доход')),
    h('div', { class: 'quick' }, quickPairs(S.kind).map((p) =>
      h('button', { onclick: () => add(p.c, p.a) }, CATS[p.c].n, h('span', { class: 'num' }, fmt(p.a))))),
    h('div', { class: 'cats grid' },
      sortedCats(S.kind).map((id) => catBtn(id)),
      h('button', { class: 'cat more', onclick: newCat }, '+ Своя')));
}

// категория выбрана — снизу клавиатура для суммы
function keypad(c) {
  S.amt = '';
  const amt = h('div', { class: 'amt num empty', id: 'amt' });
  const draw = () => { const v = +S.amt || 0; amt.className = 'amt num' + (v ? '' : ' empty'); amt.replaceChildren((CATS[c].k === 'e' ? '−' : '+') + (v ? fmt(v) : '0'), h('span', { class: 'cur' }, CUR)); };
  const press = (k) => {
    vibr();
    if (k === '⌫') S.amt = S.amt.slice(0, -1);
    else if (S.amt.length + k.length <= 12 && !(S.amt === '' && k[0] === '0')) S.amt += k;
    draw();
  };
  const ok = () => { if (!+S.amt) return shake(); w.remove(); S.pad = null; add(c, +S.amt); };
  draw();
  const w = sheet(null, [
    h('div', { class: 'padhead', style: { '--c': CATS[c].c } },
      h('span', { class: 'padcat' }, CATS[c].n),
      h('button', { class: 'link', onclick: () => { w.remove(); S.pad = null; detailSheet(c); } }, 'Заметка, дата')),
    amt,
    h('div', { class: 'keys num' },
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', '⌫'].map((k) =>
        h('button', { class: k === '000' || k === '⌫' ? 'k-sm' : '', onclick: () => press(k), 'aria-label': k === '⌫' ? 'Стереть' : k }, k))),
    h('button', { class: 'btn main save', onclick: ok }, 'Сохранить')]);
  S.pad = { press, ok, close: () => { w.remove(); S.pad = null; } };
  w.querySelector('.bg').addEventListener('click', () => { S.pad = null; });
}

function catBtn(id, cls = 'cat', after) {
  const c = CATS[id];
  const b = h('button', { class: cls, style: { '--c': c.c } }, c.n);
  holdable(b, () => { after && after(); detailSheet(id); }, () => { after && after(); keypad(id); });
  return b;
}

// касание — сохранить, удержание — с заметкой и датой
function holdable(el, onHold, onTap) {
  let timer, held = false, x0, y0;
  el.addEventListener('pointerdown', (e) => { held = false; x0 = e.clientX; y0 = e.clientY; timer = setTimeout(() => { held = true; vibr(); onHold(); }, 450); });
  el.addEventListener('pointermove', (e) => { if (Math.hypot(e.clientX - x0, e.clientY - y0) > 10) clearTimeout(timer); });
  el.addEventListener('pointerup', () => clearTimeout(timer));
  el.addEventListener('pointercancel', () => clearTimeout(timer));
  el.addEventListener('contextmenu', (e) => e.preventDefault());
  el.addEventListener('click', () => { if (!held) onTap(); });
}

function setKind(k) { S.kind = k; renderEntry(); }
function shake() { const a = document.getElementById('amt'); if (!a) return; a.classList.remove('shake'); void a.offsetWidth; a.classList.add('shake'); }

function add(c, amount, extra = {}) {
  const a = amount ?? +S.amt;
  if (!a) { shake(); return; }
  const r = { id: uid(), t: extra.t ?? Date.now(), k: CATS[c].k, c, a, n: extra.n || '' };
  db.recs.push(r); save(); vibr();
  S.amt = ''; S.kind = 'e';
  renderEntry(); if (over.classList.contains('open')) renderOver();
  toast(`${CATS[c].n} ${signed(r)}`, () => { db.recs = db.recs.filter((x) => x.id !== r.id); save(); renderEntry(); renderOver(); });
}

// ── шторки ──
function sheet(title, body) {
  const w = h('div', { class: 'wrap' }, h('div', { class: 'bg', onclick: () => w.remove() }),
    h('div', { class: 'sheet', role: 'dialog' }, h('div', { class: 'grab' }), title ? h('h2', {}, title) : null, body));
  app.append(w);
  return w;
}
function closeSheets() { app.querySelectorAll('.wrap').forEach((w) => w.remove()); S.pad = null; }

function newCat() {
  const inp = h('input', { type: 'text', placeholder: S.kind === 'e' ? 'Например: Кофе' : 'Например: Уроки', maxlength: 24 });
  const done = () => {
    const n = inp.value.trim(); if (!n) return inp.focus();
    const c = { id: 'u' + uid(), n, k: S.kind, c: HUES[(db.custom || []).length % HUES.length] };
    db.custom = [...(db.custom || []), c]; addCustom(c); save(); w.remove(); renderEntry(); keypad(c.id);
  };
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') done(); });
  const w = sheet(S.kind === 'e' ? 'Своя категория расхода' : 'Своя категория дохода', [h('label', { class: 'f' }, h('span', {}, 'Название'), inp),
    h('div', { class: 'btns' }, h('button', { class: 'btn main', onclick: done }, 'Добавить'))]);
  setTimeout(() => inp.focus(), 250);
}

function allCats() {
  const list = (S.kind === 'e' ? EXP : INC).map(([id]) => id);
  const w = sheet(S.kind === 'e' ? 'Расход' : 'Доход', h('div', { class: 'allcats' }, list.map((id) => catBtn(id, 'cat', () => w.remove()))));
}

function detailSheet(c, rec) {
  const r = rec || { k: CATS[c].k, c, a: +S.amt || 0, n: '', t: Date.now() };
  let cat = r.c, kind = r.k;
  const amtIn = h('input', { type: 'text', inputmode: 'numeric', value: r.a ? fmt(r.a) : '', placeholder: '0' });
  amtIn.addEventListener('input', () => { const v = amtIn.value.replace(/\D/g, '').slice(0, 12); amtIn.value = v ? fmt(+v) : ''; });
  const noteIn = h('input', { type: 'text', value: r.n || '', placeholder: 'Необязательно' });
  const dateIn = h('input', { type: 'date', value: ymd(new Date(r.t)) });
  const grid = h('div', { class: 'allcats', style: { marginBottom: '14px' } });
  const seg = h('div', { class: 'seg', style: { marginBottom: '12px' } });
  const draw = () => {
    seg.replaceChildren(...[['e', 'Расход'], ['i', 'Доход']].map(([k, n]) => h('button', { class: kind === k ? 'on' : '', onclick: () => { kind = k; if (CATS[cat].k !== k) cat = sortedCats(k)[0]; draw(); } }, n)));
    grid.replaceChildren(...Object.values(CATS).filter((x) => x.k === kind).map(({ id }) => h('button', { class: 'cat' + (id === cat ? ' on' : ''), style: { '--c': CATS[id].c }, onclick: () => { cat = id; draw(); } }, CATS[id].n)));
  };
  draw();
  const done = () => {
    const a = +amtIn.value.replace(/\D/g, '');
    if (!a) { amtIn.focus(); return; }
    const [y, mo, d] = dateIn.value.split('-').map(Number);
    const old = new Date(r.t), t = new Date(y, mo - 1, d, old.getHours(), old.getMinutes()).getTime();
    w.remove();
    if (rec) { Object.assign(rec, { a, c: cat, k: kind, n: noteIn.value.trim(), t }); save(); renderOver(); renderEntry(); toast('Изменено'); }
    else add(cat, a, { n: noteIn.value.trim(), t });
  };
  const w = sheet(rec ? 'Запись' : CATS[c].n, [
    h('label', { class: 'f' }, h('span', {}, 'Сумма, ' + CUR), amtIn),
    seg, grid,
    h('label', { class: 'f' }, h('span', {}, 'Заметка'), noteIn),
    h('label', { class: 'f' }, h('span', {}, 'Дата'), dateIn),
    h('div', { class: 'btns' },
      rec ? h('button', { class: 'btn del', onclick: () => { w.remove(); remove(rec); } }, 'Удалить') : null,
      h('button', { class: 'btn main', onclick: done }, 'Сохранить'))]);
  if (!r.a) setTimeout(() => amtIn.focus(), 250);
}

let toastEl, toastTimer;
function toast(text, undo) {
  toastEl && toastEl.remove(); clearTimeout(toastTimer);
  toastEl = h('div', { class: 'toast', role: 'status' }, h('span', { class: 'num' }, text),
    undo ? h('button', { onclick: () => { undo(); toastEl.remove(); } }, 'Отменить') : null);
  app.append(toastEl);
  toastTimer = setTimeout(() => toastEl && toastEl.remove(), 4000);
}

function remove(rec) {
  db.recs = db.recs.filter((x) => x.id !== rec.id); save(); renderOver(); renderEntry();
  toast(`Удалено: ${CATS[rec.c].n} ${signed(rec)}`, () => { db.recs.push(rec); save(); renderOver(); renderEntry(); });
}

// ── обзор месяца ──
function openOver() { S.month = monthStart(new Date()); renderOver(); over.classList.add('open'); }
function closeOver() { over.classList.remove('open'); }
function shiftMonth(n) { S.month = new Date(S.month.getFullYear(), S.month.getMonth() + n, 1); renderOver(); }

function monthTotals(m) {
  let e = 0, i = 0;
  for (const r of db.recs) if (inMonth(r.t, m)) r.k === 'e' ? (e += r.a) : (i += r.a);
  return { e, i, b: i - e };
}

function renderOver() {
  const m = S.month, t = monthTotals(m);
  const recs = db.recs.filter((r) => inMonth(r.t, m)).sort((a, b) => b.t - a.t);
  const thisMonth = +m === +monthStart(new Date());
  const days = [];
  for (const r of recs) { const k = ymd(new Date(r.t)); if (!days.length || days.at(-1).k !== k) days.push({ k, d: new Date(r.t), rs: [] }); days.at(-1).rs.push(r); }
  const head = h('div', { class: 'ohead' },
    h('div', { class: 'mrow' },
      h('button', { onclick: () => shiftMonth(-1), 'aria-label': 'Прошлый месяц' }, '‹'),
      h('h1', {}, MONTHS[m.getMonth()][0].toUpperCase() + MONTHS[m.getMonth()].slice(1) + (m.getFullYear() !== new Date().getFullYear() ? ' ' + m.getFullYear() : '')),
      h('button', { onclick: () => shiftMonth(1), 'aria-label': 'Следующий месяц', disabled: thisMonth, style: { opacity: thisMonth ? .25 : 1 } }, '›')),
    h('div', { class: 'totals num', onclick: () => stats('months'), title: 'Месяцы и категории' },
      h('div', {}, 'Расходы', h('b', {}, fmt(t.e))),
      h('div', {}, 'Доходы', h('b', {}, fmt(t.i))),
      h('div', {}, 'Остаток', h('b', { class: t.b < 0 ? 'neg' : '' }, fmt(t.b)))),
    db.budget ? h('div', { class: 'budget num', onclick: budgetSheet },
      `Бюджет ${fmt(db.budget)} · ${t.e <= db.budget ? 'осталось ' + fmt(db.budget - t.e) : 'сверх ' + fmt(t.e - db.budget)}`,
      h('div', { class: 'bar' }, h('i', { class: t.e > db.budget ? 'over' : '', style: { width: Math.min(100, t.e / db.budget * 100) + '%' } })))
      : h('button', { class: 'link', onclick: budgetSheet }, 'Задать бюджет месяца'));
  swipeX(head, (dir) => { if (dir > 0) shiftMonth(-1); else if (!thisMonth) shiftMonth(1); });
  const list = h('div', { class: 'list' }, days.length ? days.map((d) => {
    const de = d.rs.filter((r) => r.k === 'e').reduce((a, r) => a + r.a, 0), di = d.rs.filter((r) => r.k === 'i').reduce((a, r) => a + r.a, 0);
    return [h('div', { class: 'day num' }, h('span', {}, `${d.d.getDate()} ${MON_S[d.d.getMonth()]} · ${WD[d.d.getDay()]}`),
      h('span', {}, [di ? '+' + fmt(di) : '', de ? '−' + fmt(de) : ''].filter(Boolean).join('  '))),
      d.rs.map(row)];
  }) : h('div', { class: 'empty-m' }, 'Записей за месяц нет'));
  over.replaceChildren(head, list,
    h('button', { class: 'fab', onclick: closeOver, 'aria-label': 'Новая запись' }, '+'));
}

function row(r) {
  const c = CATS[r.c] || CATS.other;
  const d = new Date(r.t);
  const el = h('div', { class: 'row', style: { '--c': c.c } }, h('i', { class: 'dot' }),
    h('div', { class: 'nm' }, c.n, h('small', {}, [String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'), r.n].filter(Boolean).join(' · '))),
    h('div', { class: 'sum num ' + (r.k === 'i' ? 'pos' : '') }, signed(r)));
  const wrap = h('div', { class: 'rowwrap' }, el);
  // смахнуть влево — удалить, касание — изменить
  let x0 = null, y0, dx = 0, lock = null;
  el.addEventListener('pointerdown', (e) => { x0 = e.clientX; y0 = e.clientY; dx = 0; lock = null; });
  el.addEventListener('pointermove', (e) => {
    if (x0 == null) return;
    const mx = e.clientX - x0, my = e.clientY - y0;
    if (!lock && Math.hypot(mx, my) > 8) lock = Math.abs(mx) > Math.abs(my) ? 'x' : 'y';
    if (lock === 'x') { dx = Math.min(0, mx); el.style.transform = `translateX(${dx}px)`; el.setPointerCapture(e.pointerId); }
  });
  const end = () => {
    if (x0 == null) return;
    if (lock === 'x' && dx < -100) { el.style.transition = 'transform .18s'; el.style.transform = 'translateX(-100%)'; setTimeout(() => remove(r), 170); }
    else { el.style.transition = 'transform .2s'; el.style.transform = ''; setTimeout(() => (el.style.transition = ''), 200); if (!lock) detailSheet(r.c, r); }
    x0 = null;
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', () => { x0 = null; el.style.transform = ''; });
  return wrap;
}

function swipeX(el, cb) {
  let x0 = null, y0;
  el.addEventListener('pointerdown', (e) => { x0 = e.clientX; y0 = e.clientY; });
  el.addEventListener('pointerup', (e) => {
    if (x0 == null) return;
    const dx = e.clientX - x0, dy = e.clientY - y0; x0 = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) cb(Math.sign(dx));
  });
}

function budgetSheet() {
  const inp = h('input', { type: 'text', inputmode: 'numeric', value: db.budget ? fmt(db.budget) : '', placeholder: 'Без бюджета' });
  inp.addEventListener('input', () => { const v = inp.value.replace(/\D/g, '').slice(0, 12); inp.value = v ? fmt(+v) : ''; });
  const w = sheet('Бюджет месяца', [h('label', { class: 'f' }, h('span', {}, 'Расходы за месяц, не больше, ' + CUR), inp),
    h('div', { class: 'btns' },
      db.budget ? h('button', { class: 'btn', onclick: () => { db.budget = 0; save(); w.remove(); renderOver(); renderEntry(); } }, 'Убрать') : null,
      h('button', { class: 'btn main', onclick: () => { db.budget = +inp.value.replace(/\D/g, '') || 0; save(); w.remove(); renderOver(); renderEntry(); } }, 'Сохранить'))]);
  setTimeout(() => inp.focus(), 250);
}

// ── месяцы, категории, календарь ──
function stats(tab, kind = 'e') {
  closeSheets();
  const m = S.month;
  const mname = MONTHS[m.getMonth()];
  const tabs = h('div', { class: 'seg tabs' }, [['months', 'Месяцы'], ['cats', 'Категории'], ['cal', 'Календарь']].map(([id, n]) =>
    h('button', { class: tab === id ? 'on' : '', onclick: () => stats(id, kind) }, n)));
  let body;
  if (tab === 'months') {
    const keys = [...new Set(db.recs.map((r) => { const d = new Date(r.t); return d.getFullYear() * 12 + d.getMonth(); }))].sort((a, b) => b - a);
    let yr = null; const rows = [];
    for (const k of keys) {
      const mm = new Date(Math.floor(k / 12), k % 12, 1), t = monthTotals(mm);
      if (mm.getFullYear() !== yr) { yr = mm.getFullYear(); rows.push(h('tr', { class: 'yr' }, h('td', { colspan: 4 }, String(yr)))); }
      rows.push(h('tr', { onclick: () => { S.month = mm; renderOver(); closeSheets(); }, style: { cursor: 'pointer' } },
        h('td', {}, MON_S[mm.getMonth()]), h('td', {}, fmt(t.e)), h('td', {}, fmt(t.i)), h('td', { class: t.b < 0 ? 'neg' : 'pos' }, fmt(t.b))));
    }
    const all = db.recs.reduce((a, r) => (r.k === 'e' ? (a.e += r.a) : (a.i += r.a), a), { e: 0, i: 0 });
    body = [h('table', { class: 'tbl num' }, h('tr', {}, h('th', {}, 'Месяц'), h('th', {}, 'Расходы'), h('th', {}, 'Доходы'), h('th', {}, 'Остаток')), rows),
      h('div', { class: 'hint num' }, `За всё время: расходы ${fmt(all.e)} · доходы ${fmt(all.i)} · остаток ${fmt(all.i - all.e)}`)];
  } else if (tab === 'cats') {
    const sums = {};
    for (const r of db.recs) if (r.k === kind && inMonth(r.t, m)) sums[r.c] = (sums[r.c] || 0) + r.a;
    const total = Object.values(sums).reduce((a, b) => a + b, 0);
    const list = Object.entries(sums).sort((a, b) => b[1] - a[1]);
    body = [h('div', { class: 'seg', style: { marginBottom: '16px' } },
      h('button', { class: kind === 'e' ? 'on' : '', onclick: () => stats('cats', 'e') }, 'Расходы'),
      h('button', { class: kind === 'i' ? 'on' : '', onclick: () => stats('cats', 'i') }, 'Доходы')),
      list.length ? list.map(([c, s]) => h('div', { class: 'cb num', style: { '--c': CATS[c].c } },
        h('div', { class: 't' }, h('span', {}, CATS[c].n), h('span', {}, `${fmt(s)} · ${Math.round(s / total * 100)} %`)),
        h('div', { class: 'bar' }, h('i', { style: { width: (s / list[0][1] * 100) + '%' } }))))
        : h('div', { class: 'empty-m' }, 'Нет записей'),
      h('div', { class: 'hint num' }, `${mname}: всего ${fmt(total)}`)];
  } else {
    const first = new Date(m.getFullYear(), m.getMonth(), 1), n = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    const off = (first.getDay() + 6) % 7, per = {};
    for (const r of db.recs) if (inMonth(r.t, m)) { const d = new Date(r.t).getDate(); per[d] = per[d] || { e: 0, i: 0 }; per[d][r.k] += r.a; }
    const short = (v) => v >= 1e6 ? (v / 1e6).toFixed(1).replace('.', ',') + ' млн' : v >= 1000 ? Math.round(v / 1000) + ' т' : String(v);
    const today = new Date();
    body = [h('div', { class: 'cal num' }, ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'].map((d) => h('div', { class: 'wd' }, d)),
      Array.from({ length: off }, () => h('div', {})),
      Array.from({ length: n }, (_, i) => {
        const d = i + 1, p = per[d];
        const isToday = today.getDate() === d && inMonth(today, m);
        return h('div', { class: 'd' + (p ? ' has' : '') + (isToday ? ' today' : ''), onclick: p ? () => dayList(new Date(m.getFullYear(), m.getMonth(), d)) : null },
          h('b', {}, d), p && p.i ? h('span', { class: 'pos' }, '+' + short(p.i)) : null, p && p.e ? h('span', { class: 'neg' }, '−' + short(p.e)) : null);
      })), h('div', { class: 'hint' }, `${mname[0].toUpperCase() + mname.slice(1)} ${m.getFullYear()} · «т» — тысяч`)];
  }
  sheet(null, [tabs, body,
    h('div', { class: 'hint' }, h('button', { class: 'link', onclick: resetSample }, 'Вернуть пример'), ' · ',
      h('button', { class: 'link', onclick: clearAll }, 'Очистить всё'))]);
}

function dayList(d) {
  const rs = db.recs.filter((r) => ymd(new Date(r.t)) === ymd(d)).sort((a, b) => b.t - a.t);
  closeSheets();
  sheet(`${d.getDate()} ${MON_S[d.getMonth()]} · ${WD[d.getDay()]}`, h('div', { style: { margin: '0 -16px' } }, rs.map(row)));
}

function resetSample() { if (!confirm('Заменить записи примером?')) return; db = { recs: sample(), budget: 4000000 }; save(); closeSheets(); renderOver(); renderEntry(); }
function clearAll() { if (!confirm('Удалить все записи?')) return; db = { recs: [], budget: 0 }; save(); closeSheets(); renderOver(); renderEntry(); }

// клавиатура компьютера
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'Escape') { window.__moneyBack(); return; }
  if (!S.pad) return;
  if (/^[0-9]$/.test(e.key)) S.pad.press(e.key);
  else if (e.key === 'Backspace') S.pad.press('⌫');
  else if (e.key === 'Enter') S.pad.ok();
});

// «Назад» из лаунчера (Android, Esc): шторка → обзор → закрыть «Деньги»
window.__moneyBack = () => {
  if (app.querySelector('.wrap')) { closeSheets(); S.pad = null; }
  else if (over.classList.contains('open')) closeOver();
  else parent.postMessage('money:close', '*');
};
window.__moneyFresh = () => { S.amt = ''; S.kind = 'e'; closeSheets(); closeOver(); renderEntry(); };

load();
renderEntry();
renderOver();
