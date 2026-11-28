// Профили вывода: уровни громкости и эквалайзер под разные устройства (динамик, наушники, Bluetooth-колонка…) — src/audio/profiles.js.
// Подключилось устройство с профилем — настройки включаются сами (плавно, параметрами); профиль создаётся и обновляется из текущих настроек.
import { t } from '../../i18n/index.js';
import { esc, sheet, snav, toast, confirm } from '../../ui/index.js';
import { createRoute } from '../../audio/route.js';
import { normalize, forKey, save, remove, restore } from '../../audio/profiles.js';

const store = (app) => (app.device.profiles = normalize(app.device.profiles));

export function initProfiles(app) {
  if (app.outRoute) return;
  app.outRoute = createRoute(app.audio.outputs);
  const applyFor = (route, quiet) => {
    const P = store(app), pr = forKey(P, route.key);
    if (!pr || !P.auto) return null;
    let n = 0; try { n = restore(app.audio.mixer, app.device.mix, pr.snap); } catch { return null; }
    if (n) { app.saveDevice(); if (!quiet) toast(t('prof.on', { name: pr.name })); }
    return pr;
  };
  app.outRoute.onChange((r) => applyFor(r, false));
  setTimeout(async () => { try { applyFor(await app.outRoute.current(), true); } catch { /* без профиля */ } }, 3000); // после запуска: профиль текущего устройства, тихо
}

const TYPE = { speaker: 'prof.t.speaker', earpiece: 'prof.t.earpiece', wired: 'prof.t.wired', bluetooth: 'prof.t.bt', bluetooth_call: 'prof.t.bt', ble: 'prof.t.bt', usb: 'prof.t.usb', hdmi: 'prof.t.hdmi', web: 'prof.t.web', other: 'prof.t.other', none: 'prof.t.none' };
const nameOf = (d) => (d.label || t(TYPE[d.type] || 'prof.t.other'));
const kind = (d) => t(TYPE[d.type] || 'prof.t.other');

export async function profilesSheet(app, onDone = () => {}) {
  if (!app.outRoute) initProfiles(app);
  let cur = await app.outRoute.current().catch(() => ({ key: 'none', type: 'none', label: '' })), list = await app.outRoute.list().catch(() => []);
  const api = sheet(() => {
    const P = store(app), mine = forKey(P, cur.key);
    return snav(t('prof.title')) +
      '<div class="group"><div class="cell"><span class="grow"><b>' + esc(nameOf(cur)) + '</b><span class="psub">' + esc(t('prof.now') + ' · ' + kind(cur)) + '</span></span></div>' +
      '<button class="cell act" data-pf="save">' + esc(mine ? t('prof.update', { name: mine.name }) : t('prof.save', { name: nameOf(cur) })) + '</button></div>' +
      (list.length > 1 || (list[0] && list[0].key !== cur.key) ? '<div class="hdr">' + t('prof.devices') + '</div><div class="group">' + list.map((d) => '<div class="cell"><span class="grow">' + esc(nameOf(d)) + '<span class="psub">' + esc(kind(d) + (forKey(P, d.key) ? ' · ' + t('prof.has') : '')) + '</span></span>' + (d.key === cur.key ? '<span class="l2">✓</span>' : '') + '</div>').join('') + '</div>' : '') +
      (P.list.length ? '<div class="hdr">' + t('prof.list') + '</div><div class="group">' + P.list.map((p) => '<div class="cell"><span class="grow">' + esc(p.name) + '<span class="psub">' + esc(p.label || p.key) + '</span></span><button class="link b" data-pf="apply" data-id="' + esc(p.id) + '">' + t('prof.apply') + '</button><button class="link" data-pf="del" data-id="' + esc(p.id) + '">' + t('prof.del') + '</button></div>').join('') + '</div>' : '') +
      '<div class="group"><div class="cell"><span class="grow">' + t('prof.auto') + '<span class="psub">' + t('prof.autoSub') + '</span></span><label class="sw"><input type="checkbox" data-pf="auto"' + (P.auto ? ' checked' : '') + ' aria-label="' + esc(t('prof.auto')) + '"><i></i></label></div></div>' +
      '<p class="ftr">' + t('prof.hint') + '</p>';
  }, (el) => {
    el.addEventListener('change', (e) => { if (e.target.matches('[data-pf="auto"]')) { store(app).auto = e.target.checked; app.saveDevice(); } });
    el.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-pf]'); if (!b || b.type === 'checkbox') return;
      const P = store(app), a = b.dataset.pf, id = b.dataset.id;
      if (a === 'save') { const p = save(P, { key: cur.key, label: cur.label || nameOf(cur), name: nameOf(cur) }, app.device.mix); if (!p) { toast(t('prof.max')); return; } app.saveDevice(); toast(t('prof.saved', { name: p.name })); api.update(); onDone(); }
      else if (a === 'apply') { const p = P.list.find((x) => x.id === id); if (p) { restore(app.audio.mixer, app.device.mix, p.snap); app.saveDevice(); toast(t('prof.on', { name: p.name })); onDone(); } }
      else if (a === 'del') { const p = P.list.find((x) => x.id === id); if (!p) return; if (!(await confirm(t('prof.del'), t('prof.delAsk', { name: p.name }), t('prof.del')))) return; remove(P, id); app.saveDevice(); api.update(); onDone(); }
    });
  });
  const off = app.outRoute.onChange(async (r) => { cur = r; list = await app.outRoute.list().catch(() => list); api.update(); }); // подключили наушники при открытом окне — видно сразу
  const close = api.close; api.close = () => { off(); close(); };
  return api;
}
