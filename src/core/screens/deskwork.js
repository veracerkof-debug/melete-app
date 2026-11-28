// «Рабочая станция» на компьютере (слово автора 28.11.2026, макет DWork): занятие с готовой раскладкой окон — метроном, пэд,
// клавиши (или лупер, или ноты) — и микшер справа: общая громкость и уровни источников, профиль вывода, сцены. Окна — обычные окна
// сессии (session.js), раскладка пишется в device.wsMap той же сессии: правится как всегда (ручка окна, границы, значки).
// Микшер — полоса в слое сессии (.dmix), звук не трогает, кроме громкостей через те же mixer.set / setMaster, что и ползунки.
import { t } from '../../i18n/index.js';
import { esc, toast } from '../../ui/index.js';
import { isOn } from '../settings.js';
import { wsKey } from '../workspace.js';
import { MIX_MAX, mixKey } from '../../audio/mixer.js';
import { moduleById } from '../../modules/index.js';
import * as SC from '../scenes.js';

// Раскладки. В окне сессии — не больше трёх окон при одном широком (клавиши и ноты уже «четверти» не пускают, meta.minSize),
// поэтому лупер, клавиши и ноты делят место по раскладкам
export const PRESETS = {
  lesson: { layout: 'QH', panes: ['metro', 'drone', 'piano'] },
  rehearse: { layout: 'HQ', panes: ['notes', 'metro', 'drone'] },
  record: { layout: 'QH', panes: ['metro', 'drone', 'looper'] },
};
export const PRESET_IDS = Object.keys(PRESETS);
const FADERS = [['metro', 'metro'], ['drone', 'drone'], ['looper', 'looper'], ['piano', 'piano']];

let station = false, unSub = null;
export const stationOn = () => station;

// Раскладка → запись в device.wsMap сессии (инструменты, которых нет или они выключены, пропускаются — fixWS дополнит)
export function presetWS(st, id) {
  const p = PRESETS[id] || PRESETS.lesson;
  return { layout: p.layout, panes: p.panes.filter((x) => moduleById(x) && isOn(st, x)), focus: 0, sub: {}, ratio: 0.5 };
}

export function openStation(app, preset) {
  if (!app.session) return;
  const id = PRESETS[preset] ? preset : (app.device.deskToday || {}).preset || 'lesson';
  station = true;
  apply(app, id);
}

function apply(app, id) {
  const st = app.store.state.settings, dev = (app.device.deskToday ||= { min: 30 });
  dev.preset = id;
  if (app.active && app.active.type === 'tool') { toast(t('ses.finishFirst')); station = false; return; }
  (app.device.wsMap ||= {})[wsKey(app.active)] = presetWS(st, id);
  app.saveDevice();
  if (app.active) { if (app.session.isOpen) app.session.hide(); app.session.open(); }
  else app.startSession('free', null, null, { routine: null });
}

// Слой сессии появился/исчез: добавить или убрать микшер станции
export function watchStation(app) {
  if (watchStation.on) return;
  watchStation.on = true;
  const check = () => {
    const all = [...document.querySelectorAll('.session:not(.toolmode)')];
    if (!all.length) { if (!app.active) station = false; teardown(); return; }
    // слой, уходящий после смены раскладки, ещё в документе: микшер — в тот, где его нет
    if (station && document.documentElement.classList.contains('dpro')) all.filter((x) => !x.querySelector('.dmix')).forEach((x) => inject(app, x));
  };
  new MutationObserver(check).observe(document.body, { childList: true });
}
function teardown() { if (unSub) { unSub(); unSub = null; } }

function faderHTML(app, k, label, master) {
  const mx = app.audio.mixer, key = master ? 'master' : mixKey(k);
  const v = master ? mx.master() : (mx.state[key] == null ? 1 : mx.state[key]), max = master ? 1 : MIX_MAX, mu = !master && !!(mx.state.mute || {})[key];
  return '<div class="dfd' + (mu ? ' mu' : '') + '" data-k="' + (master ? 'master' : k) + '"><span class="dfv num">' + Math.round((mu ? 0 : v) * 100) + '</span>' +
    '<div class="dtk" role="slider" tabindex="0" aria-label="' + esc(t('mix.volume', { src: label })) + '" aria-valuemin="0" aria-valuemax="' + Math.round(max * 100) + '" aria-valuenow="' + Math.round(v * 100) + '"><i style="height:' + Math.round((v / max) * 100) + '%"></i></div>' +
    (master ? '<span class="dfl">' + esc(label) + '</span>' : '<button class="dfl" data-dmute="' + k + '" aria-label="' + esc(t(mu ? 'mix.unmute' : 'mix.mute', { src: label })) + '">' + esc(label) + '</button>') + '</div>';
}
const busLabel = (k) => (k === 'drone' ? t('desk.work.pad') : k === 'metro' ? t('desk.work.metro') : t('mix.' + k));

function sceneName(app) {
  const S = SC.normalize(app.device.scenes), c = S.scenes.find((x) => x.id === S.cur);
  return { S, name: c ? c.name : S.scenes.length ? t('desk.work.pick') : t('desk.work.noScenes') };
}

function bodyHTML(app) {
  const st = app.store.state.settings, cur = (app.device.deskToday || {}).preset || 'lesson', sn = sceneName(app), outTxt = (document.querySelector('.dtop .dchip span') || {}).textContent || t('desk.work.outNone');
  return '<div class="dlb">' + esc(t('desk.work.layout')) + '</div><div class="dsg dsgw" role="group" aria-label="' + esc(t('desk.work.layout')) + '">' +
    PRESET_IDS.map((id) => '<button data-dpre="' + id + '" aria-pressed="' + (id === cur) + '">' + esc(t('desk.work.' + id)) + '</button>').join('') + '</div>' +
    '<div class="dlb">' + esc(t('mix.title')) + '</div><div class="dpn dfaders">' + faderHTML(app, 'master', t('desk.work.master'), true) +
    FADERS.filter(([, id]) => isOn(st, id)).map(([k]) => faderHTML(app, k, busLabel(k))).join('') + '</div>' +
    '<div class="dpn"><div class="drow"><b class="dg1">' + esc(t('desk.work.out')) + '</b></div><button class="dchip ok" data-dwout><i></i><span>' + esc(outTxt) + '</span></button></div>' +
    '<div class="dpn"><div class="drow"><b class="dg1">' + esc(t('desk.work.scenes')) + '</b></div><div class="drow dscn"><button class="dbt sec" data-dscn="-1" aria-label="' + esc(t('scn.prev')) + '">←</button>' +
    '<button class="dbt dg2" data-dscn="0">' + esc(sn.name) + '</button><button class="dbt sec" data-dscn="1" aria-label="' + esc(t('scn.next')) + '">→</button></div></div>';
}

function inject(app, ses) {
  const el = document.createElement('aside');
  el.className = 'dmix'; el.setAttribute('aria-label', t('mix.title'));
  el.innerHTML = bodyHTML(app);
  ses.classList.add('dws'); ses.appendChild(el);
  const mx = app.audio.mixer, redraw = () => { if (el.isConnected) el.innerHTML = bodyHTML(app); };
  let drag = null;
  const setFrom = (d, y) => {
    const r = d.tr.getBoundingClientRect(), f = Math.max(0, Math.min(1, 1 - (y - r.top) / r.height));
    if (d.k === 'master') mx.setMaster(f); else mx.set(d.k, f * MIX_MAX);
    paintFader(d.tr.parentNode);
  };
  const paintFader = (f) => {
    const k = f.dataset.k, master = k === 'master', max = master ? 1 : MIX_MAX, v = master ? mx.master() : (mx.state[mixKey(k)] == null ? 1 : mx.state[mixKey(k)]);
    f.classList.remove('mu');
    f.querySelector('i').style.height = Math.round((v / max) * 100) + '%';
    f.querySelector('.dfv').textContent = Math.round(v * 100);
    f.querySelector('.dtk').setAttribute('aria-valuenow', Math.round(v * 100));
  };
  el.addEventListener('pointerdown', (e) => { const tr = e.target.closest('.dtk'); if (!tr) return; e.preventDefault(); drag = { tr, k: tr.parentNode.dataset.k, id: e.pointerId }; try { tr.setPointerCapture(e.pointerId); } catch { /* без захвата */ } setFrom(drag, e.clientY); });
  el.addEventListener('pointermove', (e) => { if (drag && e.pointerId === drag.id) setFrom(drag, e.clientY); });
  const up = () => { drag = null; };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  el.addEventListener('keydown', (e) => { // как у ползунка по WAI-ARIA: стрелки — шаг
    const tr = e.target.closest('.dtk'); if (!tr) return;
    const f = tr.parentNode, k = f.dataset.k, master = k === 'master', max = master ? 1 : MIX_MAX, key = mixKey(k);
    let v = master ? mx.master() : (mx.state[key] == null ? 1 : mx.state[key]);
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') v += 0.05; else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') v -= 0.05; else if (e.key === 'Home') v = 0; else if (e.key === 'End') v = max; else return;
    e.preventDefault(); v = Math.max(0, Math.min(max, v));
    if (master) mx.setMaster(v); else mx.set(k, v);
    paintFader(f);
  });
  el.addEventListener('click', (e) => {
    const g = (s) => e.target.closest(s);
    let b;
    if ((b = g('[data-dpre]'))) { apply(app, b.dataset.dpre); return; }
    if ((b = g('[data-dmute]'))) { mx.toggleMute(b.dataset.dmute); redraw(); return; }
    if (g('[data-dwout]')) { import('./profiles.js').then((m) => m.profilesSheet(app, redraw)).catch(() => {}); return; }
    if ((b = g('[data-dscn]'))) {
      const d = +b.dataset.dscn, S = SC.normalize(app.device.scenes);
      if (!d) { import('./scenes.js').then((m) => m.scenesSheet(app, redraw)); return; }
      let r = S.scn ? SC.stepScenario(S, app, d) : null;
      if (!r && S.scenes.length) { const i = Math.max(0, S.scenes.findIndex((x) => x.id === S.cur)); r = SC.useScene(S, app, S.scenes[(i + d + S.scenes.length) % S.scenes.length].id); } // сценария нет — по кругу все сцены
      if (r) { app.device.scenes = S; app.saveDevice(); toast(t('scn.on', { name: r.scene.name })); redraw(); }
    }
  });
  teardown();
  unSub = mx.subscribe(() => { if (!drag) el.querySelectorAll('.dfd').forEach(paintFader); }); // громкость поменяли в другом месте
}
