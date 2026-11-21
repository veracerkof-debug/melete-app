// Вывод на другое устройство (Melete DEV, слово автора 18.11.2026): единая шторка «Вывод» для сессии практики, сцены и
// пульта выступления. Куда уходят звук, метроном, плеер и управление: на этот телефон, на сопряжённое устройство или
// на оба сразу. Сверху один общий выбор «Всё на…», ниже по категориям. Кнопка «Вывод» — в шапке сессии и сцены:
// касание — шторка, удержание — «Телефон ↔ Компьютер» для всего. Логика вывода — app.output (контракт в docs/link.md);
// подписи и порядок целей — чистые функции outputcats.js.
import '../../ui/output.css';
import { t } from '../../i18n/index.js';
import { esc, sheet, snav, seg, toast, icons } from '../../ui/index.js';
import { onHold, buzz } from '../../ui/hold.js';
import { isDesktop } from '../desktop.js';
import { CATS, MODES, catOfModule, targetRows, summarize, shortLabel, swapMode, linkStatus, errorKey } from '../outputcats.js';

export const OUT_IC = '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="11" height="14" rx="2"/><path d="M17 8.5a5 5 0 0 1 0 7M19.8 6a8.5 8.5 0 0 1 0 12"/></svg>';

// Вывод доступен только в dev и только когда слой вывода подключён
export const outputOn = (app) => !!(app && app.output);

const localName = () => t(isDesktop() ? 'out.localPc' : 'out.local');
const labels = (app) => ({ local: localName(), remote: t('out.remote'), both: t('out.bothShort'), mixed: t('out.mixed') });
const summary = (app) => summarize((c) => app.output.get(c));
const devLabel = (tg) => (!tg || !tg.name ? t('out.remote') : tg.kind === 'pc' ? t('out.pcName', { name: tg.name }) : tg.name);
const remoteName = (app) => devLabel(app.output.target);
const modeName = (app, m) => (m === 'local' ? localName() : m === 'both' ? t('out.both') : remoteName(app));

// «Метка» канала: «Нет связи», «Подключение…», «42 мс»
export function linkText(state) {
  const s = linkStatus(state);
  return s.kind === 'off' ? t('out.link.off') : s.kind === 'connecting' ? t('out.link.connecting') : s.ms == null ? t('out.link.on') : t('out.link.ms', { ms: s.ms });
}

const usesRemote = (app) => CATS.some((c) => app.output.get(c) !== 'local');

/* ---------- кнопка ---------- */

// Кнопка «Вывод»: значок и короткая подпись цели; точка — состояние канала (когда что-то уходит на другое устройство)
// Кнопка «Вывод» — только если есть к чему подключиться: сопряжённый компьютер или устройство (слово автора 21.11.2026: без компьютера
// вечная кнопка раздражает). Нет устройств — кнопки нет; подключение — «Настройки → Связь».
export const outputHasDevice = (app) => { try { return outputOn(app) && !!(app.output.candidates && app.output.candidates().length); } catch { return false; } };

export function outBtnHTML(app, cls = '') {
  if (!outputHasDevice(app)) return '';
  return '<button type="button" class="outbtn' + (cls ? ' ' + cls : '') + '" data-out aria-label="' + esc(t('out.btn')) + '" title="' + esc(t('out.hint')) + '">' + OUT_IC + '<span class="outl"></span><i class="outdot" aria-hidden="true"></i></button>';
}

export function outRefresh(app, root = document) {
  if (!outputOn(app)) return;
  const sum = summary(app), rem = usesRemote(app), st = linkStatus(app.output.state);
  const text = shortLabel(sum, app.output.target, labels(app)) + (rem && st.ms != null ? ' · ' + st.ms : '');
  root.querySelectorAll('.outbtn').forEach((b) => {
    const l = b.querySelector('.outl');
    if (l) l.textContent = text;
    b.dataset.k = rem ? st.kind : '';
    b.classList.toggle('away', rem);
    b.setAttribute('aria-label', t('out.btn') + ': ' + shortLabel(sum, app.output.target, labels(app)) + (rem ? ', ' + linkText(app.output.state) : ''));
  });
}

// Привязка кнопок внутри root (делегирование): касание — шторка, удержание — быстрый переключатель; обновление по подписке.
// → отписка. cat — категория по умолчанию для раскрытого списка (необязательно)
export function bindOutput(app, root, { cat = null } = {}) {
  if (!outputOn(app) || !root) return () => {};
  root.addEventListener('click', onClick);
  onHold(root, '.outbtn', () => quickSwap(app));
  const off = app.output.subscribe(() => outRefresh(app, root));
  outRefresh(app, root);
  function onClick(e) { if (e.target.closest('.outbtn')) outputSheet(app, { cat }); }
  return () => { root.removeEventListener('click', onClick); off(); };
}

// Удержание кнопки: всё на другое устройство ↔ всё на этом
export function quickSwap(app) {
  if (!outputOn(app)) return;
  const sum = summary(app), to = swapMode(sum);
  if (to === 'remote' && !app.output.target) { toast(t('out.err.noDevice')); return; }
  setAll(app, to);
  buzz();
  toast(t('out.swapped', { to: modeName(app, to) }));
}

function setAll(app, mode) { if (app.output.setAll) app.output.setAll(mode); else CATS.forEach((c) => app.output.set(c, mode)); }

/* ---------- значок в углу окна ---------- */

// Значок «уходит на другое устройство» в углу окна инструмента: подсказка поверх, касаний не перехватывает
export function badgeHTML(app, modId) {
  const cat = catOfModule(modId);
  if (!outputOn(app) || !cat) return '';
  const m = app.output.get(cat);
  if (m === 'local') return '';
  const st = linkStatus(app.output.state), name = modeName(app, m);
  return '<span class="outbadge" data-k="' + st.kind + '" aria-hidden="true" title="' + esc(name) + '">' + OUT_IC + '<span>' + esc(m === 'both' ? t('out.bothShort') : remoteName(app)) + '</span></span>';
}

/* ---------- шторка ---------- */

export function outputSheet(app, { cat = null } = {}) {
  if (!outputOn(app)) return null;
  const O = app.output;
  let open = !!cat || summary(app).mixed, ping = null, busy = false, unsub = () => {};
  const body = () => {
    const sum = summary(app), tgt = O.target, rows = targetRows(tgt), cands = O.candidates ? O.candidates() : [];
    const row = (mode, cur, attr) => {
      const r = rows.find((x) => x.mode === mode);
      const name = mode === 'local' ? localName() : mode === 'both' ? t('out.both') : devLabel({ name: r.name, kind: r.kind });
      return '<button class="cell outrow" ' + attr + '="' + mode + '"' + (r.disabled ? ' disabled' : '') + ' aria-pressed="' + (cur === mode) + '"><span class="grow">' + esc(name) +
        (mode === 'both' ? '<span class="bksub">' + esc(t('out.bothHint')) + '</span>' : '') + (r.disabled && mode === 'remote' ? '<span class="bksub">' + esc(t('out.noPaired')) + '</span>' : '') + '</span>' +
        (cur === mode ? icons.check : '') + '</button>';
    };
    const st = linkStatus(O.state), err = errorKey({ target: tgt, state: O.state, usesRemote: usesRemote(app), ping });
    return snav(t('out.title')) +
      '<div class="hdr">' + esc(t('out.all')) + '</div><div class="group">' + MODES.map((m) => row(m, sum.mixed ? null : sum.mode, 'data-all')).join('') + '</div>' +
      (cands.length > 1 && O.setTarget ? '<div class="hdr">' + esc(t('out.device')) + '</div><div class="group">' + cands.map((c) =>
        '<button class="cell outrow" data-dev="' + esc(c.key) + '" aria-pressed="' + (tgt && tgt.key === c.key) + '"><span class="grow">' + esc(c.name || t('out.remote')) + '</span>' + (tgt && tgt.key === c.key ? icons.check : '') + '</button>').join('') + '</div>' : '') +
      '<div class="hdr">' + esc(t('out.link')) + '</div><div class="group"><div class="cell"><i class="outdot big" data-k="' + st.kind + '" aria-hidden="true"></i><span class="grow">' + esc(linkText(O.state)) + '</span>' +
      (O.ping ? '<button class="link b" data-ping' + (busy || !tgt ? ' disabled' : '') + '>' + esc(t(busy ? 'out.pinging' : 'out.ping')) + '</button>' : '') + '</div></div>' +
      (err ? '<p class="ftr outerr" role="alert">' + esc(t('out.err.' + err)) + '</p>' : '') +
      '<div class="group" style="margin-top:16px"><button class="cell outmore" data-more aria-expanded="' + open + '"><span class="grow">' + esc(t('out.byCat')) + '</span><span class="l2">' + esc(sum.mixed ? t('out.mixed') : '') + '</span>' +
      '<svg class="outchev' + (open ? ' up' : '') + '" viewBox="0 0 24 24"><path d="M6 9.5l6 6 6-6"/></svg></button></div>' +
      (open ? '<div class="group">' + CATS.map((c) => '<div class="cellcol outcat' + (cat === c ? ' hot' : '') + '"><span class="l2">' + esc(t('out.cat.' + c)) + '</span>' +
        seg('ocat:' + c, [['local', esc(localShort())], ['remote', esc(t('out.remoteShort'))], ['both', esc(t('out.bothShort'))]], O.get(c), t('out.cat.' + c)) + '</div>').join('') + '</div>' : '') +
      '<p class="ftr">' + esc(t('out.foot')) + '</p>';
  };
  const localShort = () => t(isDesktop() ? 'out.localPcShort' : 'out.localShort');
  const api = sheet(body, (el) => {
    unsub = O.subscribe(() => { if (el.isConnected) api.update(); });
    el.addEventListener('click', async (e) => {
      let b;
      if ((b = e.target.closest('[data-all]'))) { if (!b.disabled) { ping = null; setAll(app, b.dataset.all); } }
      else if ((b = e.target.closest('[data-dev]'))) { if (O.setTarget) { ping = null; O.setTarget(b.dataset.dev); } }
      else if (e.target.closest('[data-more]')) { open = !open; api.update(); }
      else if ((b = e.target.closest('[data-seg] [data-v]'))) {
        const c = b.closest('[data-seg]').dataset.seg.replace(/^ocat:/, ''), m = b.dataset.v;
        if (CATS.includes(c) && m !== 'local' && !O.target) { toast(t('out.err.noDevice')); return; }
        if (CATS.includes(c)) O.set(c, m);
      } else if (e.target.closest('[data-ping]') && !busy) {
        busy = true; ping = null; api.update();
        try { ping = (await O.ping()) || { ok: false }; } catch { ping = { ok: false }; }
        busy = false; if (el.isConnected) api.update();
      }
    });
  }, { onClose: () => unsub() });
  return api;
}
