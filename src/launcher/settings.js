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
import { CLOCK_FONTS, clockFont } from './clockfonts.js';
import { STYLES, styleOf } from './styles.js';
import { readDiag, summarize, shareDiag, clearDiag } from './diag.js';
import { homeItems, dockSlots, appOf, appName, hiddenApps, setHidden, renameApp, systemName } from './apps.js';
import { folderOfKey, folderName } from './folders.js';
import { isNative, Launcher } from './native.js';
import { applyLook } from './look.js';
import { layout, setLayout } from './layout.js';
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
// поиск по настройкам («Фокус»): строка над вкладками ищет по всем разделам сразу
let setQ = '';
export const setSettingsQuery = (q) => { setQ = q || ''; };
const S = (tab, title, ...kids) => { const el = section(title, '', ...kids); el.dataset.tab = tab; return el; };

export function openSettings(onChange, getGesture, tab) {
  changed = onChange;
  gestureOf = getGesture;
  if (TABS.includes(tab)) setPrefs({ setTab: tab });
  let unbindUpd = null;
  let goTab = () => {};
  openSheet({
    title: t('set.title'), full: true,
    onClose: () => { unbindUpd?.(); setQ = ''; },
    onSwipe: (dir) => { const i = TABS.indexOf(prefs.setTab); const n = TABS[i + (dir === 'left' ? 1 : -1)]; if (n) goTab(n, dir); },
    render(body, _close, rerender) {
      const church = isChurch(); // мог переключиться прямо здесь
      const up = (patch) => { setPrefs(patch); changed(); rerender(); };
      const keep = (fn) => () => { const sc = body.parentElement, y = sc.scrollTop; fn(); requestAnimationFrame(() => { sc.scrollTop = y; }); };

      // — Вид: тема, язык, размеры, сторона, своя строка состояния —
      // устройство лаунчера: как составил автор или «Фокус» (предложение Claude) — у каждого своя раскладка
      body.append(S('look', t('set.variant'),
        segmented([{ value: 'author', label: t('variant.author') }, { value: 'claude', label: t('variant.claude') }], prefs.variant === 'claude' ? 'claude' : 'author', (v) => { setQ = ''; up({ variant: v }); }, t('set.variant')),
        h('p', { class: 'l-hint' }, t(prefs.variant === 'claude' ? 'variant.claudeHint' : 'variant.authorHint'))));
      body.append(S('look', t('set.appearance'),
        h('div', { class: 'l-label' }, t('set.theme')),
        segmented([{ value: 'system', label: t('theme.system') }, { value: 'light', label: t('theme.light') }, { value: 'dark', label: t('theme.dark') }, { value: 'oled', label: 'OLED' }], prefs.theme, (v) => up({ theme: v }), t('set.theme')),
        toggle(t('set.mono'), prefs.mono !== false, (v) => up({ mono: v }), t('set.monoHint')),
        h('div', { class: 'l-label' }, t('set.lang')),
        segmented([{ value: '', label: t('set.lang.sys') }, { value: 'ru', label: 'Русский' }, { value: 'uz', label: 'Oʻzbekcha' }, { value: 'en', label: 'English' }], prefs.lang || '', (v) => up({ lang: v }), t('set.lang')),
        h('div', { class: 'l-label' }, t('set.align')),
        segmented([{ value: 'left', label: t('set.left') }, { value: 'center', label: t('set.center') }, { value: 'right', label: t('set.right') }], prefs.align, (v) => up({ align: v }), t('set.align')),
        // стиль главного: плитка — маленький образец; «Классика» — по умолчанию
        h('div', { class: 'l-label' }, t('set.style')),
        h('div', { class: 'l-styles', role: 'radiogroup', 'aria-label': t('set.style') },
          ...STYLES.map((st) => h('button', { class: 'l-style' + (styleOf().id === st.id ? ' on' : ''), role: 'radio', 'aria-checked': String(styleOf().id === st.id), onclick: () => up({ style: st.id }) },
            h('span', { class: 'l-pv', 'aria-hidden': 'true', html: PREVIEW[st.id] }),
            h('small', {}, t('style.' + st.id))))),
        styleOf().accent && prefs.mono !== false ? h('p', { class: 'l-hint' }, t('style.monoHint')) : null,
        toggle(t('set.wheel'), prefs.homeWheel, (v) => up({ homeWheel: v }), t('set.wheelHint')),
        prefs.homeWheel ? segmented([{ value: 'arc', label: t('wheel.arc') }, { value: 'dial', label: t('wheel.dial') }], prefs.wheelShape === 'dial' ? 'dial' : 'arc', (v) => up({ wheelShape: v }), t('set.wheel')) : null,
        toggle(t('set.bulge'), prefs.bulge, (v) => up({ bulge: v }), t('set.bulgeHint')),
        toggle(t('set.scrub'), prefs.scrub, (v) => up({ scrub: v }), t('set.scrubHint')),
        // шрифт часов: каждая плитка — часы этим шрифтом
        h('div', { class: 'l-label' }, t('set.clockFont')),
        h('div', { class: 'l-clockfonts', role: 'radiogroup', 'aria-label': t('set.clockFont') },
          ...CLOCK_FONTS.map((f) => h('button', { class: 'l-clockfont' + (clockFont(prefs.clockFont).id === f.id ? ' on' : ''), role: 'radio', 'aria-checked': String(clockFont(prefs.clockFont).id === f.id), onclick: () => up({ clockFont: f.id }) },
            h('span', { class: 'l-clockfont-n', style: { fontFamily: f.family + ', var(--l-display)', fontWeight: String(f.weight), letterSpacing: f.track, fontVariantNumeric: f.num || 'tabular-nums' } }, prefs.hour12 ? '9:41' : '21:41'),
            h('small', {}, t('cf.' + f.id))))),
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
        layout().hide.apps ? h('div', { class: 'l-warn' }, h('span', {}, t('home.blockOff')), h('button', { class: 'l-btn primary', onclick: () => { setLayout({ hide: { ...layout().hide, apps: false } }); changed(); rerender(); } }, t('home.blockOn'))) : null,
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
        toggle(t('set.drawerSearch'), prefs.drawerSearch === true, (v) => up({ drawerSearch: v }), t('set.drawerSearchHint')),
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
      // — Сбои и журнал: сводка за неделю, отчёт файлом, сам журнал —
      const diagInfo = h('p', { class: 'l-hint' }, t('diag.reading'));
      readDiag().then(({ text }) => {
        const d = summarize(text);
        diagInfo.textContent = diagLine(d);
      });
      body.append(S('data', t('diag.title'),
        h('p', { class: 'l-hint' }, t('diag.hint')),
        diagInfo,
        h('div', { class: 'l-btn-row' },
          h('button', { class: 'l-btn primary', onclick: async () => {
            const { text } = await readDiag();
            try { await shareDiag(diagLine(summarize(text))); } catch { toast(t('diag.fail')); }
          } }, t('diag.send')),
          h('button', { class: 'l-btn', onclick: () => diagSheet() }, t('diag.show')))));

      body.append(S('data', t('set.sys'),
        sys,
        h('div', { class: 'l-btn-row' },
          h('button', { class: 'l-btn danger', onclick: () => { if (confirm(t('set.resetAsk'))) { resetPrefs(); changed(); rerender(); } } }, t('set.reset'))),
        h('p', { class: 'l-colophon' }, 'Ἐλάχιστον', church ? h('small', {}, t('about.motto')) : null),
        // лицензии: код — GPL-3.0, шрифты — SIL OFL, карта — общественное достояние (LICENSES.md)
        h('button', { class: 'l-ex-link l-lic', onclick: () => openUrl('https://github.com/veracerkof-debug/melete-app/blob/main/LICENSES.md', t('about.lic')) }, h('span', {}, t('about.lic')), h('small', {}, 'github.com'))));

      // четыре страницы: показываем только секции текущей вкладки; переключатель — сверху, всегда на виду
      const tab = TABS.includes(prefs.setTab) ? prefs.setTab : 'look';
      const q = prefs.variant === 'claude' ? setQ.trim().toLowerCase() : '';
      if (q) {
        // поиск: разделы всех вкладок, где есть искомое; у раздела — вкладка, откуда он
        // сначала — по названиям (заголовок, подписи, переключатели, кнопки); нет таких — по всему тексту раздела
        const NAMES = 'h3, .l-label, .l-row-main > span, .l-btn, .l-folder-t, .l-seg button, .l-style small, .l-clockfont small';
        const secs = [...body.querySelectorAll('section.l-sec')];
        const byName = secs.filter((sec) => [...sec.querySelectorAll(NAMES)].some((n) => n.textContent.toLowerCase().includes(q)));
        const keep = new Set(byName.length ? byName : secs.filter((sec) => sec.textContent.toLowerCase().includes(q)));
        secs.forEach((sec) => {
          if (!keep.has(sec)) { sec.remove(); return; }
          sec.prepend(h('div', { class: 'l-kicker' }, t('tab.' + sec.dataset.tab)));
        });
        if (!body.querySelector('section.l-sec')) body.append(h('p', { class: 'l-empty' }, t('drawer.none')));
      } else body.querySelectorAll('section.l-sec').forEach((sec) => { if (sec.dataset.tab !== tab) sec.remove(); });
      goTab = (id, dir) => {
        if (id === prefs.setTab) return;
        const from = TABS.indexOf(prefs.setTab);
        setPrefs({ setTab: id }); rerender(); body.scrollTop = 0; body.parentElement.scrollTop = 0;
        // новая страница въезжает со стороны, куда листали
        const side = dir || (TABS.indexOf(id) > from ? 'left' : 'right');
        body.classList.add('l-tab-in-' + side); setTimeout(() => body.classList.remove('l-tab-in-' + side), 320);
      };
      if (!q) body.prepend(h('nav', { class: 'l-set-tabs', role: 'tablist', 'aria-label': t('set.sections') }, TABS.map((id) =>
        h('button', { class: id === tab ? 'on' : '', role: 'tab', 'aria-selected': String(id === tab), onclick: () => goTab(id) }, t('tab.' + id)))));
      if (prefs.variant === 'claude') {
        const inp = h('input', { class: 'l-search l-set-find', type: 'search', placeholder: t('set.find'), 'aria-label': t('set.find'), value: setQ,
          oninput: (e) => { setQ = e.target.value; rerender(); } });
        body.prepend(inp);
        // после перерисовки — снова в поле, курсор в конце
        if (setQ) requestAnimationFrame(() => { const n = body.querySelector('.l-set-find'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } });
      }
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
// образцы стилей для выбора — маленькие схемы, без картинок
const PV = (bg, body) => `<span style="position:absolute;inset:0;background:${bg}">${body}</span>`;
const T = (css, txt = '') => `<span style="position:absolute;${css}">${txt}</span>`;
const PREVIEW = {
  classic: PV('#F3F2EE', T('right:8px;top:12px;font:300 22px/1 var(--l-display);color:#161514', '21:41') + T('right:8px;top:38px;width:36px;height:3px;background:#C6C3BC') + [0, 1, 2].map((i) => T(`right:8px;bottom:${12 + i * 11}px;width:${30 - i * 6}px;height:4px;background:#161514`)).join('')),
  strip: PV('#232323', T('right:0;top:0;bottom:0;width:22%;background:#B5474F') + [0, 1, 2, 3].map((i) => T(`right:7%;top:${24 + i * 14}px;width:7px;height:7px;border:1px solid #fff;border-radius:2px`)).join('')
    + T('left:8px;top:16px;width:2px;height:16px;background:#B5474F') + T('left:13px;top:16px;font:600 13px/1 var(--l-display);color:#F1EFEC', '06:03') + T('left:8px;top:46px;width:2px;height:16px;background:#B5474F') + T('left:13px;top:48px;font:600 12px/1 var(--l-display);color:#F1EFEC', '26%')),
  soft: PV('#E6E8EE', T('left:50%;top:14px;transform:translateX(-50%);padding:6px 10px;border-radius:12px;background:#E6E8EE;box-shadow:4px 4px 8px rgba(163,170,190,.6),-4px -4px 8px #fff;font:200 20px/1 var(--l-display);color:#3B4256', '60')
    + T('left:50%;bottom:12px;transform:translateX(-50%);width:28px;height:28px;border-radius:50%;background:#E6E8EE;box-shadow:3px 3px 6px rgba(163,170,190,.6),-3px -3px 6px #fff')),
  term: PV('#0A0A0A', T('left:6px;right:6px;top:8px;height:34px;border:1px solid #262626;border-radius:6px;background:#151515') + T('left:12px;top:15px;font:400 9px/1 monospace;color:#3DDC84', '+15,256')
    + T('left:6px;right:6px;top:48px;height:36px;border:1px solid #262626;border-radius:6px;background:#151515') + [...Array(14)].map((_, i) => T(`left:${12 + (i % 7) * 9}px;top:${56 + Math.floor(i / 7) * 9}px;width:6px;height:6px;background:${i % 3 ? '#ECECEC' : '#333'}`)).join('')),
  menu: PV('#E7E7EA', T('left:5px;top:6px;bottom:6px;width:16px;border-radius:8px;background:#F7F7F8') + T('left:25px;right:5px;top:6px;bottom:6px;border-radius:10px;background:#F7F7F8')
    + T('left:31px;top:28px;width:44px;height:9px;border-radius:5px;background:#1E1E22') + [0, 1, 2].map((i) => T(`left:31px;top:${44 + i * 11}px;width:${34 - i * 5}px;height:4px;background:#A9A9B0`)).join('')),
  inst: PV('#E9E8E4', T('left:7px;right:7px;top:8px;height:40px;border-radius:9px;background:#F3F2EF;box-shadow:0 2px 6px rgba(0,0,0,.1)') + T('left:13px;top:15px;padding:3px 5px;border-radius:4px;background:#D3D6CC;font:700 13px/1 monospace;color:#1C1C1B', '10:00')
    + T('right:12px;top:14px;width:18px;height:26px;background-image:radial-gradient(circle,rgba(0,0,0,.3) 1px,transparent 1.3px);background-size:4px 4px') + T('left:7px;top:54px;width:30px;height:30px;border-radius:50%;background:#161616') + T('left:42px;top:62px;width:14px;height:14px;border-radius:50%;background:#F26A1B') + T('right:7px;top:54px;width:30px;height:30px;border-radius:7px;background:#F3F2EF;box-shadow:0 2px 5px rgba(0,0,0,.1)')),
  panel: PV('#000', [0, 1, 2].map((i) => T(`left:5px;right:5px;top:${6 + i * 28}px;height:24px;border-radius:5px;background:#D9D9D6`)).join('') + T('left:10px;top:9px;font:600 14px/1 var(--l-display);color:#111', '19:53')
    + T('right:10px;top:40px;width:26px;height:10px;border-radius:2px;background:#C0602E') + [...Array(8)].map((_, i) => T(`right:${10 + i * 4}px;top:66px;width:2px;height:12px;background:${i < 2 ? '#888' : '#111'}`)).join('')),
  tele: PV('#000', T('left:8px;top:10px;font:700 15px/1 var(--l-display);color:#fff', '67%') + [...Array(6)].map((_, i) => T(`left:${8 + i * 7}px;top:30px;width:5px;height:3px;background:${i < 4 ? '#E10600' : '#333'}`)).join('')
    + T('right:8px;top:8px;width:30px;height:30px;border-radius:50%;border:2px dashed #E10600') + T('left:6px;right:6px;bottom:10px;height:30px;background:linear-gradient(180deg,rgba(225,6,0,.5),transparent);clip-path:polygon(0 70%,20% 40%,40% 55%,60% 20%,80% 35%,100% 10%,100% 100%,0 100%)')),
  cont: PV('#DDE3DC', T('left:6px;right:6px;top:8px;height:24px;border:1.5px solid #161816;border-radius:12px') + T('left:13px;top:13px;font:400 12px/1 monospace;color:#161816', '19.0') + T('right:11px;top:12px;width:14px;height:14px;border-radius:50%;border:2px solid #161816;border-left-color:transparent')
    + T('right:6px;top:38px;width:26px;height:26px;border:1.5px solid #161816;border-radius:7px;font:700 13px/26px var(--l-display);text-align:center;color:#161816', '23') + [0, 1].map((i) => T(`left:6px;right:38px;top:${44 + i * 14}px;height:1.5px;background:#161816;opacity:.4`)).join('')),
  diary: PV('#EEECE5', T('left:0;right:0;top:9px;text-align:center;font:400 7px/1 monospace;letter-spacing:.12em;color:#2E3A55', 'НОЯБРЬ 2026') + T('left:0;right:0;top:20px;text-align:center;font:400 16px/1 monospace;color:#2E3A55', '18:46')
    + [0, 1, 2].map((i) => T(`left:10px;top:${46 + i * 14}px;width:3px;height:10px;background:linear-gradient(#3b3550,#e3a37f)`) + T(`left:17px;top:${48 + i * 14}px;width:${40 - i * 8}px;height:3px;background:#2E3A55;opacity:.5`) + T(`right:10px;top:${49 + i * 14}px;width:4px;height:4px;border-radius:50%;background:#C9826B`)).join('')),
  cli: PV('#012456', T('left:6px;top:9px;font:400 8.5px/1.5 monospace;color:#EEEDF0;white-space:pre', 'PS C:\\> <span style="color:#F9F1A5">Get-Date</span>\n<span style="color:#3BD671">Mode   Name\n----   ----</span>\n<span style="color:#A9B6D3">-a---</span>  notes\n<span style="background:#0A7E8C;color:#F9F1A5"> [oooo   ] </span>')),
};

// сводка журнала одной строкой (и в начало отчёта)
function diagLine(d) {
  const parts = [t('diag.week')];
  parts.push(d.crash ? t('diag.crash', { n: d.crash }) : t('diag.noCrash'));
  if (d.killed) parts.push(t('diag.killed', { n: d.killed }));
  if (d.gone) parts.push(t('diag.gone', { n: d.gone }));
  if (d.median != null) parts.push(t('diag.return', { ms: d.median, worst: d.worst }));
  if (d.slow) parts.push(t('diag.slow', { n: d.slow }));
  if (d.long) parts.push(t('diag.long', { n: d.long }));
  if (d.err) parts.push(t('diag.err', { n: d.err }));
  return parts.join(' · ');
}

// журнал целиком — свежее сверху
function diagSheet() {
  openSheet({
    title: t('diag.log'), kicker: '', full: true,
    render(body, close) {
      const pre = h('pre', { class: 'l-diag' }, t('diag.reading'));
      readDiag().then(({ head, text }) => { pre.textContent = head + '\n' + text.trim().split('\n').reverse().slice(0, 600).join('\n'); });
      body.append(pre, h('div', { class: 'l-btn-row' },
        h('button', { class: 'l-btn', onclick: async () => { await clearDiag(); close(); toast(t('diag.cleared')); } }, t('diag.clear'))));
    },
  });
}

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
