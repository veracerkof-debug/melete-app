// Первый запуск (решение автора, 2026-10 — меньше текста): стартовый экран (Melete, стих, язык) и регистрация одним
// экраном — четыре уровня (новичок, средний, продвинутый, профи). По уровню — цель недели, набор инструментов и вид
// учебника; там же — загрузка
// своих данных. Всё остальное — по умолчанию (Мелетий, классические напоминания, церковный режим, демо-набор);
// имя Мелетий спрашивает уже на главной (askName). Соглашение — в настройках («О Melete»).
import '../../ui/onboard.css';
import { t, getLang, LANGS, LANG_NAMES, initI18n } from '../../i18n/index.js';
import { esc, toast } from '../../ui/index.js';
import { PRIOR_MAX, GOAL_BY_LEVEL, LEVELS, LEVEL_FROM, newProfile, saveProfile, applyLevelDefaults, toolsFor, levelByHours } from '../profile.js';
import { modules, moduleById } from '../../modules/index.js';
import { logoHTML } from '../../ui/logo.js';
import { setRemind, remindOf, remindAvailable, remindPermission } from '../reminders.js';
import { mascotSVG } from '../../ui/mascot.js';
import { hasMascot } from '../../i18n/index.js';
import { TOS_VER } from '../legal.js';

// Уровень (решение автора 31.10.2026): четыре карточки вместо колеса часов. У каждого уровня — свой разброс часов
// (profile.js: LEVEL_FROM) и свой набор инструментов (у продвинутого и профи — все); по уровню включается и учебник
const LOW = Object.fromEntries(LEVEL_FROM.map(([h, l]) => [l, h])); // нижняя граница часов уровня — опыт до приложения

export function onboarding(app, done = () => {}) {
  if (document.getElementById('onboard')) return;
  const st = app.store.state.settings;
  const p = { ...newProfile(), ...(st.profile || {}) };
  // по умолчанию: классические напоминания, Мелетий, церковный режим
  if (!st.remind) setRemind(st, { mode: 'classic' });
  if (!st.mascot) st.mascot = 'm';
  if (st.church == null) st.church = false; // приложение светское; церковный режим включают в «Функциях» (решение автора)
  const allIds = modules.map((m) => m.id);
  let sel = st.profile && LEVELS.includes(st.profile.level) ? st.profile.level : 'beginner'; // новый человек — новичок по умолчанию
  const layer = document.createElement('div');
  layer.id = 'onboard';
  layer.className = 'onb';
  layer.setAttribute('role', 'dialog');
  layer.setAttribute('aria-modal', 'true');
  layer.setAttribute('aria-label', t('ob.aria'));
  document.body.appendChild(layer);

  const toolsRow = (lvl) => toolsFor(lvl, p.instruments, allIds).map(moduleById).filter((m) => m && !m.tab && !m.inner)
    .map((m) => '<span class="whtool" style="--c:' + m.color + ';--on:' + (m.on || '#fff') + '" title="' + esc(m.name && (m.name[getLang()] || m.name.ru) || m.id) + '">' + m.icon + '</span>').join('');
  const cards = () => LEVELS.map((l) => '<button type="button" class="lvc' + (l === sel ? ' on' : '') + '" data-lv="' + l + '" aria-pressed="' + (l === sel) + '">' +
    '<span class="lvhd"><b>' + t('level.' + l) + '</b><span class="lvh num">' + t('ob.lvh.' + l) + '</span></span><span class="lvt">' + t('level.' + l + '.text') + '</span>' +
    '<span class="whtools" aria-hidden="true">' + toolsRow(l) + '</span></button>').join('');
  layer.innerHTML = '<div class="obbody oblv"><h1 class="obh">' + t('ob.lvTitle') + '</h1><div class="lvcards" role="group" aria-label="' + esc(t('ob.lvTitle')) + '">' + cards() + '</div></div>' +
    '<div class="obfoot"><button type="button" class="btn fill block" data-obgo>' + t('ob.finish') + '</button>' +
    '<button type="button" class="link obimp" data-obimp>' + t('ob.import') + '</button></div>';
  const live = () => { layer.querySelector('.lvcards').innerHTML = cards(); };

  const finish = () => {
    // опыт до приложения: свой (из загруженного файла), если он в разбросе уровня, иначе — нижняя граница уровня
    const own = +p.priorHours || 0;
    p.priorHours = Math.min(PRIOR_MAX, levelByHours(own) === sel ? own : LOW[sel] || 0);
    p.level = sel;
    saveProfile(app.store, p, { done: true });
    // по уровню — набор инструментов и цель недели
    const tools = toolsFor(p.level, p.instruments, allIds), off = st.off || (st.off = {});
    allIds.forEach((id) => { if (tools.includes(id)) delete off[id]; else off[id] = true; });
    st.goalMin = GOAL_BY_LEVEL[p.level];
    st.tosOk = TOS_VER; // соглашение — в настройках («О Melete»)
    app.store.settingsChanged();
    if (remindOf(st).mode !== 'quiet' && remindAvailable()) remindPermission().then((ok) => { if (!ok) toast(t('rem.denied')); });
    applyLevelDefaults(app.device, app.store.state.settings.profile);
    app.saveDevice();
    layer.remove();
    // демо-набор сам не добавляется (решение автора 27.10.2026): включить — «Данные и копии» или кнопка в пустых песнях
    done();
    setTimeout(() => askName(app), 700);
  };

  layer.addEventListener('click', (e) => {
    if (e.target.closest('[data-obgo]')) { finish(); return; }
    const lv = e.target.closest('[data-lv]'); if (lv) { sel = lv.dataset.lv; live(); return; }
    if (e.target.closest('[data-obimp]')) {
      // свои данные (файл от команды или собранный нейросетью): профиль из файла — сразу регистрация готова
      saveProfile(app.store, p);
      import('./share.js').then((m) => m.pickFile(app, () => {
        const q = app.store.state.settings.profile || {};
        if (q.priorHours != null) p.priorHours = +q.priorHours || 0;
        sel = LEVELS.includes(q.level) ? q.level : levelByHours(p.priorHours);
        if (q.name) p.name = q.name;
        if (q.instruments) p.instruments = q.instruments.slice();
        live();
      }));
    }
  });
}

// После регистрации: маскот спрашивает, как обращаться (один раз; пропустить — тоже ответ)
export function askName(app) {
  const st = app.store.state.settings;
  if (!st.profile || st.profile.name || st.nameAsked || document.querySelector('.askname')) return;
  const d = document.createElement('div');
  d.className = 'askname';
  d.setAttribute('role', 'dialog');
  d.setAttribute('aria-label', t('ob.askName'));
  d.innerHTML = '<div class="anbox">' + (hasMascot() ? '<span class="anface">' + mascotSVG('glad', { size: 56 }) + '</span>' : '') +
    '<div class="anmain"><b>' + t('ob.askName') + '</b><input class="inp" maxlength="40" autocomplete="given-name" aria-label="' + esc(t('ob.askName')) + '">' +
    '<div class="anbtns"><button type="button" class="link" data-an="skip">' + t('ob.skip') + '</button><button type="button" class="btn fill" data-an="ok">' + t('ui.done') + '</button></div></div></div>';
  document.body.appendChild(d);
  const inp = d.querySelector('input');
  setTimeout(() => inp.focus(), 250);
  const close = (save) => {
    if (save && inp.value.trim()) saveProfile(app.store, { ...st.profile, name: inp.value.trim() });
    st.nameAsked = true;
    app.store.settingsChanged();
    d.classList.add('leaving');
    setTimeout(() => d.remove(), 220);
    if (save && inp.value.trim()) toast(t('ob.welcome', { name: inp.value.trim() }));
    app.render && app.render();
  };
  d.addEventListener('click', (e) => { const b = e.target.closest('[data-an]'); if (b) close(b.dataset.an === 'ok'); });
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') close(true); if (e.key === 'Escape') close(false); });
}

// Стартовый экран: Melete — компаньон в практике, стих, где встречается это слово, и выбор языка.
// Уже выбран язык (или есть профиль) — пропускается. Подробнее о приложении — «О Melete» в настройках
const MEANING_GR = '<b>μελέτη</b> · ἄσκησις';
const bold = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
export function startHTML() {
  const lang = getLang();
  return '<div class="wlbox wlstart"><div class="wllang" role="group" aria-label="' + esc(t('look.lang')) + '">' + LANGS.map((k) => '<button type="button" class="wllb' + (lang === k ? ' on' : '') + '" data-lg="' + k + '" lang="' + k + '" aria-pressed="' + (lang === k) + '">' + LANG_NAMES[k] + '</button>').join('') + '</div>' +
    '<div class="wlhero"><div class="wllogo">' + logoHTML() + '</div><h1 class="wlh">' + t('wel.tag') + '</h1></div>' +
    // приложение светское: значение слова и муза Мелета (стих из Писания — только в церковном режиме, «О названии»)
    '<figure class="wlverse"><p class="wlgr" lang="grc">' + MEANING_GR + '</p><blockquote>' + bold(t('name.secDef')) + '</blockquote><figcaption>' + esc(t('name.secRef')) + '</figcaption></figure>' +
    '<button type="button" class="btn fill block" data-wlgo>' + t('wel.go') + '</button></div>';
}

// Подробно о Melete (настройки → «О Melete»): видение, бесплатность, ответственность, документы
export function welcomeHTML() {
  return '<div class="wlbox"><div class="wlhero">' + mascotSVG('glad', { size: 96 }) + '<div class="wllogo">' + logoHTML() + '</div><h1 class="wlh">' + t('wel.title') + '</h1></div>' +
    '<p class="wlp">' + t('wel.p1') + '</p><p class="wlp">' + t('wel.p2') + '</p><p class="wlp wlgood">' + t('wel.p3') + '</p>' +
    '<p class="wlp wllegal">' + t('wel.legal') + '</p>' +
    '<div class="wldocs">' + ['tos', 'priv', 'lic'].map((k) => '<button type="button" class="link" data-wldoc="' + k + '">' + t('legal.' + k) + '</button>').join('') + '</div></div>';
}

export function langGate(app, then = () => {}) {
  const st = app.store.state.settings;
  if (st.profile || st.lang) { then(); return; }
  initI18n(undefined); // язык системы — до выбора
  const l = document.createElement('div');
  l.className = 'onb langgate';
  l.setAttribute('role', 'dialog');
  l.setAttribute('aria-modal', 'true');
  const render = () => { l.innerHTML = startHTML(); l.setAttribute('aria-label', t('wel.tag')); };
  render();
  document.body.appendChild(l);
  l.addEventListener('click', (e) => {
    const b = e.target.closest('[data-lg]');
    if (b) { st.lang = b.dataset.lg; initI18n(st.lang); render(); return; }
    if (!e.target.closest('[data-wlgo]')) return;
    st.lang = st.lang || getLang();
    app.store.settingsChanged();
    initI18n(st.lang);
    l.remove();
    then();
  });
}
