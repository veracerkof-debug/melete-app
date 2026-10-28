// Elachiston: настройки (удержание пустого места) — оформление и церковный режим, часы, обои, вид, дата, приложения,
// значки и плеер, мост с Melete, жесты, обновление, выбор главного экрана телефона.
import { prefs, save, setPrefs, resetPrefs, isChurch } from './data.js';
import { clocksFor, renderClock } from './clocks.js';
import { WALLPAPERS, drawPreview } from './wallpapers.js';
import { ORNAMENTS, iconSVG } from './icons.js';
import { GESTURES, GLYPHS } from './gestures.js';
import { describeAction, openUrl } from './actions.js';
import { pickIcon, pickAction } from './pickers.js';
import { homeItems, dockSlots, appOf, appName } from './apps.js';
import { placeOf } from './sun.js';
import { isNative, Launcher } from './native.js';
import { openMediaAccess, MEDIA_SESSIONS } from './nowplaying.js';
import { infoLink, clockEntry, wallEntry, ornamentEntry, markerEntry } from './explain.js';
import { clockOpts } from './home.js';
import { ACCENTS } from './look.js';
import { hueColor, ACCENT_HUE } from '../core/palettes.js';
import { fontsFor, fontStack, applyLook, MOTIONS } from './look.js';
import { meleteLive } from './melete.js';
import { layout, setLayout, resetLayout } from './layout.js';
import { saveFile, pickFile, restore, summary, localCopies } from './backup.js';
import { meleteBridge, connectMelete, refreshMelete, disconnectMelete } from './melete.js';
import { updAvailable, updState, onUpdate, check, download, install, CHANNEL, BUILD } from './update.js';
import { t, getLang } from './i18n.js';
import { h, openSheet, segmented, toggle, field, section, toast } from './ui.js';

let changed = () => {};
let gestureOf = () => null;

// главный экран и значки хранят свой список, только когда их изменили
const ownHome = () => (prefs.home = prefs.home || homeItems().map((x) => ({ ...x })));
const ownDock = () => (prefs.dock = prefs.dock || dockSlots().map((x) => ({ ...x, action: { ...x.action } })));
const move = (arr, i, d) => { const j = i + d; if (j >= 0 && j < arr.length) [arr[i], arr[j]] = [arr[j], arr[i]]; };

// вкладка настроек; секции помечены ею и показываются только на своей (четыре страницы — DECISIONS 2026-10-27)
const TABS = ['look', 'home', 'gestures', 'data'];
const S = (tab, ...args) => { const el = section(...args); el.dataset.tab = tab; return el; };

export function openSettings(onChange, getGesture, tab) {
  changed = onChange;
  gestureOf = getGesture;
  if (TABS.includes(tab)) setPrefs({ setTab: tab });
  const church = isChurch();
  let unbindUpd = null;
  let goTab = () => {};
  openSheet({
    title: t('set.title'), kicker: church ? 'τάξις' : '', full: true,
    onClose: () => unbindUpd?.(),
    onSwipe: (dir) => { const i = TABS.indexOf(prefs.setTab); const n = TABS[i + (dir === 'left' ? 1 : -1)]; if (n) goTab(n, dir); },
    render(body, _close, rerender) {
      const church = isChurch(); // мог переключиться прямо здесь
      const up = (patch) => { setPrefs(patch); changed(); rerender(); };
      const keep = (fn) => () => { const sc = body.parentElement, y = sc.scrollTop; fn(); requestAnimationFrame(() => { sc.scrollTop = y; }); };
      const now = new Date();

      // — Оформление и церковный режим —
      const sw = h('div', { class: 'l-swatches', role: 'radiogroup', 'aria-label': t('set.accent') });
      ACCENTS.forEach((a) => sw.append(h('button', { class: `l-swatch ${prefs.accent === a ? 'on' : ''}`, role: 'radio', 'aria-checked': prefs.accent === a ? 'true' : 'false',
        'aria-label': t('accent.' + a), style: { background: hueColor({ palette: 'classic' }, ACCENT_HUE[a]) }, onclick: keep(() => up({ accent: a })) })));
      body.append(S('look', t('set.appearance'), church ? 'μορφή' : '',
        h('div', { class: 'l-label' }, t('set.theme')),
        segmented([{ value: 'system', label: t('theme.system') }, { value: 'light', label: t('theme.light') }, { value: 'dark', label: t('theme.dark') }, { value: 'paper', label: t('theme.paper') }, { value: 'oled', label: 'OLED' }], prefs.theme, (v) => up({ theme: v }), t('set.theme')),
        toggle(t('set.bw'), prefs.bw, (v) => up({ bw: v }), t('set.bwHint')),
        h('div', { class: 'l-label' }, t('set.motion')),
        h('div', { class: 'l-motion-picks', role: 'radiogroup', 'aria-label': t('set.motion') }, MOTIONS.map((m) =>
          h('button', { class: `l-motion-pick m-${m} ${(prefs.motion || 'slide') === m ? 'on' : ''}`, role: 'radio', 'aria-checked': String((prefs.motion || 'slide') === m), onclick: keep(() => up({ motion: m })) },
            h('span', { class: 'l-motion-demo', 'aria-hidden': 'true' }, h('i'), h('b')), h('span', {}, t('motion.' + m)), h('small', {}, t('motion.' + m + '.hint'))))),
        prefs.bw ? null : h('div', { class: 'l-label' }, t('set.accent')), prefs.bw ? null : sw,
        h('div', { class: 'l-label' }, t('set.font')),
        h('div', { class: 'l-font-picks', role: 'radiogroup', 'aria-label': t('set.font') }, fontsFor(church).map((f) =>
          h('button', { class: `l-font-pick ${(prefs.font || 'onest') === f.id ? 'on' : ''}`, role: 'radio', 'aria-checked': String((prefs.font || 'onest') === f.id), onclick: keep(() => up({ font: f.id })) },
            h('b', { style: { fontFamily: fontStack(f.display) } }, '07:46'),
            h('span', { style: { fontFamily: fontStack(f.text) } }, t('font.' + f.id))))),
        h('div', { class: 'l-label' }, t('set.lang')),
        segmented([{ value: '', label: t('set.lang.sys') }, { value: 'ru', label: 'Русский' }, { value: 'uz', label: 'Oʻzbekcha' }, { value: 'en', label: 'English' }], prefs.lang || '', (v) => up({ lang: v }), t('set.lang')),
        toggle(t('set.church'), prefs.church, (v) => up({ church: v }), t('set.churchHint')),
      ));

      // — Часы —
      const opts = clockOpts();
      const clocks = h('div', { class: 'l-clock-picks' });
      clocksFor(opts).forEach((c) => clocks.append(h('button', { class: `l-clock-pick ${prefs.clock === c.id ? 'on' : ''}`, onclick: keep(() => up({ clock: c.id })) },
        h('div', { class: 'l-clock-mini clock', 'data-style': c.id, html: renderClock(c.id, now, opts) }),
        h('span', {}, t('clock.' + c.id)), church ? h('small', { lang: 'el' }, c.el) : null)));
      const place = placeOf(prefs);
      body.append(S('look', t('set.clock'), church ? 'ὡρολόγιον' : '',
        clocks,
        h('p', { class: 'l-hint' }, t('clock.' + prefs.clock + '.info'), ' ', infoLink(() => clockEntry(prefs.clock, church))),
        prefs.clock === 'biblical' ? h('div', { class: 'l-row' },
          h('span', { class: 'l-row-main' }, h('span', {}, t('set.place')), h('small', {}, place.approx ? t('set.placeApprox') : `${place.lat.toFixed(2)}°, ${place.lon.toFixed(2)}°`)),
          h('button', { class: 'l-btn', onclick: () => locate(up) }, place.approx ? t('set.placeFind') : t('set.placeAgain'))) : null,
        toggle(t('set.hour12'), prefs.hour12, (v) => up({ hour12: v })),
        church ? toggle(t('set.hourLine'), prefs.hourLine, (v) => up({ hourLine: v }), t('set.hourLineHint')) : null,
      ));

      // — Живые обои —
      const walls = h('div', { class: 'l-wall-picks' });
      WALLPAPERS.forEach((w) => {
        const cv = h('canvas', { width: 300, height: 220, 'aria-hidden': 'true' });
        walls.append(h('button', { class: `l-wall-pick ${prefs.wallpaper === w.id ? 'on' : ''}`, onclick: keep(() => up({ wallpaper: w.id })) },
          cv, h('span', {}, t('wall.' + w.id)), church ? h('small', { lang: 'el' }, w.el) : null));
        requestAnimationFrame(() => drawPreview(cv, w.id, church));
      });
      body.append(S('look', t('set.wall'), church ? 'εἰκὼν ζῶσα' : '',
        walls,
        prefs.wallpaper !== 'none' ? h('p', { class: 'l-hint' }, t('wall.' + prefs.wallpaper + '.hint'), ' ', infoLink(() => wallEntry(prefs.wallpaper))) : null,
        prefs.wallpaper !== 'none' ? toggle(t('set.wallClock'), prefs.clock === 'none', (v) => up({ clock: v ? 'none' : 'tablet' }), t('set.wallClockHint')) : null,
      ));

      // — Вид —
      const orns = church ? h('div', { class: 'l-orn-picks' }) : null;
      if (orns) Object.entries(ORNAMENTS).forEach(([id, o]) => orns.append(h('button', { class: `l-orn-pick ${prefs.ornament === id ? 'on' : ''}`, onclick: keep(() => up({ ornament: id })) },
        h('span', { class: 'l-orn-ico', html: o.icon ? iconSVG(o.icon) : '' }), h('small', {}, t('orn.' + id)))));
      const markers = [['auto', t('set.marker.auto')], ['greek', 'αʹ βʹ'], ['roman', 'I II'], ['count', t('set.marker.count')], ['none', t('set.none')]]
        .filter(([v]) => church || v !== 'greek').map(([value, label]) => ({ value, label }));
      body.append(S('look', t('set.look'), church ? 'μορφή' : '',
        h('div', { class: 'l-label' }, t('set.align')),
        segmented([{ value: 'left', label: t('set.left') }, { value: 'center', label: t('set.center') }, { value: 'right', label: t('set.right') }], prefs.align, (v) => up({ align: v }), t('set.align')),
        scaleRow(t('set.clockScale'), 'clockScale', 60, 140),
        scaleRow(t('set.uiScale'), 'uiScale', 60, 130),
        h('div', { class: 'l-label' }, t('set.marker'), ' ', infoLink(markerEntry)),
        segmented(markers, prefs.marker, (v) => up({ marker: v }), t('set.marker')),
        orns ? h('div', { class: 'l-label' }, t('set.ornament'), ' ', infoLink(ornamentEntry)) : null,
        orns,
        toggle(t('set.status'), prefs.status, (v) => up({ status: v }), t('set.statusHint')),
        toggle(t('set.intro'), prefs.intro, (v) => up({ intro: v }), t(church ? 'set.introHintChurch' : 'set.introHint')),
      ));

      // — Раскладка: главный экран и «Все приложения» —
      body.append(S('home', t('set.layout'), church ? 'τάξις' : '', layoutEditor(() => changed(), keep)));

      // — Дата и строка —
      const langs = [{ value: '', label: t('set.dateLang.ui') }, { value: 'ru', label: 'Рус' }, { value: 'uz', label: 'Oʻzb' }, { value: 'en', label: 'Eng' }];
      if (church) langs.push({ value: 'el', label: 'Ελλ' });
      const sub = [{ value: 'note', label: t('set.sub.note') }, { value: 'none', label: t('set.none') }];
      if (church) sub.unshift({ value: 'verse', label: t('set.sub.verse') });
      body.append(S('look', t('set.date'), church ? 'ἡμέρα' : '',
        h('div', { class: 'l-label' }, t('set.dateLang')),
        segmented(langs, prefs.dateLang || '', (v) => up({ dateLang: v }), t('set.dateLang')),
        church ? toggle(t('set.greekDay'), prefs.greekDay, (v) => up({ greekDay: v }), 'Κυριακή, Δευτέρα…') : null,
        h('div', { class: 'l-label' }, t('set.sub')),
        segmented(sub, prefs.subline === 'verse' && !church ? 'none' : prefs.subline, (v) => up({ subline: v }), t('set.sub')),
        prefs.subline === 'note' ? field(t('set.note'), prefs.note, (v) => { prefs.note = v; save(); changed(); }, { maxlength: 80 }) : null,
      ));

      // — Главный экран: приложения —
      const homeList = h('div', { class: 'l-edit-list' });
      homeItems().forEach((item, i, all) => {
        homeList.append(h('div', { class: 'l-edit-row' },
          h('button', { class: 'l-edit-main', onclick: () => editHomeItem(i, rerender) }, h('span', {}, item.label || appOf(item.key)?.label || t('act.gone')), h('small', {}, appOf(item.key)?.label || '')),
          h('button', { class: 'l-mini', 'aria-label': t('set.up'), disabled: i === 0, onclick: keep(() => { move(ownHome(), i, -1); save(); changed(); rerender(); }) }, '↑'),
          h('button', { class: 'l-mini', 'aria-label': t('set.down'), disabled: i === all.length - 1, onclick: keep(() => { move(ownHome(), i, 1); save(); changed(); rerender(); }) }, '↓')));
      });
      body.append(S('home', t('set.home'), church ? 'οἶκος' : '',
        h('p', { class: 'l-hint' }, t('set.homeHint')),
        homeList,
        h('button', { class: 'l-btn', onclick: () => pickAction(null, (a) => { ownHome().push({ key: a.key, label: '' }); save(); changed(); rerender(); }, { appsOnly: true }) }, t('set.homeAdd')),
      ));

      // — Значки внизу и плеер —
      const dockList = h('div', { class: 'l-edit-list' });
      dockSlots().forEach((slot, i) => {
        dockList.append(h('div', { class: 'l-edit-row' },
          h('button', { class: 'l-slot-ico', 'aria-label': t('pick.icon'), html: iconSVG(slot.icon), onclick: () => pickIcon(slot.icon, (id) => { ownDock()[i].icon = id; save(); changed(); rerender(); }) }),
          h('button', { class: 'l-edit-main', onclick: () => pickAction(slot.action, (a) => { ownDock()[i].action = a; save(); changed(); rerender(); }) }, h('span', {}, describeAction(slot.action, appName))),
          h('button', { class: 'l-mini', 'aria-label': t('set.remove'), onclick: keep(() => { ownDock().splice(i, 1); save(); changed(); rerender(); }) }, '×')));
      });
      body.append(S('home', t('set.dock'), church ? 'εἰκόνες' : '',
        segmented([{ value: 'icons', label: t('set.dock.icons') }, { value: 'line', label: t('set.dock.line') }, { value: 'none', label: t('set.dock.none') }], prefs.dockStyle, (v) => up({ dockStyle: v }), t('set.dock')),
        dockList,
        dockSlots().length < 6 ? h('button', { class: 'l-btn', onclick: () => { ownDock().push({ icon: 'grid', action: { t: 'cmd', id: 'drawer' } }); save(); changed(); rerender(); } }, t('set.dockAdd')) : null,
        MEDIA_SESSIONS ? toggle(t('set.player'), prefs.player, (v) => up({ player: v }), t('set.playerHint')) : null,
        MEDIA_SESSIONS && prefs.player && isNative() ? h('button', { class: 'l-btn', onclick: openMediaAccess }, t('set.mediaAccess')) : null,
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
      body.append(S('home', t(church ? 'set.tracker.church' : 'set.tracker'), church ? 'μελέτη' : '',
        h('p', { class: 'l-hint' }, t(church ? 'mel.whatChurch' : 'mel.what')),
        mel,
        br ? toggle(t('set.trackerShow'), prefs.tracker, (v) => up({ tracker: v })) : null,
      ));

      // — Жесты —
      const gList = h('div', { class: 'l-edit-list' });
      GESTURES.forEach((id) => gList.append(h('div', { class: 'l-edit-row' },
        h('span', { class: 'l-glyph', 'aria-hidden': 'true' }, GLYPHS[id]),
        h('button', { class: 'l-edit-main', onclick: () => pickAction(gestureOf(id), (a) => { prefs.gestures[id] = a; save(); rerender(); }) },
          h('span', {}, t('gest.' + id)), h('small', {}, '→ ' + describeAction(gestureOf(id), appName))))));
      body.append(S('gestures', t('set.gestures'), church ? 'κινήσεις' : '', gList, h('p', { class: 'l-hint' }, t('set.gesturesHint'))));

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
      body.append(S('data', t('set.data'), church ? 'θησαυρός' : '',
        h('p', { class: 'l-hint' }, t('data.hint')),
        h('div', { class: 'l-btn-row' },
          h('button', { class: 'l-btn primary', onclick: () => saveFile().then(() => toast(t('data.saved')), (e) => { if (!/cancel/i.test(String(e?.message || e))) toast(t('data.err')); }) }, t('data.save')),
          h('button', { class: 'l-btn', onclick: () => pickFile().then((c) => askRestore(c, rerender), (e) => { if (!/cancel/i.test(String(e?.message || e))) toast(t('data.bad')); }) }, t('data.load'))),
        copies));

      // — Обновление — свой раздел перерисовывается сам по событиям загрузки, остальные настройки не трогаются
      if (updAvailable()) {
        const updSec = () => {
          const u = updState();
          const st = u.st === 'avail' ? t('upd.avail', { n: u.info.build }) : u.st === 'down' ? t(u.wait ? 'upd.wait' : 'upd.down', { p: Math.round(u.f * 100) })
            : u.st === 'ready' ? t('upd.readyShort') : u.st === 'none' ? t('upd.none') : u.st === 'err' ? t('upd.err') : u.st === 'checking' ? t('upd.checking') : '';
          return S('data', t('set.upd'), '',
            h('p', { class: 'l-hint' }, t('upd.build', { ch: CHANNEL, n: BUILD }), st ? ' · ' + st : ''),
            segmented([{ value: 'auto', label: t('upd.auto') }, { value: 'button', label: t('upd.button') }], prefs.updMode, (v) => { setPrefs({ updMode: v }); changed(); swap(); }, t('set.upd')),
            toggle(t('upd.mobile'), prefs.updMobile, (v) => { setPrefs({ updMobile: v }); changed(); }),
            h('div', { class: 'l-btn-row' },
              u.st === 'avail' ? h('button', { class: 'l-btn primary', onclick: () => download() }, t('upd.get')) : null,
              u.st === 'ready' ? h('button', { class: 'l-btn primary', onclick: () => install() }, t('upd.install')) : null,
              ['avail', 'down', 'ready'].includes(u.st) ? null : h('button', { class: 'l-btn', onclick: () => check() }, t('upd.check'))));
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
      body.append(S('data', t('set.sys'), '',
        sys,
        h('div', { class: 'l-btn-row' },
          h('button', { class: 'l-btn danger', onclick: () => { if (confirm(t('set.resetAsk'))) { resetPrefs(); changed(); rerender(); } } }, t('set.reset'))),
        h('p', { class: 'l-colophon', lang: 'el' }, 'Ἐλάχιστον', h('small', {}, t('about.motto'))),
        // лицензии: код — GPL-3.0, шрифты — SIL OFL, карта — общественное достояние (LICENSES.md)
        h('button', { class: 'l-ex-link', onclick: () => openUrl('https://github.com/veracerkof-debug/melete-app/blob/main/LICENSES.md', t('about.lic')) }, h('span', {}, t('about.lic')), h('small', {}, 'github.com'))));

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

// местоположение для восхода и заката (ветхозаветные часы) — только по нажатию
function locate(up) {
  if (!navigator.geolocation) return toast(t('set.placeNone'));
  toast(t('set.placeWait'));
  navigator.geolocation.getCurrentPosition(
    (p) => { up({ place: { lat: +p.coords.latitude.toFixed(3), lon: +p.coords.longitude.toFixed(3) } }); toast(t('set.placeSaved')); },
    () => toast(t('set.placeNone')),
    { timeout: 15000, maximumAge: 864e5 },
  );
}

// Загрузить копию: что в ней — и подтверждение; текущее перед этим само сохраняется копией на телефоне
function askRestore(c, after) {
  const n = summary(c);
  if (!confirm(t('data.ask', { d: new Date(c.at).toLocaleDateString(), n: n.notes, r: n.recs }))) return;
  restore(c).then(() => { toast(t('data.restored')); setTimeout(() => location.reload(), 600); after?.(); });
}

// Раскладка: блоки главного экрана — порядок (↑ ↓), видно или нет, размер (касание названия); место значков;
// «Все приложения» — место папок и поиска, размер названий. «Как было» — раскладка по умолчанию.
function layoutEditor(redraw, keep) {
  const wrap = h('div', { class: 'l-lay' });
  let openId = null;
  const commit = (patch) => { setLayout(patch); applyLook(); redraw(); draw(); };
  const draw = () => {
    const l = layout();
    const rows = l.order.map((id, i) => {
      const off = !!l.hide[id];
      const pct = l.scale[id] || 100;
      const move = (d) => keep(() => { const o = [...l.order]; [o[i], o[i + d]] = [o[i + d], o[i]]; commit({ order: o }); })();
      const row = h('div', { class: `l-lay-row ${off ? 'off' : ''}` },
        h('button', { class: 'l-lay-name', onclick: () => { openId = openId === id ? null : id; draw(); }, disabled: id === 'space' },
          t('blk.' + id), id !== 'space' && pct !== 100 ? h('small', {}, pct + ' %') : null),
        h('button', { class: 'l-lay-btn', 'aria-label': t('lay.up'), disabled: i === 0, onclick: () => move(-1) }, '↑'),
        h('button', { class: 'l-lay-btn', 'aria-label': t('lay.down'), disabled: i === l.order.length - 1, onclick: () => move(1) }, '↓'),
        h('button', { class: 'l-lay-btn', 'aria-label': off ? t('lay.show') : t('lay.hide'), onclick: keep(() => commit({ hide: { ...l.hide, [id]: !off } })),
          html: off ? '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"/><path d="M4 4l16 16"/></svg>'
            : '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"/><circle cx="12" cy="12" r="2.6"/></svg>' }));
      if (openId !== id || id === 'space') return row;
      const r = h('input', { type: 'range', class: 'l-scale', min: 60, max: 160, step: 5, value: pct, 'aria-label': t('blk.' + id) });
      r.addEventListener('change', keep(() => commit({ scale: { ...l.scale, [id]: +r.value } })));
      r.addEventListener('dblclick', keep(() => commit({ scale: { ...l.scale, [id]: 100 } })));
      return h('div', {}, row, h('div', { class: 'l-lay-size' }, r));
    });
    wrap.replaceChildren(
      h('div', { class: 'l-label' }, t('lay.blocks')), ...rows,
      h('div', { class: 'l-label' }, t('lay.dock')),
      segmented(['bottom', 'top', 'left', 'right'].map((v) => ({ value: v, label: t('lay.' + v) })), l.dock, (v) => {
        // вверху и внизу — значки первыми или последними в порядке; слева и справа — столбиком у края
        const rest = l.order.filter((x) => x !== 'dock');
        commit({ dock: v, order: v === 'top' ? ['dock', ...rest] : v === 'bottom' ? [...rest, 'dock'] : l.order, hide: { ...l.hide, dock: false } });
      }, t('lay.dock')),
      h('div', { class: 'l-label' }, t('lay.rail')),
      segmented(['right', 'left', 'bottom', 'top'].map((v) => ({ value: v, label: t('lay.' + v) })), l.rail, (v) => commit({ rail: v }), t('lay.rail')),
      h('div', { class: 'l-label' }, t('lay.search')),
      segmented(['top', 'bottom'].map((v) => ({ value: v, label: t('lay.' + v) })), l.search, (v) => commit({ search: v }), t('lay.search')),
      scaleLay(t('lay.drawerScale'), l.drawerScale, (v) => commit({ drawerScale: v })),
      h('button', { class: 'l-btn', onclick: () => { resetLayout(); applyLook(); redraw(); draw(); } }, t('lay.reset')));
  };
  draw();
  return wrap;
}

function scaleLay(label, value, onSet) {
  const val = h('span', { class: 'l-scale-v' }, value + ' %');
  const r = h('input', { type: 'range', class: 'l-scale', min: 60, max: 140, step: 5, value, 'aria-label': label });
  r.addEventListener('input', () => { val.textContent = r.value + ' %'; });
  r.addEventListener('change', () => onSet(+r.value));
  return h('div', { class: 'l-scale-row' }, h('div', { class: 'l-label' }, label, ' ', val), r);
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
export function editHomeItem(i, after, onChange = changed) {
  const item = homeItems()[i];
  if (!item) return;
  const church = isChurch();
  openSheet({
    title: t('set.item'), kicker: church ? 'ὄνομα' : '',
    render(body, close, rerender) {
      const app = appOf(item.key);
      const commit = (fn) => { fn(ownHome()[i]); save(); onChange(); after?.(); };
      body.append(
        field(t('set.itemLabel'), item.label, (v) => commit((x) => { x.label = v; }), { placeholder: app?.label || '', maxlength: 40 }),
        church ? h('div', { class: 'l-chips' }, ...['βίβλος', 'λόγος', 'φῶς', 'ζωή', 'ὁδός', 'φωνή', 'ψαλμοί', 'εἰρήνη'].map((w) =>
          h('button', { class: 'l-chip', lang: 'el', onclick: () => { commit((x) => { x.label = (x.label ? x.label.split(' · ')[0] + ' · ' : '') + w; }); rerender(); } }, w))) : null,
        h('button', { class: 'l-pick', onclick: () => pickAction({ t: 'app', key: item.key }, (a) => { commit((x) => { x.key = a.key; }); rerender(); }, { appsOnly: true }) },
          h('span', {}, t('set.itemOpens', { name: app?.label || '—' }))),
        h('div', { class: 'l-btn-row' },
          h('button', { class: 'l-btn', disabled: i === 0, onclick: () => { move(ownHome(), i, -1); save(); onChange(); close(); } }, '↑ ' + t('set.up')),
          h('button', { class: 'l-btn', disabled: i === homeItems().length - 1, onclick: () => { move(ownHome(), i, 1); save(); onChange(); close(); } }, '↓ ' + t('set.down')),
          h('button', { class: 'l-btn danger', onclick: () => { ownHome().splice(i, 1); save(); onChange(); close(); } }, t('set.remove'))),
      );
    },
  });
}

// Значок внизу (удержание значка)
export function editDockSlot(i, onChange) {
  const slot = dockSlots()[i];
  if (!slot) return;
  openSheet({
    title: t('set.slot'), kicker: isChurch() ? 'εἰκών' : '',
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
