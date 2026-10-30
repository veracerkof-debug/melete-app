// Elachiston: настройки (удержание пустого места) — четыре страницы: вид, главный экран, жесты, данные.
// Только практичное: тема, язык, размеры, сторона, церковный режим и крест; приложения, значки, Melete
// (порядок, размер и видимость блоков — не здесь, а на самом главном: удержание элемента, arrange.js);
// жесты; копии и обновление (DECISIONS 2026-10-28 — минимальный экран).
import { prefs, save, setPrefs, resetPrefs, isChurch, HOME_MAX } from './data.js';
import { iconSVG, appIconsAvailable } from './icons.js';
import { CROSS_IDS, CROSS_PLACES, crossSVG } from './cross.js';
import { GESTURES } from './gestures.js';
import { describeAction, openUrl, openApp } from './actions.js';
import { pickIcon, pickAction } from './pickers.js';
import { pickHome } from './homepick.js';
import { homeItems, dockSlots, appOf, appName, hiddenApps, setHidden, renameApp, systemName } from './apps.js';
import { folderOfKey, folderName } from './folders.js';
import { isNative, Launcher } from './native.js';
import { applyLook } from './look.js';
import { meleteLive } from './melete.js';
import { saveFile, pickFile, restore, summary, localCopies } from './backup.js';
import { meleteBridge, connectMelete, refreshMelete, disconnectMelete } from './melete.js';
import { updAvailable, updState, onUpdate, check, download, install, CHANNEL, BUILD } from './update.js';
import { t, getLang } from './i18n.js';
import { h, openSheet, segmented, toggle, field, section, toast } from './ui.js';

let changed = () => {};
// название на главном: приложение или папка
const nameOf = (key) => { const f = folderOfKey(key); return f ? folderName(f) : appOf(key)?.label || t('act.gone'); };
// значки жестов — одной тонкой линией, как всё остальное
const G = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const GESTURE_ICONS = {
  swipeUp: G('<path d="M12 19V5M6.5 10.5 12 5l5.5 5.5"/>'),
  swipeDown: G('<path d="M12 5v14M6.5 13.5 12 19l5.5-5.5"/>'),
  swipeLeft: G('<path d="M19 12H5M10.5 6.5 5 12l5.5 5.5"/>'),
  swipeRight: G('<path d="M5 12h14M13.5 6.5 19 12l-5.5 5.5"/>'),
  doubleTap: G('<circle cx="8.5" cy="12" r="2.5"/><circle cx="15.5" cy="12" r="2.5"/>'),
  longPress: G('<circle cx="12" cy="12" r="2.5"/><circle cx="12" cy="12" r="7.5" opacity=".45"/>'),
  clockTap: G('<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>'),
  dateTap: G('<rect x="4.5" y="5.5" width="15" height="14" rx="2"/><path d="M4.5 10h15M9 3.5v3.5M15 3.5v3.5"/>'),
};
let gestureOf = () => null;

// главный экран и значки хранят свой список, только когда их изменили
const ownHome = () => (prefs.home = prefs.home || homeItems().map((x) => ({ ...x })));
const ownDock = () => (prefs.dock = prefs.dock || dockSlots().map((x) => ({ ...x, action: { ...x.action } })));
const move = (arr, i, d) => { const j = i + d; if (j >= 0 && j < arr.length) [arr[i], arr[j]] = [arr[j], arr[i]]; };

// вкладка настроек; секции помечены ею и показываются только на своей (четыре страницы — DECISIONS 2026-10-27)
const TABS = ['look', 'home', 'gestures', 'data'];
const S = (tab, title, ...kids) => { const el = section(title, '', ...kids); el.dataset.tab = tab; return el; };

export function openSettings(onChange, getGesture, tab) {
  changed = onChange;
  gestureOf = getGesture;
  if (TABS.includes(tab)) setPrefs({ setTab: tab });
  let unbindUpd = null;
  let goTab = () => {};
  openSheet({
    title: t('set.title'), full: true,
    onClose: () => unbindUpd?.(),
    onSwipe: (dir) => { const i = TABS.indexOf(prefs.setTab); const n = TABS[i + (dir === 'left' ? 1 : -1)]; if (n) goTab(n, dir); },
    render(body, _close, rerender) {
      const church = isChurch(); // мог переключиться прямо здесь
      const up = (patch) => { setPrefs(patch); changed(); rerender(); };
      const keep = (fn) => () => { const sc = body.parentElement, y = sc.scrollTop; fn(); requestAnimationFrame(() => { sc.scrollTop = y; }); };

      // — Вид: тема, язык, размеры, сторона, своя строка состояния —
      body.append(S('look', t('set.appearance'),
        h('div', { class: 'l-label' }, t('set.theme')),
        segmented([{ value: 'system', label: t('theme.system') }, { value: 'light', label: t('theme.light') }, { value: 'dark', label: t('theme.dark') }, { value: 'oled', label: 'OLED' }], prefs.theme, (v) => up({ theme: v }), t('set.theme')),
        toggle(t('set.mono'), prefs.mono !== false, (v) => up({ mono: v }), t('set.monoHint')),
        h('div', { class: 'l-label' }, t('set.lang')),
        segmented([{ value: '', label: t('set.lang.sys') }, { value: 'ru', label: 'Русский' }, { value: 'uz', label: 'Oʻzbekcha' }, { value: 'en', label: 'English' }], prefs.lang || '', (v) => up({ lang: v }), t('set.lang')),
        h('div', { class: 'l-label' }, t('set.align')),
        segmented([{ value: 'left', label: t('set.left') }, { value: 'center', label: t('set.center') }, { value: 'right', label: t('set.right') }], prefs.align, (v) => up({ align: v }), t('set.align')),
        scaleRow(t('set.clockScale'), 'clockScale', 60, 140),
        scaleRow(t('set.uiScale'), 'uiScale', 60, 130),
        toggle(t('set.hour12'), prefs.hour12, (v) => up({ hour12: v })),
        toggle(t('set.status'), prefs.status, (v) => up({ status: v }), t('set.statusHint')),
      ));

      // — Церковный режим и крест —
      const crosses = church ? h('div', { class: 'l-cross-picks', role: 'radiogroup', 'aria-label': t('set.cross') },
        [...CROSS_IDS, 'none'].map((id) => h('button', { class: `l-cross-pick ${prefs.cross === id ? 'on' : ''}`, role: 'radio', 'aria-checked': String(prefs.cross === id),
          'aria-label': t('cross.' + id), onclick: keep(() => up({ cross: id })) },
          h('span', { class: 'l-cross-ico', html: id === 'none' ? '' : crossSVG(id) }), h('small', {}, t('cross.' + id))))) : null;
      body.append(S('look', t('set.churchSec'),
        toggle(t('set.church'), prefs.church, (v) => up({ church: v }), t('set.churchHint')),
        crosses ? h('div', { class: 'l-label' }, t('set.cross')) : null, crosses,
        church && prefs.cross !== 'none' ? h('div', { class: 'l-label' }, t('set.crossAt')) : null,
        church && prefs.cross !== 'none' ? segmented(CROSS_PLACES.map((v) => ({ value: v, label: t('crossAt.' + v) })), prefs.crossAt || 'center', (v) => up({ crossAt: v }), t('set.crossAt')) : null,
        // толщина и непрозрачность: двигается — крест на главном меняется сразу; двойное касание — 100 %
        church && prefs.cross !== 'none' ? scaleRow(t('set.crossWeight'), 'crossWeight', 50, 300) : null,
        church && prefs.cross !== 'none' ? scaleRow(t('set.crossOpacity'), 'crossOpacity', 20, 300) : null,
      ));

      // — Раскладка: главный экран и «Все приложения» —
      
      // — Скрытые приложения: нигде не видны; здесь — открыть или вернуть —
      // одна строка-папка: внутри — список (открыть, вернуть) и «Скрыть приложение»
      const hid = hiddenApps();
      body.append(S('home', t('hide.title'),
        h('button', { class: 'l-folder-row', onclick: () => hiddenSheet(rerender) },
          h('span', { class: 'l-folder-ico', html: iconSVG('lock') || iconSVG('folder') }),
          h('span', { class: 'l-folder-t' }, hid.length ? hid.slice(0, 3).map((a) => a.label).join(', ') + (hid.length > 3 ? ' …' : '') : t('hide.none')),
          hid.length ? h('span', { class: 'l-folder-n' }, t('hide.n', { n: hid.length })) : null,
          h('span', { class: 'l-folder-go', 'aria-hidden': 'true' }, '›')),
      ));

      // — Главный экран: приложения —
      const homeList = h('div', { class: 'l-edit-list' });
      homeItems().forEach((item, i, all) => {
        homeList.append(h('div', { class: 'l-edit-row' },
          h('button', { class: 'l-edit-main', onclick: () => editHomeItem(i, rerender) }, h('span', {}, item.label || nameOf(item.key)), item.label ? h('small', {}, nameOf(item.key)) : null),
          h('button', { class: 'l-lay-btn', 'aria-label': t('set.up'), disabled: i === 0, onclick: keep(() => { move(ownHome(), i, -1); save(); changed(); rerender(); }) }, '↑'),
          h('button', { class: 'l-lay-btn', 'aria-label': t('set.down'), disabled: i === all.length - 1, onclick: keep(() => { move(ownHome(), i, 1); save(); changed(); rerender(); }) }, '↓')));
      });
      body.append(S('home', t('set.home'),
        h('p', { class: 'l-hint' }, t('set.homeHint'), ' ', t('home.count', { n: homeItems().length, max: HOME_MAX })),
        homeList,
        appIconsAvailable() ? toggle(t('set.appIcons'), prefs.appIcons, (v) => up({ appIcons: v }), t('set.appIconsHint')) : null,
        h('button', { class: 'l-btn', onclick: () => pickHome(() => { changed(); rerender(); }) }, '＋ ' + t('home.pick')),
      ));

      // — Значки внизу и плеер —
      const dockList = h('div', { class: 'l-edit-list' });
      dockSlots().forEach((slot, i) => {
        dockList.append(h('div', { class: 'l-edit-row' },
          h('button', { class: 'l-slot-ico', 'aria-label': t('pick.icon'), html: iconSVG(slot.icon), onclick: () => pickIcon(slot.icon, (id) => { ownDock()[i].icon = id; save(); changed(); rerender(); }) }),
          h('button', { class: 'l-edit-main', onclick: () => pickAction(slot.action, (a) => { ownDock()[i].action = a; save(); changed(); rerender(); }) }, h('span', {}, describeAction(slot.action, appName))),
          h('button', { class: 'l-lay-btn', 'aria-label': t('set.remove'), onclick: keep(() => { ownDock().splice(i, 1); save(); changed(); rerender(); }) }, '×')));
      });
      body.append(S('home', t('set.dock'),
        dockList,
        dockSlots().length < 6 ? h('button', { class: 'l-btn', onclick: () => { ownDock().push({ icon: 'grid', action: { t: 'cmd', id: 'drawer' } }); save(); changed(); rerender(); } }, t('set.dockAdd')) : null,
      ));

      // — Все приложения: где папки и нужна ли вкладка «Все» —
      body.append(S('home', t('set.drawer'),
        h('div', { class: 'l-label' }, t('set.foldTabs')),
        segmented([{ value: 'side', label: t('set.foldTabs.side') }, { value: 'top', label: t('set.foldTabs.top') }], prefs.foldTabs === 'top' ? 'top' : 'side', (v) => up({ foldTabs: v }), t('set.foldTabs')),
        prefs.foldTabs === 'top' ? toggle(t('set.foldLabels'), prefs.foldLabels !== false, (v) => up({ foldLabels: v }), t('set.foldLabelsHint')) : null,
        toggle(t('set.drawerAll'), prefs.drawerAll !== false, (v) => up({ drawerAll: v }), t('set.drawerAllHint')),
      ));

      // — Мост с Melete: чтение и практика —
      const br = meleteBridge();
      const mel = h('div', {});
      mel.append(h('p', { class: 'l-hint' }, t(isNative() ? 'mel.howFolder' : 'mel.howFile')));
      // живая связь (docs/launcher-bridge.md): пришло ли состояние от Melete
      if (isNative()) {
        const lv = meleteLive();
        mel.append(h('p', { class: 'l-hint l-mel-live' }, lv
          ? t('mel.live', { what: lv.session ? t('tr.live') : lv.sounding ? t('tr.playing') : t('mel.quiet'), min: Math.round((Date.now() - lv.at) / 60e3) })
          : t('mel.liveNone')));
      }
      if (br?.data) mel.append(h('p', { class: 'l-hint' }, t('mel.state', { src: br.source === 'folder' ? t('mel.folder') : br.fileName || t('mel.file'), when: new Date(br.readAt).toLocaleString() })));
      mel.append(h('div', { class: 'l-btn-row' },
        h('button', { class: 'l-btn', onclick: async () => {
          try { await connectMelete(); toast(t('mel.connected')); changed(); rerender(); } catch (e) {
            if (String(e?.message) !== 'cancelled') toast(String(e?.message).startsWith('not found') ? t('mel.noFile') : t('mel.fail'));
          }
        } }, br ? t(isNative() ? 'mel.again' : 'mel.againFile') : t(isNative() ? 'mel.pick' : 'mel.pickFile')),
        br && isNative() ? h('button', { class: 'l-btn', onclick: async () => { try { await refreshMelete(true); toast(t('mel.updated')); changed(); rerender(); } catch { toast(t('mel.fail')); } } }, t('mel.refresh')) : null,
        br ? h('button', { class: 'l-btn danger', onclick: () => { disconnectMelete(); changed(); rerender(); } }, t('mel.off')) : null));
      body.append(S('home', t(church ? 'set.tracker.church' : 'set.tracker'),
        h('p', { class: 'l-hint' }, t(church ? 'mel.whatChurch' : 'mel.what')),
        mel,
        br ? toggle(t('set.trackerShow'), prefs.tracker, (v) => up({ tracker: v })) : null,
      ));


      // — Жесты —
      const gList = h('div', { class: 'l-edit-list' });
      GESTURES.forEach((id) => gList.append(h('div', { class: 'l-edit-row' },
        h('span', { class: 'l-glyph', 'aria-hidden': 'true', html: GESTURE_ICONS[id] || '' }),
        h('button', { class: 'l-edit-main', onclick: () => pickAction(gestureOf(id), (a) => { prefs.gestures[id] = a; save(); rerender(); }) },
          h('span', {}, t('gest.' + id)), h('small', {}, '→ ' + describeAction(gestureOf(id), appName))))));
      body.append(S('gestures', t('set.gestures'), gList, h('p', { class: 'l-hint' }, t('set.gesturesHint'))));

      // — Данные: копия кошелька, блокнота и настроек —
      const copies = h('div', { class: 'l-copies' });
      localCopies().then((list) => {
        if (!list.length) return;
        copies.append(h('div', { class: 'l-label' }, t('data.local')), ...list.map((c) => {
          const n = summary(c);
          return h('button', { class: 'l-pick', onclick: () => askRestore(c, rerender) },
            h('span', {}, new Date(c.at).toLocaleString(getLang() === 'en' ? 'en-GB' : getLang() === 'uz' ? 'uz-Latn' : 'ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }),
              c.why === 'before-restore' ? ' · ' + t('data.before') : ''),
            h('small', {}, t('data.counts', { n: n.notes, r: n.recs })));
        }));
      });
      body.append(S('data', t('set.data'),
        h('p', { class: 'l-hint' }, t('data.hint')),
        h('div', { class: 'l-btn-row' },
          h('button', { class: 'l-btn primary', onclick: () => saveFile().then(() => toast(t('data.saved')), (e) => { if (!/cancel/i.test(String(e?.message || e))) toast(t('data.err')); }) }, t('data.save')),
          h('button', { class: 'l-btn', onclick: () => pickFile().then((c) => askRestore(c, rerender), (e) => { if (!/cancel/i.test(String(e?.message || e))) toast(t('data.bad')); }) }, t('data.load'))),
        copies));

      // — Обновление — свой раздел перерисовывается сам по событиям загрузки, остальные настройки не трогаются
      if (updAvailable()) {
        const updSec = () => {
          const u = updState();
          const st = u.st === 'avail' ? t('upd.avail', { n: u.info.build }) : u.st === 'down' ? t(u.wait ? 'upd.net' : 'upd.down', { p: Math.round(u.f * 100) }) : u.st === 'nowifi' ? t('upd.wait')
            : u.st === 'ready' ? t('upd.readyShort') : u.st === 'none' ? t('upd.none') : u.st === 'err' ? t('upd.err') : u.st === 'checking' ? t('upd.checking') : '';
          return S('data', t('set.upd'),
            h('p', { class: 'l-hint' }, t('upd.build', { ch: CHANNEL, n: BUILD }), st ? ' · ' + st : ''),
            segmented([{ value: 'auto', label: t('upd.auto') }, { value: 'button', label: t('upd.button') }], prefs.updMode, (v) => { setPrefs({ updMode: v }); changed(); swap(); }, t('set.upd')),
            toggle(t('upd.mobile'), prefs.updMobile, (v) => { setPrefs({ updMobile: v }); changed(); if (v && updState().st === 'nowifi') download(); }),
            h('div', { class: 'l-btn-row' },
              u.st === 'avail' || u.st === 'nowifi' ? h('button', { class: 'l-btn primary', onclick: () => download() }, t('upd.get')) : null,
              u.st === 'ready' ? h('button', { class: 'l-btn primary', onclick: () => install() }, t('upd.install')) : null,
              ['avail', 'down', 'ready', 'nowifi'].includes(u.st) ? null : h('button', { class: 'l-btn', onclick: () => check() }, t('upd.check'))));
        };
        let updEl = updSec();
        const swap = () => { if (!updEl.isConnected) return; const n = updSec(); updEl.replaceWith(n); updEl = n; };
        body.append(updEl);
        unbindUpd?.();
        unbindUpd = onUpdate(swap);
      }

      // — Главный экран телефона —
      const sys = h('div', {});
      if (isNative()) {
        Launcher.homeState().then((hs) => {
          sys.append(h('p', { class: 'l-hint' }, t(hs.isDefault ? 'set.sys.isDefault' : 'set.sys.notDefault')),
            h('button', { class: 'l-btn', onclick: () => Launcher.openHomeSettings() }, t('set.sys.choose')));
        }).catch(() => {});
      }
      body.append(S('data', t('set.sys'),
        sys,
        h('div', { class: 'l-btn-row' },
          h('button', { class: 'l-btn danger', onclick: () => { if (confirm(t('set.resetAsk'))) { resetPrefs(); changed(); rerender(); } } }, t('set.reset'))),
        h('p', { class: 'l-colophon' }, 'Ἐλάχιστον', church ? h('small', {}, t('about.motto')) : null),
        // лицензии: код — GPL-3.0, шрифты — SIL OFL, карта — общественное достояние (LICENSES.md)
        h('button', { class: 'l-ex-link l-lic', onclick: () => openUrl('https://github.com/veracerkof-debug/melete-app/blob/main/LICENSES.md', t('about.lic')) }, h('span', {}, t('about.lic')), h('small', {}, 'github.com'))));

      // четыре страницы: показываем только секции текущей вкладки; переключатель — сверху, всегда на виду
      const tab = TABS.includes(prefs.setTab) ? prefs.setTab : 'look';
      body.querySelectorAll('section.l-sec').forEach((sec) => { if (sec.dataset.tab !== tab) sec.remove(); });
      goTab = (id, dir) => {
        if (id === prefs.setTab) return;
        const from = TABS.indexOf(prefs.setTab);
        setPrefs({ setTab: id }); rerender(); body.scrollTop = 0; body.parentElement.scrollTop = 0;
        // новая страница въезжает со стороны, куда листали
        const side = dir || (TABS.indexOf(id) > from ? 'left' : 'right');
        body.classList.add('l-tab-in-' + side); setTimeout(() => body.classList.remove('l-tab-in-' + side), 320);
      };
      body.prepend(h('nav', { class: 'l-set-tabs', role: 'tablist', 'aria-label': t('set.sections') }, TABS.map((id) =>
        h('button', { class: id === tab ? 'on' : '', role: 'tab', 'aria-selected': String(id === tab), onclick: () => goTab(id) }, t('tab.' + id)))));
    },
  });
}

// Загрузить копию: что в ней — и подтверждение; текущее перед этим само сохраняется копией на телефоне
function askRestore(c, after) {
  const n = summary(c);
  if (!confirm(t('data.ask', { d: new Date(c.at).toLocaleDateString(), n: n.notes, r: n.recs }))) return;
  restore(c).then(() => { toast(t('data.restored')); setTimeout(() => location.reload(), 600); after?.(); });
}

// ползунок размера: двигается — главный экран меняется сразу; двойное касание — 100 %
function scaleRow(label, key, min, max) {
  const val = h('span', { class: 'l-scale-v' }, (prefs[key] || 100) + ' %');
  const input = h('input', { type: 'range', class: 'l-scale', min, max, step: 5, value: prefs[key] || 100, 'aria-label': label });
  const set = (v) => { prefs[key] = v; val.textContent = v + ' %'; applyLook(); };
  input.addEventListener('input', () => set(+input.value));
  input.addEventListener('change', () => { save(); changed(); });
  input.addEventListener('dblclick', () => { input.value = 100; set(100); save(); changed(); });
  return h('div', { class: 'l-scale-row' }, h('div', { class: 'l-label' }, label, ' ', val), input);
}

// Подпись приложения на главном (удержание названия)
// Скрытые приложения — своя папка: поиск, касание — открыть (скрытое не видно больше нигде), «Вернуть», «Скрыть ещё»
function hiddenSheet(after) {
  let q = '';
  openSheet({
    title: t('hide.title'), kicker: '', full: true,
    render(body, close) {
      const listEl = h('div', { class: 'l-edit-list' });
      const draw = () => {
        const ql = q.trim().toLowerCase();
        const hid = hiddenApps().filter((a) => !ql || a.label.toLowerCase().includes(ql) || (a.sys || '').toLowerCase().includes(ql));
        listEl.replaceChildren(...(hid.length ? hid.map((a) => h('div', { class: 'l-edit-row' },
          h('button', { class: 'l-edit-main', onclick: () => { openApp(a); } }, h('span', {}, a.label), a.sys && a.sys !== a.label ? h('small', {}, a.sys) : null),
          h('button', { class: 'l-btn l-hide-back', onclick: () => { setHidden(a.key, false); changed(); after(); draw(); } }, t('hide.back'))))
          : [h('p', { class: 'l-empty' }, t('hide.none'))]));
      };
      body.append(...[
        h('p', { class: 'l-hint' }, t('hide.sheetHint')),
        hiddenApps().length > 6 ? h('input', { class: 'l-search', type: 'search', placeholder: t('drawer.search'), 'aria-label': t('drawer.search'), oninput: (e) => { q = e.target.value; draw(); } }) : null,
        listEl,
        h('button', { class: 'l-btn', onclick: () => pickAction(null, (a) => { setHidden(a.key, true); changed(); after(); draw(); toast(t('hide.done')); }, { appsOnly: true }) }, '＋ ' + t('hide.add'))].filter(Boolean));
      draw();
    },
  });
}

export function editHomeItem(i, after, onChange = changed) {
  const item = homeItems()[i];
  if (!item) return;
  openSheet({
    title: t('set.item'),
    render(body, close, rerender) {
      const app = appOf(item.key);
      const commit = (fn) => { fn(ownHome()[i]); save(); onChange(); after?.(); };
      body.append(...[
        // название: у приложения — общее, для всех мест сразу (пустое — системное); у папки — имя папки
        app ? field(t('ren.name'), (prefs.names || {})[item.key] || item.label || '', (v) => { renameApp(item.key, v); onChange(); after?.(); }, { placeholder: systemName(item.key), maxlength: 40 })
          : field(t('set.itemLabel'), item.label, (v) => commit((x) => { x.label = v; }), { placeholder: nameOf(item.key), maxlength: 40 }),
        // значок у названия: свой из набора, родной любого приложения или без значка
        h('button', { class: 'l-pick', onclick: () => pickIcon(item.icon || null, (id) => { commit((x) => { x.icon = id || undefined; }); rerender(); }, { none: true }) },
          item.icon ? h('span', { class: 'l-pick-ico', html: iconSVG(item.icon) }) : null, h('span', {}, t('set.itemIcon'))),
        h('button', { class: 'l-pick', onclick: () => pickAction({ t: 'app', key: item.key }, (a) => { commit((x) => { x.key = a.key; }); rerender(); }, { appsOnly: true }) },
          h('span', {}, t('set.itemOpens', { name: app?.label || '—' }))),
        h('div', { class: 'l-btn-row' },
          h('button', { class: 'l-btn', disabled: i === 0, onclick: () => { move(ownHome(), i, -1); save(); onChange(); close(); } }, '↑ ' + t('set.up')),
          h('button', { class: 'l-btn', disabled: i === homeItems().length - 1, onclick: () => { move(ownHome(), i, 1); save(); onChange(); close(); } }, '↓ ' + t('set.down')),
          h('button', { class: 'l-btn danger', onclick: () => { ownHome().splice(i, 1); save(); onChange(); close(); } }, t('set.remove'))),
        app ? h('button', { class: 'l-pick danger', onclick: () => { setHidden(item.key, true); onChange(); close(); toast(t('hide.done')); } }, h('span', {}, t('hide.app'))) : null,
      ].filter(Boolean)); // папка — без «Скрыть приложение» (и без текста «null»)
    },
  });
}

// Значок внизу (удержание значка)
export function editDockSlot(i, onChange) {
  const slot = dockSlots()[i];
  if (!slot) return;
  openSheet({
    title: t('set.slot'),
    render(body, close, rerender) {
      const cur = dockSlots()[i];
      body.append(
        h('button', { class: 'l-pick', onclick: () => pickIcon(cur.icon, (id) => { ownDock()[i].icon = id; save(); onChange(); rerender(); }) },
          h('span', { class: 'l-pick-ico', html: iconSVG(cur.icon) }), h('span', {}, t('set.slotIcon'))),
        h('button', { class: 'l-pick', onclick: () => pickAction(cur.action, (a) => { ownDock()[i].action = a; save(); onChange(); rerender(); }) },
          h('span', {}, t('set.slotAction', { what: describeAction(cur.action, appName) }))),
        h('button', { class: 'l-btn danger', onclick: () => { ownDock().splice(i, 1); save(); onChange(); close(); } }, t('set.slotRemove')),
      );
    },
  });
}
