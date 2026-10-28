// Аккордовая панель (переделка студии 28.10.2026, по просьбе автора: «не нажимать каждый раз плюс, аккорд, мажор,
// минор — наиграть»). Крупные плитки аккордов тональности (ступени I…vii и одна частая чужая: в мажоре ♭VII, в
// миноре мажорная V), «—» — тишина. Касание плитки — аккорд звучит и держится до следующего касания (как на пэдах);
// жест по плитке, не отпуская: вверх — септаккорд, вниз — мажор ↔ минор, влево — sus2, вправо — sus4 (подпись меняется
// на ходу). Запись (● в шапке): отсчёт, затем один проход куска — аккорд ложится с доли касания (к сетке) и тянется до
// следующего; сыгранное заменяет написанное под ним; в конце прохода запись выключается сама, кусок играет дальше.
// Без зависимости от модуля: получает проект и обратные вызовы.
import { diatonicChords, chordNotes, chordName, setChord } from '../../music/project.js';

const SWIPE = 22; // пикселей до варианта
const SEV = { maj: 'maj7', min: 'm7', dim: 'm7b5', aug: '7', sus2: '7', sus4: '7' };
const FLIP = { maj: 'min', min: 'maj', dim: 'min', aug: 'maj', '7': 'm7', maj7: 'm7', m7: '7', m7b5: 'm7', sus2: 'min', sus4: 'maj' };

// Плитки тональности: 7 ступеней + одна частая чужая
export function padChords(key) {
  const dia = diatonicChords(key, false), sev = diatonicChords(key, true);
  const extra = key.minor ? { pc: (key.pc + 7) % 12, type: 'maj', rn: 'V' } : { pc: (key.pc + 10) % 12, type: 'maj', rn: '♭VII' };
  return [...dia.map((c, i) => ({ pc: c.pc, type: c.type, rn: c.rn, sev: sev[i].type })), { ...extra, sev: '7' }];
}
// Вариант аккорда по направлению жеста
export function variant(ch, dir) {
  if (dir === 'up') return { pc: ch.pc, type: ch.sev && ch.sev !== ch.type ? ch.sev : SEV[ch.type] || '7' };
  if (dir === 'down') return { pc: ch.pc, type: FLIP[ch.type] || 'maj' };
  if (dir === 'left') return { pc: ch.pc, type: 'sus2' };
  if (dir === 'right') return { pc: ch.pc, type: 'sus4' };
  return { pc: ch.pc, type: ch.type };
}

export function padHTML(ctx, p, tr, { bars, grid, rec }) {
  const { t, ui } = ctx, list = padChords(p.key);
  const tile = (c, i) => '<button class="cptile" data-cp="' + i + '" style="--c:' + tr.color + '"><small>' + ui.esc(c.rn) + '</small><b>' + ui.esc(chordName(c.pc, c.type, p.key.minor)) + '</b></button>';
  return '<div class="cpwrap' + (rec ? ' rec' : '') + '" style="--c:' + tr.color + '">' +
    '<div class="cpbar">' + ui.seg('cpbars', [4, 8, 16, 32].map((n) => [String(n), String(n)]), String(bars), t('cp.bars')) +
    ui.seg('cpgrid', [['1', '♩'], ['2', '½'], [String(p.num), t('ch.bar')]], String(grid), t('cp.grid')) + '</div>' +
    '<div class="cpgrid">' + list.map(tile).join('') + '<button class="cptile rest" data-cp="rest" aria-label="' + ui.esc(t('cp.rest')) + '"><b>—</b></button></div>' +
    '<p class="cphint">' + ui.esc(t(rec ? 'cp.recHint' : 'cp.hint')) + '</p></div>';
}

// get() → { p, tr, d (кусок), total (долей в куске), grid, rec, pos() → доля в куске или −1 (отсчёт) }
// on: { notesOn(m) → key, notesOff(key), change(), recDone() }
export function padBind(host, get, on) {
  const box = host.querySelector('.cpgrid');
  if (!box) return () => {};
  const list = () => padChords(get().p.key);
  let sounding = [], open = null, last = -1; // open — записываемый аккорд { t, pc, type }
  const label = (el, ch) => { const b = el.querySelector('b'); if (b) b.textContent = chordName(ch.pc, ch.type, get().p.key.minor); };
  const silence = () => { sounding.forEach((k) => on.notesOff(k)); sounding = []; };
  const sound = (ch) => { silence(); const { tr } = get(), base = 48 + 12 * (tr.oct || 0); sounding = chordNotes(ch.pc, ch.type).map((m) => on.notesOn(base + m)); };
  const snap = (b, g) => Math.round(b / g) * g;
  // записать аккорд с доли касания; прежний открытый — закрыт на ней же
  const write = (ch) => {
    const { d, total, grid, rec, pos } = get(), b = pos();
    if (!rec || b < 0) return;
    const t0 = Math.min(total - grid, Math.max(0, snap(b, grid)));
    if (open && t0 > open.t) setChord(d, open.t, t0 - open.t, open.pc, open.type);
    open = ch ? { t: t0, pc: ch.pc, type: ch.type } : null;
    if (open) setChord(d, t0, grid, ch.pc, ch.type);
    last = b;
    on.change();
  };
  let drag = null;
  const down = (e) => {
    const el = e.target.closest('[data-cp]'); if (!el) return;
    e.preventDefault();
    try { box.setPointerCapture(e.pointerId); } catch { /* */ }
    if (el.dataset.cp === 'rest') { silence(); write(null); el.classList.add('down'); setTimeout(() => el.classList.remove('down'), 140); return; }
    const base = list()[+el.dataset.cp];
    drag = { el, base, ch: base, x: e.clientX, y: e.clientY, id: e.pointerId };
    box.querySelectorAll('.cptile.on').forEach((x) => x.classList.remove('on'));
    el.classList.add('down', 'on');
    sound(base); write(base);
  };
  const move = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    const dir = Math.hypot(dx, dy) < SWIPE ? null : Math.abs(dy) >= Math.abs(dx) ? (dy < 0 ? 'up' : 'down') : dx < 0 ? 'left' : 'right';
    const ch = { ...variant(drag.base, dir), rn: drag.base.rn, sev: drag.base.sev };
    if (ch.type === drag.ch.type) return;
    drag.ch = ch; label(drag.el, ch);
    sound(ch);
    if (open && get().rec) { open.type = ch.type; setChord(get().d, open.t, Math.max(get().grid, last - open.t), ch.pc, ch.type); on.change(); } // вариант — тот же аккорд, без нового места
  };
  const up = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag.el.classList.remove('down');
    const el = drag.el, base = drag.base; drag = null;
    setTimeout(() => label(el, base), 600); // подпись — обратно к ступени (звучит вариант, пока не сменят)
  };
  box.addEventListener('pointerdown', down); box.addEventListener('pointermove', move); box.addEventListener('pointerup', up); box.addEventListener('pointercancel', up);
  box.addEventListener('contextmenu', (e) => e.preventDefault());
  // Ход (кадр): открытый аккорд растёт до текущей доли; конец прохода — закрыть до конца куска и выключить запись
  const tick = () => {
    const { d, total, grid, rec, pos } = get();
    if (!rec) { open = null; last = -1; return; }
    const b = pos();
    if (b < 0) return;
    if (last >= 0 && b < last - grid) { // круг замкнулся — проход записан
      if (open) setChord(d, open.t, total - open.t, open.pc, open.type);
      open = null; last = -1; on.change(); on.recDone();
      return;
    }
    if (open) { const len = Math.min(total - open.t, Math.max(grid, Math.ceil((b - open.t) / grid) * grid)); if (len > 0) setChord(d, open.t, len, open.pc, open.type); }
    last = b;
  };
  const off = () => { silence(); box.removeEventListener('pointerdown', down); box.removeEventListener('pointermove', move); box.removeEventListener('pointerup', up); box.removeEventListener('pointercancel', up); };
  off.tick = tick;
  off.silence = silence;
  return off;
}
