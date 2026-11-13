// Шторка «Задержка» (DECISIONS «Вокал: задержка», 14.11.2026): для выхода, который сейчас подключён (Bluetooth,
// проводные наушники, динамик), — замер «спеть «та» на щелчки» (в наушниках), «через динамик» и ручная правка ±10 мс.
// Общая для «Вокала» и «Петь» медиатеки (ctx — модуля; строки — общие, lat.*). Логика — src/audio/latency.js.
import { latencyNow, setLatency, measureLatency } from '../audio/latency.js';

export function latencySheet(ctx, onChange = () => {}) {
  const { t, ui } = ctx, esc = ui.esc;
  let busy = false, clickN = -1, method = null;
  const body = () => {
    const L = latencyNow();
    if (busy) return ui.snav(t('lat.title'), { right: '<span></span>' }) + '<div class="latrun"><b>' + esc(t(method === 'voice' ? 'lat.singNow' : 'lat.loopNow')) + '</b><i class="num">' + (clickN < 0 ? '…' : clickN + 1) + '</i></div>';
    return ui.snav(t('lat.title')) + '<div class="group"><div class="cell"><span class="grow">' + esc(t('lat.out.' + L.kind)) + '<span class="latsub">' + esc(t(L.measured ? 'lat.measured' : 'lat.default')) + '</span></span><b class="num">' + L.ms + ' ' + esc(t('lat.ms')) + '</b>' + ui.stepper('lat', t('lat.adjust')) + '</div></div>' +
      '<div class="group"><button class="cell act" data-lat="voice"><span class="grow">' + esc(t('lat.voice')) + '<span class="latsub">' + esc(t('lat.voiceHint')) + '</span></span></button>' +
      '<button class="cell act" data-lat="loop"><span class="grow">' + esc(t('lat.loop')) + '<span class="latsub">' + esc(t('lat.loopHint')) + '</span></span></button>' +
      (L.measured ? '<button class="cell" data-lat="reset"><span class="grow">' + esc(t('lat.reset')) + '</span></button>' : '') + '</div><p class="ftr">' + esc(t('lat.ftr')) + '</p>';
  };
  ui.sheet(body, (el, sh) => el.addEventListener('click', async (e) => {
    if (busy) return;
    const b = e.target.closest('[data-lat]'), st = e.target.closest('[data-step="lat"]');
    if (st) { setLatency(latencyNow().ms + 10 * +st.dataset.d); sh.update(); onChange(); return; }
    if (!b) return;
    const k = b.dataset.lat;
    if (k === 'reset') { setLatency(null); sh.update(); onChange(); return; }
    busy = true; method = k; clickN = -1; sh.update();
    let ms = null;
    try { ms = await measureLatency(ctx.audio, { method: k, onClick: (i) => { clickN = i; if (busy) sh.update(); } }); }
    catch (err) { ui.toast(t(err && err.reason === 'denied' ? 'lat.denied' : err && err.reason === 'sound' ? 'lat.noSound' : 'lat.noMic')); }
    busy = false;
    if (ms == null) { ui.toast(t('lat.fail')); sh.update(); return; }
    setLatency(ms); sh.update(); onChange();
    ui.toast(t('lat.done', { ms }));
  }));
}
