// Главный экран Elachiston (DECISIONS 2026-10-28 — минимальный): своя строка состояния (сеть и батарея), часы, дата,
// Melete (практика и чтение дня — мост с Melete), баланс кошелька, до 7 приложений и папок, ряд маленьких значков.
// Крест — единственное украшение, только в церковном режиме (cross.js).
import { prefs, isChurch, HOME_MAX } from './data.js';
import { iconSVG } from './icons.js';
import { crossSVG } from './cross.js';
import { homeItems, dockSlots, appOf, apps } from './apps.js';
import { openApp, runAction } from './actions.js';
import { trackerData, fmtDur } from './tracker.js';
import { folderOfKey, folderName, folderApps } from './folders.js';
import { layout, homeOrder } from './layout.js';
import { walletBalance } from './wallet.js';
import { hasLock } from './lock.js';
import { t, getLang } from './i18n.js';
import { h } from './ui.js';
import { isNative, Launcher } from './native.js';

let root;
let handlers = {};
let lastSig = null;
let battery = null;
let sys = null; // Android: { battery, charging, net: wifi|cell|other|none, wifi: 0–4, cell: 0–4 } — из системы (LauncherPlugin.status)
const askStatus = () => Launcher.status().then((x) => { sys = x; renderStatus(); }).catch(() => {});

export function mountHome(el, h0) {
  root = el;
  handlers = h0;
  if (isNative()) {
    askStatus();
    Launcher.addListener?.('status', (x) => { sys = x; renderStatus(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) askStatus(); });
  } else navigator.getBattery?.().then((b) => {
    battery = b;
    b.addEventListener('levelchange', renderStatus);
    b.addEventListener('chargingchange', renderStatus);
    renderStatus();
  }).catch(() => {});
  addEventListener('online', renderStatus);
  addEventListener('offline', renderStatus);
  navigator.connection?.addEventListener?.('change', renderStatus);
  renderHome();
  tick();
}

function tick() {
  const now = new Date();
  updateClock(now);
  setTimeout(tick, 1000 - now.getMilliseconds() + 5);
}

// часы — одни: часы и минуты обычными цифрами (12-часовой формат — по настройке)
function clockText(now) {
  let hh = now.getHours();
  if (prefs.hour12) hh = hh % 12 || 12;
  return [prefs.hour12 ? String(hh) : String(hh).padStart(2, '0'), String(now.getMinutes()).padStart(2, '0')];
}

function updateClock(now, force = false) {
  const [hh, mm] = clockText(now);
  const sig = `${hh}:${mm}|${getLang()}|${now.toDateString()}`;
  if (!force && sig === lastSig) return;
  root.querySelectorAll('[data-live]').forEach((x) => { x.textContent = liveText(+x.dataset.live); });
  const el = root.querySelector('.clock');
  if (el) {
    el.replaceChildren(h('span', {}, hh), h('i', {}, ':'), h('span', {}, mm));
    el.setAttribute('aria-label', `${hh}:${mm}`);
    fitClock(el);
  }
  lastSig = sig;
  renderDate(now);
  // трекер — раз в минуту: новый день плана, новая неделя; сигнал связи — тоже
  refreshTracker();
  if (isNative()) askStatus();
}

// Своя строка состояния (системная скрыта, MainActivity): слева связь (мобильная — столбики, Wi-Fi — дуги по силе
// сигнала), справа заряд. Посередине ничего — там часто вырез камеры. Android — из системы, браузер — что знает сам
const SVG = (vb, body) => `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const dim = (on) => (on ? '' : ' opacity=".28"');
// столбики мобильной связи: уровень 0–4
const cellIcon = (lv) => SVG('0 0 20 16', [3, 7, 11, 15].map((x, i) => `<path d="M${x + 1} 14.5V${12 - i * 3}"${dim(lv > i)}/>`).join(''));
// Wi-Fi: три дуги и точка; уровень 0–4 (нет данных — все дуги)
const wifiIcon = (lv = 4) => SVG('0 0 24 18', `<path d="M2.5 6.5a14 14 0 0 1 19 0"${dim(lv >= 4)}/><path d="M6 10a9 9 0 0 1 12 0"${dim(lv >= 3)}/><path d="M9.3 13.4a4 4 0 0 1 5.4 0"${dim(lv >= 2)}/><circle cx="12" cy="16.3" r=".9" fill="currentColor" stroke="none"/>`);
const offIcon = () => SVG('0 0 24 18', '<path d="M2.5 6.5a14 14 0 0 1 19 0M6 10a9 9 0 0 1 12 0M9.3 13.4a4 4 0 0 1 5.4 0" opacity=".28"/><path d="M4 2l16 15"/>');

function renderStatus() {
  const el = root?.querySelector('.l-status');
  if (!el) return;
  let net, level, charging, label;
  if (sys) {
    const parts = [];
    if (sys.cell != null) parts.push(h('span', { class: 'l-st-i', html: cellIcon(sys.cell) }));
    if (sys.net === 'wifi') parts.push(h('span', { class: 'l-st-i', html: wifiIcon(sys.wifi ?? 4) }));
    else if (sys.net === 'none') parts.push(h('span', { class: 'l-st-i off', html: offIcon() }));
    else if (sys.net === 'cell' && sys.cell == null) parts.push(h('span', { class: 'l-st-i', html: cellIcon(4) }));
    net = parts;
    level = sys.battery != null ? sys.battery / 100 : null;
    charging = !!sys.charging;
    label = t(sys.net === 'none' ? 'status.offline' : sys.net === 'wifi' ? 'status.wifi' : 'status.online');
  } else {
    const online = navigator.onLine;
    const type = navigator.connection?.type;
    net = [h('span', { class: 'l-st-i' + (online ? '' : ' off'), html: !online ? offIcon() : type === 'cellular' ? cellIcon(4) : wifiIcon() })];
    level = battery ? battery.level : null;
    charging = !!battery?.charging;
    label = online ? t('status.online') : t('status.offline');
  }
  const pct = level == null ? '' : Math.round(level * 100) + '%';
  const bat = SVG('0 0 28 14', `<rect x="1" y="1.5" width="22" height="11" rx="2.6" opacity=".5"/><rect x="3" y="3.5" width="${Math.max(1.5, 18 * (level ?? 1)).toFixed(1)}" height="7" rx="1" fill="currentColor" stroke="none"/><path d="M26 5.5v3" opacity=".5"/>`);
  el.setAttribute('aria-label', [label, pct && t('status.battery', { p: pct }), charging ? t('status.charging') : ''].filter(Boolean).join(', '));
  el.replaceChildren(
    h('span', { class: 'l-st-net' }, net),
    h('span', { class: 'l-st-bat' + (level != null && level <= 0.15 && !charging ? ' low' : '') },
      h('span', {}, pct + (charging ? ' ⚡︎' : '')), h('span', { class: 'l-st-bi', html: bat })));
}

const LOCALES = { ru: 'ru-RU', en: 'en-GB' };
// узбекских названий в браузерах часто нет (выходит «M10») — свои
const UZ_MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
const UZ_DAYS = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];
const weekdayOf = (now, lang) => (lang === 'uz' ? UZ_DAYS[now.getDay()] : new Intl.DateTimeFormat(LOCALES[lang] || 'ru-RU', { weekday: 'long' }).format(now));
const dayMonthOf = (now, lang) => (lang === 'uz' ? `${now.getDate()}-${UZ_MONTHS[now.getMonth()]}` : new Intl.DateTimeFormat(LOCALES[lang] || 'ru-RU', { day: 'numeric', month: 'long' }).format(now));

// дата — одной тихой строкой: «вторник, 28 октября»; крест у даты — если его место здесь
function renderDate(now) {
  const el = root.querySelector('.l-date');
  if (!el) return;
  const lang = getLang();
  el.replaceChildren(...[
    crossAt('date') ? h('span', { class: 'l-cross at-date', html: crossSVG(prefs.cross) }) : null,
    h('span', { class: 'l-date-t' }, `${weekdayOf(now, lang)}, ${dayMonthOf(now, lang)}`)].filter(Boolean));
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
  keepMarks(el, fresh);
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

// блок перерисован на месте — размер, метка блока и отметки правки (arrange.js) сохраняются
function keepMarks(old, fresh) {
  fresh.style.cssText = old.style.cssText;
  Object.assign(fresh.dataset, old.dataset);
  ['l-arr-blk', 'sel'].forEach((c) => { if (old.classList.contains(c)) fresh.classList.add(c); });
}

// перерисовать блок Melete на месте (размер блока из раскладки сохраняется)
export function refreshTracker() {
  const tr = root?.querySelector('.l-tracker');
  if (!tr) return;
  const fresh = renderTracker() || h('div', { class: 'l-tracker', hidden: true });
  keepMarks(tr, fresh);
  tr.replaceWith(fresh);
}

// крест: в церковном режиме, если выбран вид и это его место
const crossAt = (place) => isChurch() && prefs.cross !== 'none' && (prefs.crossAt || 'center') === place;

export function renderHome() {
  if (!root) return;
  const L = layout();
  root.className = `l-home align-${prefs.align}` + (handlers.editing?.() ? ' editing' : '');
  // блоки в порядке раскладки; размер блока — множитель к общему размеру (часы — к размеру часов)
  const make = {
    clock: () => h('div', { class: 'clock-wrap', onclick: tapAction('clockTap') }, h('div', { class: 'clock' })),
    date: () => h('div', { class: 'l-date', onclick: tapAction('dateTap') }),
    balance: renderBalance,
    apps: renderList,
    // пустое место; крест посередине — здесь, вместо обоев (касания проходят сквозь него)
    space: () => h('div', { class: 'l-spacer' }, crossAt('center') ? h('div', { class: 'l-cross at-center', html: crossSVG(prefs.cross) }) : null),
    tracker: renderTracker,
    dock: () => [crossAt('bottom') ? h('div', { class: 'l-cross at-bottom', html: crossSVG(prefs.cross) }) : null, renderDock()],
  };
  const sized = (id, el) => {
    if (!el) return el;
    const k = L.scale[id];
    if (k && k !== 100) el.style.setProperty(id === 'dock' ? '--l-blk' : 'zoom', id === 'clock' ? `calc(var(--l-ck, 1) * ${k / 100})` : id === 'dock' ? String(k / 100) : `calc(var(--l-ui, 1) * ${k / 100})`);
    return el;
  };
  const blocks = homeOrder().flatMap((id) => {
    const out = [make[id]()].flat().filter(Boolean);
    // блок — последний элемент (у значков перед ним может стоять крест); data-blk — для правки на месте (arrange.js)
    const el = out[out.length - 1];
    if (el) { sized(id, el); el.dataset.blk = id; }
    // крест вверху — по центру, сразу над часами
    if (id === 'clock' && crossAt('top')) out.unshift(h('div', { class: 'l-cross at-top', html: crossSVG(prefs.cross) }));
    return out;
  });
  root.replaceChildren(...[
    prefs.status ? h('div', { class: 'l-status', role: 'status' }) : null,
    crossAt('back') ? h('div', { class: 'l-cross at-back', html: crossSVG(prefs.cross, 0.5) }) : null,
    ...blocks,
  ].filter(Boolean));
  lastSig = null;
  renderStatus();
  // подогнать сразу (без кадра «до»), и ещё раз, когда шрифт и место устоялись
  fitApps();
  requestAnimationFrame(fitApps);
  updateClock(new Date(), true);
}

// нажатие на часы и дату — действие жеста clockTap / dateTap
const tapAction = (id) => (e) => { if (!e.currentTarget.dataset.suppress) handlers.onGesture(id); };

function renderList() {
  const list = h('nav', { class: 'l-apps', 'aria-label': t('home.apps') });
  homeItems().slice(0, HOME_MAX).forEach((item, i) => {
    const app = appOf(item.key);
    const fold = folderOfKey(item.key);
    const label = item.label || (fold ? folderName(fold) : app?.label) || t('act.gone');
    const btn = h('button', { class: 'l-app' + (fold ? ' folder' : ''), 'data-i': i, style: { '--d': `${i * 55}ms` } },
      h('span', { class: 'label' }, label),
      fold ? h('span', { class: 'l-fold-n', 'aria-label': t('fold.n', { n: folderApps(fold).length }) }, String(folderApps(fold).length)) : null);
    btn.addEventListener('click', () => {
      if (btn.dataset.suppress) return;
      btn.classList.add('pressed');
      setTimeout(() => btn.classList.remove('pressed'), 500);
      if (fold) handlers.onFolder(fold.id); else openApp(app);
    });
    btn.longPress = () => handlers.onBlockHold('apps');
    list.append(btn);
  });
  if (!homeItems().length) list.append(h('p', { class: 'l-empty' }, t('home.empty')));
  list.longPress = () => handlers.onBlockHold('apps');
  return list;
}

function renderDock() {
  const slots = dockSlots();
  if (!slots.length) return h('div', { class: 'l-dock-gap' });
  const dock = h('div', { class: 'l-dock' });
  slots.forEach((slot, i) => {
    const b = h('button', { class: 'l-dock-btn', 'data-i': i, 'aria-label': handlers.describe(slot.action), html: iconSVG(slot.icon) });
    b.addEventListener('click', () => { if (!b.dataset.suppress) runAction(slot.action, apps); });
    b.longPress = () => handlers.onBlockHold('dock');
    dock.append(b);
  });
  return dock;
}

const PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l10.5-6.5z"/></svg>';
const PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="5.5" width="3.4" height="13" rx="1"/><rect x="13.6" y="5.5" width="3.4" height="13" rx="1"/></svg>';

// — Melete на главном: идёт занятие, неделя практики (по дням), чтение дня —
// — Melete на главном: одна тихая строка — занятие (если идёт) с ▶/❚❚, иначе неделя; справа — чтение дня (церковный режим).
// Касание — сразу в нужный экран Melete: занятие, свободная практика, Библия на чтении дня (docs/launcher-bridge.md)
function renderTracker() {
  const d = prefs.tracker ? trackerData() : null;
  if (!d) return null; // мост с Melete не подключён — блока нет
  const go = (route) => (e) => { if (!e.currentTarget.dataset.suppress) handlers.onMelete(route); };
  const hold = (el) => { el.longPress = () => handlers.onBlockHold('tracker'); return el; };
  return trackerLine(d, go, hold);
}

function trackerLine(d, go, hold) {
  const wrap = h('div', { class: 'l-tracker line' + (d.demo ? ' demo' : '') });
  const row = h('div', { class: 'l-trl' });
  const lv = d.live, p = d.practice, rd = d.reading;
  if (lv) {
    row.append(hold(h('button', { class: 'l-trl-main', onclick: go(lv.session ? 'session' : 'free') },
      h('i', { class: 'l-tr-pulse' + (lv.playing ? '' : ' still'), 'aria-hidden': 'true' }),
      h('span', {}, lv.session ? t('tr.live') : t('tr.playing')),
      lv.start ? h('em', { 'data-live': lv.start }, liveText(lv.start)) : null)),
    h('button', { class: 'l-tr-ctl', 'aria-label': lv.playing ? t('tr.pause') : t('tr.play'), html: lv.playing ? PAUSE : PLAY,
      onclick: (e) => { e.stopPropagation(); handlers.onMeleteControl('toggle'); if (d.demo) setTimeout(refreshTracker, 30); } }));
  } else if (p) {
    row.append(hold(h('button', { class: 'l-trl-main', onclick: go('free') },
      h('span', {}, fmtDur(p.total, t)), h('em', {}, t('tr.ofGoal', { goal: fmtDur(p.goal, t) }).replace(/ · .*$/, '')))));
  }
  if (rd?.ref) row.append(hold(h('button', { class: 'l-trl-side', onclick: go('bible') }, rd.ref)));
  if (!row.children.length) return null;
  wrap.append(row);
  if (p) wrap.append(h('i', { class: 'l-trl-bar', 'aria-hidden': 'true' }, h('u', { style: { width: `${Math.min(100, p.progress * 100).toFixed(0)}%` } })));
  return wrap;
}

// идёт 24 мин / 1:05
function liveText(start) {
  const m = Math.max(0, Math.floor((Date.now() - start) / 60e3));
  return m < 60 ? t('dur.m', { m }) : `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
}
