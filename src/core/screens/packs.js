// Пакеты моделей на экране «Модули и функции» и в модулях (ctx.packs): скачать, ход, отменить, удалить (src/core/packs.js)
import { t } from '../../i18n/index.js';
import { esc, confirm, toast } from '../../ui/index.js';
import { packList, packMeta, hasPack, packState, packCheck, downloadPack, cancelPack, removePack, onPacks } from '../packs.js';

const mb = (b) => Math.max(1, Math.round(b / 1048576));
// Почему не скачалось — коротко и по-человечески
const why = (err) => (/space/.test(err) ? t('pack.space') : /HTTP|redirect|Unable|resolve|connect|timeout|short|reset/i.test(err) ? t('pack.net') : /sha|tar/.test(err) ? t('pack.bad') : err || '');

// Строка пакета: название, что даёт, состояние и одна кнопка
export function packRow(id) {
  const p = packMeta(id), s = packState(id), have = hasPack(id), name = t('pack.' + id);
  const busy = s && (s.stage === 'get' || s.stage === 'check');
  const pct = busy && s.total ? Math.min(100, Math.floor((s.got / s.total) * 100)) : 0;
  const sub = busy ? t(s.stage === 'check' ? 'pack.checking' : 'pack.getting', { p: pct })
    : s && s.stage === 'fail' ? t('pack.fail', { why: why(s.err) })
    : (have ? t('pack.have') : mb(p.bytes) + ' ' + t('pack.mb')) + ' · ' + t('pack.' + id + '.about'); // размер — первым: подпись обрезается справа
  const btn = busy ? '<button class="btn sm" data-pkcancel="' + id + '">' + t('pack.cancel') + '</button>'
    : have ? '<button class="btn sm" data-pkdel="' + id + '">' + t('pack.del') + '</button>'
    : '<button class="btn sm" data-pkget="' + id + '">' + t('pack.get') + '</button>';
  return '<div class="cell" data-pkrow="' + id + '"><span class="grow"><span>' + esc(name) + '</span><span class="st l2" style="display:block;font-size:13px' + (s && s.stage === 'fail' ? ';white-space:normal;color:var(--red)' : '') + '">' + esc(sub) + '</span>' +
    (busy ? '<span class="sbar" style="display:block;margin-top:6px"><b style="width:' + pct + '%"></b></span>' : '') + '</span>' + btn + '</div>';
}

// Раздел на экране «Модули и функции» — только если в этой сборке есть пакеты
export function packsHTML() {
  const list = packList();
  if (!list.length) return '';
  return '<div class="hdr">' + t('pack.title') + '</div><div class="group" data-pkbox>' + list.map((p) => packRow(p.id)).join('') + '</div><p class="ftr">' + t('pack.hint') + '</p>';
}

// Скачать с вопросом: размер, мобильная сеть, место
export async function askPack(id) {
  const p = packMeta(id);
  if (!p) return false;
  const net = await packCheck();
  if (net.free != null && net.free < p.bytes * 2 + (32 << 20)) { toast(t('pack.space')); return false; }
  const text = t(net.metered ? 'pack.askMobile' : 'pack.ask', { name: t('pack.' + id), mb: mb(p.bytes) });
  if (!(await confirm(t('pack.askTitle'), text, t('pack.get')))) return false;
  downloadPack(id).catch(() => toast(t('pack.fail', { why: '' })));
  return true;
}

// Нажатия в разделе: el — корень экрана; rerender — перерисовать раздел
export function bindPacks(el) {
  const redraw = () => { const box = el.querySelector('[data-pkbox]'); if (box) box.innerHTML = packList().map((p) => packRow(p.id)).join(''); };
  const off = onPacks(redraw);
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-pkget], [data-pkcancel], [data-pkdel]');
    if (!b) return;
    const d = b.dataset;
    if (d.pkget) askPack(d.pkget);
    else if (d.pkcancel) cancelPack(d.pkcancel);
    else if (d.pkdel && (await confirm(t('pack.del'), t('pack.delAsk', { name: t('pack.' + d.pkdel) }), t('pack.del')))) removePack(d.pkdel);
  });
  return off;
}

// Для модулей (ctx.packs): модуль показывает строку пакета и подписывается на изменения
export const packsApi = { row: packRow, ask: askPack, has: hasPack, state: packState, meta: packMeta, cancel: cancelPack, onChange: onPacks };
