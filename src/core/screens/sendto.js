// Отправить файл на устройство (Melete DEV): шторка со списком «Моих устройств» (и компьютера, если он сопряжён);
// касание — отправить кусками по защищённому каналу, там файл появляется в медиатеке (sync.js: sendFile)
import { t } from '../../i18n/index.js';
import { sheet, snav, esc, toast } from '../../ui/index.js';
import { devsOf, pcOf, sendFile } from '../sync.js';

export const sendTargets = () => [...devsOf().map((d) => ({ addr: d.addr, name: d.name, dev: d.addr })), ...(pcOf() ? [{ addr: pcOf().addr, name: pcOf().name, dev: null }] : [])];

export function sendSheet(app, rec) {
  let busy = null, pct = 0;
  const api = sheet(() => snav(t('net.send')) + '<div class="group">' + sendTargets().map((d) => '<button class="cell act" data-to="' + esc(d.addr) + '"' + (busy ? ' disabled' : '') + '><span class="grow">' + esc(d.name) + '</span>' +
    (busy === d.addr ? '<span class="l2 num">' + pct + ' %</span>' : '') + '</button>').join('') + '</div><p class="ftr">' + esc(t('net.sendHint', { name: rec.name || '' })) + '</p>', (el) => {
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-to]');
      if (!b || busy) return;
      const d = sendTargets().find((x) => x.addr === b.dataset.to);
      if (!d) return;
      busy = d.addr; pct = 0; api.update();
      sendFile(app, rec, (f) => { pct = Math.round(f * 100); api.update(); }, undefined, { dev: d.dev })
        .then((r) => { toast(t(r.have ? 'net.had' : 'net.sent', { name: d.name })); api.close(); })
        .catch((er) => { toast(t('sy.err.' + ((er && er.reason) || 'unreachable'))); })
        .finally(() => { busy = null; if (api.el.isConnected) api.update(); });
    });
  });
  return api;
}
