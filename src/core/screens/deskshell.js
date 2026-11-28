// Оболочка компьютера для не-новичка (слово автора 28.11.2026, макеты «экран профи»): полоса сверху — логотип Μελέτη, вкладки,
// поиск Ctrl K, профиль вывода звука, «Помощник», «Настройки»; слева — рельса инструментов (значок + подпись 11 px) по группам,
// зелёным — те, что звучат сейчас. Только компьютер (html.desk) и не «новичок» (html.dpro). Разметка — внутри корня приложения,
// нажатия ловит общий обработчик каркаса (shell.js: data-go, data-act, data-pp); рельса — свой (data-rail → app.showTool).
import { t } from '../../i18n/index.js';
import { esc } from '../../ui/index.js';
import { moduleById } from '../../modules/index.js';
import { isOn } from '../settings.js';
import { moduleName } from '../modules.js';
import { tabIds } from './common.js';
import { groupIdOf } from '../groups.js';
import { isDesk } from '../../ui/desk.js';
import { forKey, normalize } from '../../audio/profiles.js';

// Рельса: группы по смыслу — играть, учить, слушать и писать, прочее. Показываются только включённые инструменты
export const RAIL = [
  ['metro', 'tuner', 'piano', 'drone', 'looper', 'glider', 'theremin'],
  ['ear', 'beat', 'theory'],
  ['audio', 'notes', 'studio', 'voice', 'spectrum'],
  ['timer', 'bible'],
];
// Шина микшера → инструмент рельсы (звучит — значок зелёный)
const BUS_TOOL = { metro: 'metro', drone: 'drone', media: 'audio', looper: 'looper', notes: 'notes', theory: 'theory', piano: 'piano', glider: 'glider' };

// Не-новичок на компьютере: оболочка включается. «Минимал», режим «только инструменты» и первый запуск — как были
export function deskPro(st, desk = isDesk()) {
  const p = st && st.profile;
  return !!(desk && p && p.level !== 'beginner' && st.configured && st.uiStyle !== 'mono' && !st.toolsOnly);
}

// Рельса: [[id, …], …] — группы из включённых инструментов, пустые убираются
export function railGroups(st, byId = moduleById) {
  return RAIL.map((g) => g.filter((id) => { const m = byId(id); return !!m && isOn(st, id); })).filter((g) => g.length);
}

// Вкладки сверху: [id, подпись, действие]. «Служение» — в церковном режиме (приложение светское), иначе — «Календарь»
export function topTabs(st, nav = {}) {
  return [
    { id: 'today', label: t('desk.tab.today'), go: 'home' },
    { id: 'service', label: t(st.church ? 'desk.tab.service' : 'nav.calendar'), go: nav.service || 'calendar' },
    { id: 'songs', label: t('nav.library'), go: 'library' },
    { id: 'tools', label: t('nav.tools'), go: 'tools' },
    { id: 'stats', label: t('desk.tab.stats'), go: 'stats' },
  ];
}

// Какая вкладка сверху подсвечена: открытый инструмент или занятие — «Инструменты»; страница настроек — никакая
export function activeTop({ tab, panel, tool, session }) {
  if (panel) return panel === 'stats' ? 'stats' : '';
  if (tool || session) return 'tools';
  return { home: 'today', calendar: 'service', library: 'songs', tools: 'tools' }[tab] || '';
}

const TYPE = { speaker: 'prof.t.speaker', earpiece: 'prof.t.earpiece', wired: 'prof.t.wired', bluetooth: 'prof.t.bt', bluetooth_call: 'prof.t.bt', ble: 'prof.t.bt', usb: 'prof.t.usb', hdmi: 'prof.t.hdmi', web: 'prof.t.web', other: 'prof.t.other', none: 'prof.t.none' };

export function createDeskShell(app, root) {
  const html = document.documentElement;
  let top = null, rail = null, on = false, liveKey = '', outText = '', outOn = false, tm = 0;
  const st = () => app.store.state.settings;

  const railHTML = () => railGroups(st()).map((g) => '<div class="drg">' + g.map((id) => {
    const m = moduleById(id), nm = id === 'spectrum' ? t('desk.rail.spectrum') : moduleName(m); // «Спектр и шумомер» в рельсу не помещается
    return '<button class="drt" data-rail="' + id + '" aria-label="' + esc(nm) + '" title="' + esc(nm) + '">' + m.icon + '<span>' + esc(nm) + '</span></button>';
  }).join('') + '</div>').join('');

  const topHTML = () => {
    const nav = app.deskNav || {};
    return '<span class="dlogo" aria-hidden="true">Μελέτη</span><nav class="dtabs" aria-label="' + esc(t('desk.nav')) + '">' +
      topTabs(st(), nav).map((x) => '<button class="dtab" data-dt="' + x.id + '" data-go="' + x.go + '">' + esc(x.label) + '</button>').join('') + '</nav><span class="dsp"></span>' +
      '<button class="dfind" data-dfind aria-label="' + esc(t('palette.ph')) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><span>' + esc(t('palette.find')) + '</span><kbd>Ctrl K</kbd></button>' +
      '<button class="dchip" data-dout aria-label="' + esc(t('desk.out')) + '" hidden><i></i><span></span></button>' +
      '<button class="dbtn" data-act="aichat">' + esc(t('desk.assist')) + '</button><button class="dbtn" data-act="panel">' + esc(t('palette.settings')) + '</button>';
  };

  function mount() {
    if (top) return;
    top = document.createElement('header'); top.className = 'dtop';
    rail = document.createElement('nav'); rail.className = 'drail'; rail.setAttribute('aria-label', t('desk.rail'));
    root.append(top, rail);
    import('./deskwork.js').then((m) => m.watchStation(app)).catch(() => {}); // микшер рабочей станции в слое занятия
    top.addEventListener('click', (e) => {
      if (e.target.closest('[data-dfind]') && app.openPalette) app.openPalette();
      else if (e.target.closest('[data-dout]')) import('./profiles.js').then((m) => m.profilesSheet(app, () => outRefresh())).catch(() => {});
    });
    rail.addEventListener('click', (e) => {
      const b = e.target.closest('[data-rail]');
      if (!b) return;
      const id = b.dataset.rail;
      if (id === 'bible' && tabIds(st()).includes('bible')) app.go('bible'); else app.showTool(id);
    });
    // инструмент или занятие открылись/закрылись — подсветка в рельсе и вкладке (слой добавляется прямо в body)
    new MutationObserver(() => paint()).observe(document.body, { childList: true });
    document.addEventListener('pointerdown', () => setTimeout(paint, 0), true); // окно в занятии получило фокус
  }

  // Профиль вывода: имя сохранённого профиля устройства, иначе имя устройства; нет сведений — чип скрыт
  async function outRefresh() {
    try {
      if (!app.outRoute) return;
      const cur = await app.outRoute.current();
      outOn = false;
      if (!cur || cur.type === 'none') { outText = ''; } else {
        const pr = forKey(normalize(app.device.profiles), cur.key);
        outText = pr ? pr.name : cur.label || t(TYPE[cur.type] || 'prof.t.other'); outOn = !!pr;
      }
    } catch { outText = ''; }
    paint();
  }

  function paint() {
    if (!on || !top) return;
    const s = app.shellState ? app.shellState() : {}, ses = document.querySelector('.session'), tv = [...document.querySelectorAll('.tview[data-tool]')].pop();
    const act = activeTop({ tab: s.tab, panel: s.panel, tool: !!tv, session: !!ses });
    top.querySelectorAll('.dtab').forEach((b) => { if (b.dataset.dt === act) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    // активный инструмент: открытое окно или окно в фокусе занятия (у объединённых — все отделы группы)
    const cur = tv ? tv.dataset.tool : ses ? ((ses.querySelector('.pane.focus') || ses.querySelector('.pane') || {}).dataset || {}).group : '';
    const curG = cur ? groupIdOf(moduleById(cur)) || cur : '';
    rail.querySelectorAll('.drt').forEach((b) => {
      const id = b.dataset.rail, m = moduleById(id), me = tv ? id === cur : !!curG && (groupIdOf(m) === curG || id === curG);
      if (me) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
    });
    const chip = top.querySelector('.dchip');
    if (chip) { chip.hidden = !outText; chip.classList.toggle('ok', outOn); chip.querySelector('span').textContent = outText; }
    tick(true);
  }

  // Звучащие инструменты — раз в секунду, и только когда окно видно: читаем зонды шины, ничего не включаем
  function tick(force) {
    if (!on || !rail || (document.visibilityState !== 'visible' && !force)) return;
    const mx = app.audio && app.audio.mixer, ids = [];
    if (mx) Object.entries(BUS_TOOL).forEach(([bus, id]) => { try { if (mx.isActive(bus) && mx.value(bus) > 0) ids.push(id); } catch { /* шина без зонда */ } });
    const key = ids.join();
    if (!force && key === liveKey) return;
    liveKey = key;
    rail.querySelectorAll('.drt').forEach((b) => b.classList.toggle('live', ids.includes(b.dataset.rail)));
  }

  // Вызывается при каждой перерисовке каркаса: включает/выключает оболочку и обновляет состав
  function sync() {
    const want = deskPro(st());
    html.classList.toggle('dpro', want);
    if (want && !on) { on = true; mount(); tm = setInterval(() => tick(false), 1000); }
    if (!want && on) { on = false; clearInterval(tm); if (top) { top.remove(); rail.remove(); top = rail = null; } return; }
    if (!on) return;
    if (!top.isConnected) root.append(top, rail);
    const th = topHTML(), rh = railHTML();
    if (top.dataset.h !== th) { top.dataset.h = th; top.innerHTML = th; }
    if (rail.dataset.h !== rh) { rail.dataset.h = rh; rail.innerHTML = rh; liveKey = ''; }
    if (app.outRoute && !sync.sub) { sync.sub = true; app.outRoute.onChange(() => outRefresh()); outRefresh(); }
    paint();
  }
  return { sync, paint };
}
