// Главный экран Elachiston: статус, часы, дата, строка под датой, приложения, трекер (чтение и практика — мост с Melete),
// плеер, значки. Христианское (стих, литургический и библейский час, греческие слова, символы) — только в церковном режиме.
import { prefs, isChurch } from './data.js';
import { renderClock, clockKey, afterClockRender } from './clocks.js';
import { canonicalOf, GREEK_DAYS, greekNumeral, romanNumeral } from './numerals.js';
import { iconSVG, ORNAMENTS } from './icons.js';
import { SLOT_HEIGHT } from './wallpapers.js';
import { verseOfDay, verseText } from './scripture.js';
import { biblicalTime, placeOf } from './sun.js';
import { homeItems, dockSlots, appOf, apps } from './apps.js';
import { openApp, runAction } from './actions.js';
import { explain, canonicalEntry, biblicalEntry, greekDayEntry } from './explain.js';
import { current, togglePlayback, nowPlaying, openMediaAccess, MEDIA_SESSIONS } from './nowplaying.js';
import { trackerData, fmtDur } from './tracker.js';
import { folderOfKey, folderName, folderApps } from './folders.js';
import { layout, homeOrder } from './layout.js';
import { walletBalance } from './wallet.js';
import { hasLock } from './lock.js';
import { isNative } from './native.js';
import { t, getLang } from './i18n.js';
import { h } from './ui.js';

let root;
let handlers = {};
let lastSig = null, lastTime = null, lastClock = null, lastDay = null;
let battery = null;

export const clockOpts = () => ({ hour12: prefs.hour12, lang: dateLang(), church: isChurch(), place: prefs.place });
export const dateLang = () => {
  const l = prefs.dateLang;
  if (l === 'el' && !isChurch()) return getLang();
  return ['ru', 'en', 'uz', 'el'].includes(l) ? l : getLang();
};
export const currentVerse = () => verseOfDay(new Date(), prefs.verseOffset);
const markerKind = () => (prefs.marker === 'auto' ? (isChurch() ? 'greek' : 'none') : prefs.marker);

export function mountHome(el, h0) {
  root = el;
  handlers = h0;
  navigator.getBattery?.().then((b) => {
    battery = b;
    b.addEventListener('levelchange', renderStatus);
    b.addEventListener('chargingchange', renderStatus);
    renderStatus();
  }).catch(() => {});
  addEventListener('online', renderStatus);
  addEventListener('offline', renderStatus);
  renderHome();
  tick();
}

function tick() {
  const now = new Date();
  updateClock(now);
  setTimeout(tick, 1000 - now.getMilliseconds() + 5);
}

function updateClock(now, force = false) {
  const opts = clockOpts();
  const tm = clockKey(now, opts);
  const sig = `${tm}|${prefs.clock}|${opts.lang}|${opts.church}`;
  if (!force && sig === lastSig) return;
  root.querySelectorAll('[data-live]').forEach((x) => { x.textContent = liveText(+x.dataset.live); });
  const el = root.querySelector('.clock');
  if (!el) return;
  const prev = !force && lastClock === prefs.clock ? lastTime : null;
  el.innerHTML = renderClock(prefs.clock, now, opts, prev);
  el.dataset.style = prefs.clock;
  // «Без часов» + живые обои: место остаётся, время показывают обои
  const slot = prefs.clock === 'none' ? SLOT_HEIGHT[prefs.wallpaper] : 0;
  el.style.height = slot ? `${slot}px` : '';
  el.parentElement.classList.toggle('empty', prefs.clock === 'none' && !slot);
  afterClockRender(el);
  fitClock(el);
  lastSig = sig; lastTime = tm; lastClock = prefs.clock;
  renderDate(now);
  const day = now.toDateString();
  if (day !== lastDay) { lastDay = day; renderSubline(); }
  // трекер — раз в минуту: новый день плана, новая неделя
  refreshTracker();
}

function renderStatus() {
  const el = root?.querySelector('.l-status');
  if (!el) return;
  el.hidden = !prefs.status;
  const online = navigator.onLine;
  const wifi = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="${online ? '' : 'off'}"><path d="M2.5 8.5a14 14 0 0 1 19 0L12 20z"/>${online ? '' : '<path d="M4 4l16 16"/>'}</svg>`;
  const level = battery ? battery.level : 1;
  const bat = `<svg viewBox="0 0 30 16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="1" y="1.5" width="24" height="13" rx="2.5" opacity=".45"/><rect x="3" y="3.5" width="${Math.max(1.5, 20 * level).toFixed(1)}" height="9" rx="1" fill="currentColor" stroke="none"/><path d="M28 6v4" stroke-linecap="round" opacity=".45"/></svg>`;
  el.setAttribute('aria-label', online ? t('status.online') : t('status.offline'));
  el.innerHTML = `${wifi}<i></i><span>${battery ? Math.round(battery.level * 100) + '%' : '—'}${battery?.charging ? ' ⚡︎' : ''}</span><i></i>${bat}`;
}

const LOCALES = { ru: 'ru-RU', en: 'en-GB', el: 'el-GR' };
// узбекских названий в браузерах часто нет (выходит «M10») — свои
const UZ_MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
const UZ_DAYS = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];
const weekdayOf = (now, lang) => (lang === 'uz' ? UZ_DAYS[now.getDay()] : new Intl.DateTimeFormat(LOCALES[lang] || 'ru-RU', { weekday: 'long' }).format(now));
const dayMonthOf = (now, lang) => (lang === 'uz' ? `${now.getDate()}-${UZ_MONTHS[now.getMonth()]}` : new Intl.DateTimeFormat(LOCALES[lang] || 'ru-RU', { day: 'numeric', month: 'long' }).format(now));

function renderDate(now) {
  const el = root.querySelector('.l-date');
  if (!el) return;
  const lang = dateLang();
  const wd = el.querySelector('.l-weekday');
  wd.replaceChildren(h('span', {}, weekdayOf(now, lang)));
  if (isChurch() && prefs.greekDay && lang !== 'el') {
    const day = now.getDay();
    wd.append(h('button', { class: 'l-echo', lang: 'el', 'aria-label': GREEK_DAYS[day], onclick: (e) => { e.stopPropagation(); explain(greekDayEntry(day)); } }, GREEK_DAYS[day]));
  }
  const big = el.querySelector('.l-daymonth');
  big.textContent = dayMonthOf(now, lang);
  big.lang = lang;
  fitText(big);
  // строка под часами: библейская часть суток или литургический час (церковный режим)
  const ch = root.querySelector('.l-hourline');
  if (!ch) return;
  ch.hidden = !isChurch() || (!prefs.hourLine && prefs.clock !== 'biblical');
  if (ch.hidden) return;
  if (prefs.clock === 'biblical') {
    const b = biblicalTime(now, placeOf(prefs));
    const r = (b.prayer || b.part).ref;
    ch.replaceChildren(h('span', {}, t('bib.' + b.part.key)), ` · ${b.prayer ? t('bib.pray.' + b.prayer.key) : r[getLang()] || r.ru}`);
    ch.onclick = (e) => { e.stopPropagation(); explain(biblicalEntry(biblicalTime(new Date(), placeOf(prefs)), placeOf(prefs))); };
  } else {
    const c = canonicalOf(now.getHours());
    ch.replaceChildren(h('span', { lang: 'el' }, c.el), ` · ${t('canon.' + c.id)}`);
    ch.onclick = (e) => { e.stopPropagation(); explain(canonicalEntry(new Date())); };
  }
}

// выбранный шрифт догрузился — дата могла стать шире строки
document.fonts?.addEventListener?.('loadingdone', () => { const b = root?.querySelector('.l-daymonth'); if (b) fitText(b); });

function fitText(el) {
  el.style.fontSize = '';
  const max = parseFloat(getComputedStyle(el).fontSize);
  const avail = el.parentElement.clientWidth;
  if (!avail) return;
  let size = max;
  while (el.scrollWidth > avail && size > 18) { size -= 2; el.style.fontSize = size + 'px'; }
}

// Кошелёк на главном: общий баланс (все доходы минус все расходы). С кодом кошелька — сумма скрыта точками,
// касание — замок и кошелёк. Нет записей — блока нет. Убирается в «Раскладке» (глаз)
function renderBalance() {
  const b = walletBalance();
  if (b == null) return h('div', { class: 'l-balance', hidden: true });
  const shut = hasLock();
  return h('button', { class: 'l-balance', onclick: (e) => { if (!e.currentTarget.dataset.suppress) handlers.onWallet(); }, 'aria-label': t('bal.title') },
    h('span', { class: 'l-bal-k' }, t('bal.title')),
    h('span', { class: 'l-bal-v' + (b < 0 && !shut ? ' neg' : '') }, shut ? '•••  •••' : fmtMoney(b)),
    h('span', { class: 'l-bal-c' }, t('bal.cur')));
}
const fmtMoney = (n) => (n < 0 ? '−' : '') + Math.abs(Math.round(n)).toLocaleString('ru-RU').replace(/\u00a0/g, ' ');

export function refreshBalance() {
  const el = root?.querySelector('.l-balance');
  if (!el) return;
  const fresh = renderBalance();
  fresh.style.cssText = el.style.cssText;
  el.replaceWith(fresh);
}

// тесный экран: список приложений не режется посередине строки — лишние строки прячутся целиком
// (они остаются во «Всех приложениях»; больше места — уменьшить размеры или скрыть блоки в «Раскладке»)
// часы шире колонки (крупный шрифт, узкий экран) — ужать ровно настолько, чтобы влезли
function fitClock(el) {
  el.style.zoom = '';
  const have = el.parentElement?.clientWidth || 0, need = el.scrollWidth;
  if (have && need > have + 1) el.style.zoom = String(Math.floor(have / need * 98) / 100);
}

export function fitApps() {
  const list = root?.querySelector('.l-apps');
  if (!list) return;
  const rows = [...list.querySelectorAll('.l-app')];
  rows.forEach((r) => { r.hidden = false; });
  // сколько места у списка вместе с пустым местом под ним (в px экрана — zoom уже учтён); строки — только целиком
  const spacer = root.querySelector('.l-spacer');
  const rect = list.getBoundingClientRect();
  const avail = rect.height + (spacer ? spacer.getBoundingClientRect().height : 0) + 0.5;
  let shown = 0;
  for (const r of rows) { if (r.getBoundingClientRect().bottom - rect.top > avail) break; shown++; }
  rows.forEach((r, i) => { r.hidden = i >= shown; });
  list.classList.toggle('clipped', shown < rows.length);
}
addEventListener('resize', () => fitApps());

// перерисовать блок Melete на месте (размер блока из раскладки сохраняется)
export function refreshTracker() {
  const tr = root?.querySelector('.l-tracker');
  if (!tr) return;
  const fresh = renderTracker() || h('div', { class: 'l-tracker', hidden: true });
  fresh.style.cssText = tr.style.cssText;
  tr.replaceWith(fresh);
}

export function renderSubline() {
  const el = root?.querySelector('.l-subline');
  if (!el) return;
  const mode = prefs.subline === 'verse' && !isChurch() ? 'none' : prefs.subline;
  el.hidden = mode === 'none' || (mode === 'note' && !prefs.note);
  el.replaceChildren();
  if (mode === 'verse') {
    const v = verseText(currentVerse(), getLang());
    el.append(h('span', { class: 'ref' }, v.ref), h('i'), h('span', { class: 'txt' }, v.text));
  } else if (mode === 'note') {
    el.append(h('span', { class: 'txt' }, prefs.note));
  }
}

function marker(i, key) {
  switch (markerKind()) {
    case 'greek': return greekNumeral(i + 1);
    case 'roman': return romanNumeral(i + 1);
    case 'count': return `×${prefs.usage[key] || 0}`;
    default: return '';
  }
}

export function renderHome() {
  if (!root) return;
  const church = isChurch();
  const orn = church ? ORNAMENTS[prefs.ornament] : null;
  const L = layout();
  root.className = `l-home align-${prefs.align} size-${prefs.size} dock-${L.dock}`;
  // блоки в порядке раскладки; размер блока — множитель к общему размеру (часы — к размеру часов)
  const make = {
    status: () => h('div', { class: 'l-status' }),
    clock: () => h('div', { class: 'clock-wrap', onclick: tapAction('clockTap') }, h('div', { class: 'clock' }), h('button', { class: 'l-hourline', hidden: true })),
    date: () => h('div', { class: 'l-date', onclick: tapAction('dateTap') }, h('div', { class: 'l-weekday' }), h('div', { class: 'l-daymonth' })),
    subline: () => h('button', { class: 'l-subline', onclick: (e) => { e.stopPropagation(); if (prefs.subline === 'verse') handlers.onVerse(); else handlers.onSettings(); } }),
    balance: renderBalance,
    apps: renderList,
    space: () => h('div', { class: 'l-spacer' }),
    tracker: renderTracker,
    player: () => h('div', { class: 'l-player', hidden: true }),
    dock: renderDock,
  };
  const sized = (id, el) => {
    if (!el) return el;
    const k = L.scale[id];
    if (k && k !== 100) el.style.setProperty(id === 'dock' ? '--l-blk' : 'zoom', id === 'clock' ? `calc(var(--l-ck, 1) * ${k / 100})` : id === 'dock' ? String(k / 100) : `calc(var(--l-ui, 1) * ${k / 100})`);
    return el;
  };
  const side = L.dock === 'left' || L.dock === 'right' ? sized('dock', renderDock()) : null;
  if (side) side.classList.add('side');
  root.replaceChildren(...[
    orn?.icon ? h('div', { class: `l-ornament orn-${prefs.ornament}`, 'aria-hidden': 'true', html: iconSVG(orn.icon) }) : null,
    ...homeOrder().map((id) => sized(id, make[id]())),
    side,
  ].filter(Boolean));
  lastSig = null;
  renderStatus();
  requestAnimationFrame(fitApps);
  updateClock(new Date(), true);
  renderSubline();
  renderPlayer();
}

// нажатие на часы и дату — действие жеста clockTap / dateTap
const tapAction = (id) => (e) => { if (!e.currentTarget.dataset.suppress) handlers.onGesture(id); };

function renderList() {
  const list = h('nav', { class: 'l-apps', 'aria-label': t('home.apps') });
  homeItems().forEach((item, i) => {
    const app = appOf(item.key);
    const fold = folderOfKey(item.key);
    const label = item.label || (fold ? folderName(fold) : app?.label) || t('act.gone');
    const btn = h('button', { class: 'l-app' + (fold ? ' folder' : ''), 'data-i': i, style: { '--d': `${i * 55}ms` } },
      h('span', { class: 'label' }, label),
      fold ? h('span', { class: 'l-fold-n', 'aria-label': t('fold.n', { n: folderApps(fold).length }) }, String(folderApps(fold).length)) : null,
      markerKind() !== 'none' ? h('span', { class: 'mark', 'aria-hidden': 'true' }, marker(i, item.key)) : null);
    btn.addEventListener('click', () => {
      if (btn.dataset.suppress) return;
      btn.classList.add('pressed');
      setTimeout(() => btn.classList.remove('pressed'), 500);
      if (fold) handlers.onFolder(fold.id); else openApp(app);
    });
    btn.longPress = () => handlers.onAppHold(i);
    list.append(btn);
  });
  if (!homeItems().length) list.append(h('p', { class: 'l-empty' }, t('home.empty')));
  return list;
}

function renderDock() {
  const slots = dockSlots();
  if (prefs.dockStyle === 'none' || !slots.length) return h('div', { class: 'l-dock-gap' });
  const dock = h('div', { class: `l-dock ${prefs.dockStyle === 'line' ? 'line' : ''}` });
  slots.forEach((slot, i) => {
    const b = h('button', { class: 'l-dock-btn', 'aria-label': handlers.describe(slot.action), html: iconSVG(slot.icon) });
    b.addEventListener('click', () => { if (!b.dataset.suppress) runAction(slot.action, apps); });
    b.longPress = () => handlers.onDockHold(i);
    dock.append(b);
  });
  return dock;
}

// — Строка плеера —
const PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l10.5-6.5z"/></svg>';
const PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="5.5" width="3.4" height="13" rx="1"/><rect x="13.6" y="5.5" width="3.4" height="13" rx="1"/></svg>';

export function renderPlayer() {
  const el = root?.querySelector('.l-player');
  if (!el) return;
  el.replaceChildren();
  const c = prefs.player && isNative() && MEDIA_SESSIONS ? current() : null;
  if (!c) {
    // доступа к медиасессиям нет — одна тихая строка-приглашение (пока строка плеера включена)
    const ask = prefs.player && isNative() && MEDIA_SESSIONS && nowPlaying().access === false;
    el.hidden = !ask;
    if (ask) el.append(h('button', { class: 'l-pl-info l-pl-ask', onclick: openMediaAccess }, h('span', {}, t('player.ask'))));
    return;
  }
  el.hidden = false;
  el.append(
    h('button', { class: `l-pl-btn ${c.playing ? 'on' : ''}`, 'aria-label': c.playing ? t('player.pause') : t('player.play'), html: c.playing ? PAUSE : PLAY, onclick: () => togglePlayback() }),
    h('button', { class: 'l-pl-info', onclick: () => c.pkg && openApp({ key: c.pkg, pkg: c.pkg, label: c.app }) },
      h('span', { class: 'l-pl-t' }, c.title || c.app), c.app && c.title ? h('small', {}, c.app) : null));
}

// — Melete на главном: идёт занятие, неделя практики (по дням), чтение дня —
function renderTracker() {
  const d = prefs.tracker ? trackerData() : null;
  if (!d) return null; // мост с Melete не подключён — блока нет
  // касание — сразу в нужный экран Melete: плашка — занятие (или свободная практика), неделя — свободная практика,
  // чтение — Библия на чтении дня (docs/launcher-bridge.md)
  const go = (route) => (e) => { if (!e.currentTarget.dataset.suppress) handlers.onMelete(route); };
  const wrap = h('div', { class: 'l-tracker' + (d.demo ? ' demo' : '') });
  const hold = (el) => { el.longPress = () => handlers.onSettings('tracker'); return el; };
  if (d.live) {
    const lv = d.live;
    const ctl = h('button', { class: 'l-tr-ctl', 'aria-label': lv.playing ? t('tr.pause') : t('tr.play'), html: lv.playing ? PAUSE : PLAY,
      onclick: (e) => { e.stopPropagation(); handlers.onMeleteControl('toggle'); if (d.demo) setTimeout(refreshTracker, 30); } });
    wrap.append(hold(h('div', { class: 'l-tr-live' + (lv.playing ? ' on' : '') },
      h('button', { class: 'l-tr-open', onclick: go(lv.session ? 'session' : 'free') },
        h('i', { class: 'l-tr-pulse', 'aria-hidden': 'true' }),
        h('span', { class: 'l-tr-lk' }, lv.session ? t('tr.live') : t('tr.playing')),
        h('span', { class: 'l-tr-lt' }, lv.what || lv.title || ''),
        lv.start ? h('span', { class: 'l-tr-lm', 'data-live': lv.start }, liveText(lv.start)) : null),
      ctl)));
  }
  const p = d.practice;
  const max = p ? Math.max(...p.per, p.goal / 7, 1) : 1;
  const today = (new Date().getDay() + 6) % 7;
  if (p) wrap.append(hold(h('button', { class: 'l-tr-week', onclick: go('free') },
    h('span', { class: 'l-tr-k' }, t('tr.week')),
    h('span', { class: 'l-tr-v' }, fmtDur(p.total, t), h('small', {}, ' ' + t('tr.ofGoal', { goal: fmtDur(p.goal, t) }).replace(/ · .*$/, ''))),
    h('span', { class: 'l-tr-days', 'aria-hidden': 'true' }, p.per.map((v, i) =>
      h('i', { class: (i === today ? 'today' : '') + (i > today ? ' future' : '') }, h('u', { style: { height: `${Math.max(v ? 12 : 0, Math.round(v / max * 100))}%` } })))),
    h('i', { class: 'l-tr-bar', 'aria-hidden': 'true' }, h('u', { style: { width: `${Math.min(100, p.progress * 100).toFixed(0)}%` } })))));
  const rd = d.reading;
  if (rd) {
    const v = rd.none ? t('tr.noPlan') : rd.idle ? t('tr.idle') : rd.ref;
    const m = rd.ref ? t('tr.readDay', { done: rd.done, total: rd.total, day: rd.day }) : '';
    wrap.append(hold(h('button', { class: 'l-tr-row', onclick: go('bible') },
      h('span', { class: 'l-tr-k' }, t('tr.reading')), h('span', { class: 'l-tr-v' }, v), h('span', { class: 'l-tr-m' }, m),
      rd.ref ? h('i', { class: 'l-tr-bar', 'aria-hidden': 'true' }, h('u', { style: { width: `${rd.total ? Math.round(rd.done / rd.total * 100) : 0}%` } })) : null)));
  }
  if (d.demo) wrap.append(h('small', { class: 'l-tr-note' }, t('tr.demo')));
  return wrap;
}

// идёт 24 мин / 1:05
function liveText(start) {
  const m = Math.max(0, Math.floor((Date.now() - start) / 60e3));
  return m < 60 ? t('dur.m', { m }) : `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
}
