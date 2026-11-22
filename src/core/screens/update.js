// Обновление (src/core/update.js): полоса внизу экрана — «есть новая версия», ход скачивания, «установить»;
// шторка в профиле — сборка и канал, «Обновление»: автоматически или по кнопке, «Проверить сейчас». Полоса не перехватывает экран:
// «Потом» убирает её до следующей сборки
import { t } from '../../i18n/index.js';
import { esc, sheet, snav, seg, sw, toast } from '../../ui/index.js';
import { VARIANTS, variant, setVariant } from '../variants.js';

const pct = (f) => Math.round((f || 0) * 100);

function barHTML(s, U) {
  if (s.st === 'avail' && !U.skipped) return '<span class="grow">' + t('upd.avail', { n: s.info.build }) + '</span><button class="link" data-upd="skip">' + t('upd.later') + '</button><button class="btn fill sm" data-upd="get">' + t('upd.get') + '</button>';
  if (s.st === 'down') return '<span class="grow">' + (s.wait ? t('upd.wait') : t('upd.down', { p: pct(s.f) })) + '</span>' + (s.wait ? '<button class="link" data-upd="now">' + t('upd.mobileNow') + '</button>' : '<i class="updprog" style="--f:' + pct(s.f) + '%"></i>');
  if (s.st === 'ready') return '<span class="grow">' + t(s.onClose ? 'upd.onClose' : 'upd.ready') + '</span><button class="btn fill sm" data-upd="install">' + t(s.onClose ? 'upd.now' : 'upd.install') + '</button>';
  return '';
}

export function mountUpdateBar(app) {
  const U = app.updater;
  if (!U || !U.platform) return;
  const el = document.createElement('div');
  el.className = 'updbar';
  el.setAttribute('role', 'status');
  document.body.appendChild(el);
  const draw = (s) => { const h = barHTML(s, U); el.innerHTML = h; el.hidden = !h; };
  U.subscribe(draw);
  draw(U.state);
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-upd]'); if (!b) return;
    if (b.dataset.upd === 'skip') U.skip();
    else if (b.dataset.upd === 'get') U.download();
    else if (b.dataset.upd === 'now') U.now();
    else if (b.dataset.upd === 'install') U.install().then((r) => { if (r === 'allow') toast(t('upd.allow')); }).catch(() => toast(t('upd.err')));
  });
}

// Сборка идёт на GitHub: «Сборка 412 собирается — будет примерно через 9 мин» (или «вот-вот», если дольше обычного)
export function buildingLine(b, now = Date.now()) {
  if (!b) return '';
  const left = (b.eta || now + b.left) - now; // время готовности — от проверки, минуты убывают сами
  if (b.late || left <= 0) return t('upd.buildLate', { n: b.n });
  const m = Math.max(1, Math.round(left / 60000)), at = new Date(now + left).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return t(b.queued ? 'upd.buildQueued' : 'upd.building', { n: b.n, m, at });
}
// Инфографика обновления: цепочка «Сборка на GitHub → Готова → Скачивание → Установка». pos — где мы на цепочке (0…2,
// дробная часть — ход этапа: время сборки или доля скачанного); нет новой сборки — null (цепочка не нужна)
export function updFlow(s, now = Date.now()) {
  if (!s) return null;
  const b = s.building, mb = s.info && s.info.size ? Math.max(1, Math.round(s.info.size / 1048576)) : 0;
  if (s.st === 'down') {
    const f = Math.min(1, Math.max(0, s.f || 0));
    return { pos: 1 + f, key: s.wait ? 'wait' : 'load', p: pct(f), n: s.info && s.info.build, mb, got: mb ? Math.round(mb * f) : 0 };
  }
  if (s.st === 'ready') return { pos: 2, key: 'done', n: s.info && s.info.build, mb };
  if (s.st === 'avail' && s.info) return { pos: 1, key: 'ready', n: s.info.build, mb };
  if (b && (s.st === 'none' || s.st === 'checking' || s.st === 'err')) {
    const f = Math.min(0.97, Math.max(0.03, (now - b.started) / Math.max(1, (b.eta || now) - b.started)));
    const left = (b.eta || now + b.left) - now;
    return { pos: f, key: 'build', n: b.n, p: pct(f), late: !!b.late || left <= 0, queued: !!b.queued, m: Math.max(1, Math.round(left / 60000)), at: new Date(now + Math.max(0, left)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
  }
  return null;
}
const FLOW_STEPS = ['build', 'ready', 'load', 'inst'];
function flowHTML(s) {
  const fl = updFlow(s); if (!fl) return '';
  const cur = Math.floor(fl.pos + 1e-9), fill = Math.min(100, (fl.pos / 3) * 100);
  const head = fl.key === 'build' ? t('upd.fl.hBuild', { n: fl.n }) : fl.key === 'ready' ? t('upd.fl.hReady', { n: fl.n }) : fl.key === 'done' ? t('upd.fl.hDone', { n: fl.n })
    : fl.key === 'wait' ? t('upd.wait') : t('upd.fl.hLoad', { p: fl.p });
  const sub = fl.key === 'build' ? t(fl.late ? 'upd.fl.bLate' : fl.queued ? 'upd.fl.bQ' : 'upd.fl.bSub', { m: fl.m, at: fl.at }) : fl.key === 'ready' ? (fl.mb ? t('upd.fl.hReadySub', { mb: fl.mb }) : t('upd.fl.hReadySub0')) : fl.key === 'done' ? t('upd.fl.hDoneSub')
    : fl.mb ? t('upd.fl.hLoadSub', { got: fl.got, mb: fl.mb }) : '';
  const big = fl.key === 'build' || fl.key === 'load' ? '<b class="updfl-p num">' + fl.p + '<small>%</small></b>' : '';
  return '<div class="updflow" role="group" aria-label="' + esc(head) + '"><div class="updfl-top"><div class="updfl-t"><b>' + esc(head) + '</b>' + (sub ? '<span>' + esc(sub) + '</span>' : '') + '</div>' + big + '</div>' +
    '<div class="updfl-track" style="--f:' + fill.toFixed(1) + '%"><i class="updfl-line"></i>' + FLOW_STEPS.map((k, i) => '<span class="updfl-n' + (i < cur ? ' done' : i === cur ? ' cur' : '') + '" style="--i:' + i + '"><i></i></span>').join('') + '</div>' +
    '<div class="updfl-lbl">' + FLOW_STEPS.map((k, i) => '<span' + (i === cur ? ' class="cur"' : '') + '>' + esc(t('upd.fl.' + k)) + '</span>').join('') + '</div>' +
    (s.building && fl.key !== 'build' ? '<div class="updfl-note">' + esc(buildingLine(s.building)) + '</div>' : '') + '</div>';
}
// Статус всегда на виду (слово автора 22.11.2026): нет новой сборки — карточка «проверка / актуально / ошибка / лимит» вместо цепочки;
// раньше строка статуса пряталась в пояснение под кнопками и закрывалась кружком «?»
function statusCard(s, line) {
  if (!line) return '';
  const kind = s.st === 'checking' ? 'wait' : s.st === 'err' ? 'err' : 'ok';
  return '<div class="updflow updst ' + kind + '" role="status"><div class="updfl-top"><div class="updfl-t"><b>' + esc(line) + '</b></div></div></div>';
}
// Строка статуса в шторке
function stateLine(s) {
  if (s.st === 'checking') return t('upd.checking');
  if (s.st === 'none') return t('upd.none');
  if (s.st === 'err') return s.limit > Date.now() ? t('upd.limit', { t: new Date(s.limit).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }) : t('upd.err');
  if (s.st === 'avail') return t('upd.avail', { n: s.info.build });
  if (s.st === 'down') return s.wait ? t('upd.wait') : t('upd.down', { p: pct(s.f) });
  if (s.st === 'ready') return t('upd.ready');
  return '';
}

export function updateSheet(app) {
  const U = app.updater, st = app.store.state.settings;
  let un = null, tick = 0;
  const sh = sheet(() => {
    const s = U.state, line = stateLine(s);
    return snav(t('upd.title')) + (flowHTML(s) || statusCard(s, line)) +
      '<div class="group"><div class="cell"><span class="grow">' + t('upd.ver', { b: U.build || '—', ch: U.channel === 'dev' ? t('upd.dev') : t('upd.pre') }) + '</span></div>' +
      '<div class="cellcol">' + seg('updMode', [['auto', t('upd.mAuto')], ['button', t('upd.mButton')]], U.mode, t('upd.mode')) + '<div class="segcap">' + t(U.mode === 'auto' ? (U.platform === 'android' ? 'upd.autoAnd' : 'upd.autoWin') : 'upd.btnHint') + '</div></div>' +
      (U.platform === 'android' ? '<div class="cell"><span class="grow">' + t('upd.mobile') + '<span class="psub">' + t('upd.mobileSub', { mb: s.info && s.info.size ? Math.round(s.info.size / 1048576) : 330 }) + '</span></span>' + sw('updMobile', !!st.updMobile, t('upd.mobile')) + '</div>' : '') +
      '<button class="cell act" data-u="check"' + (s.st === 'checking' || s.st === 'down' ? ' disabled' : '') + '>' + t('upd.check') + '</button>' +
      (s.st === 'avail' ? '<button class="cell act" data-u="get">' + t('upd.get') + '</button>' : '') +
      (s.st === 'ready' ? '<button class="cell act" data-u="install">' + t('upd.install') + '</button>' : '') +
      '</div><p class="ftr">' + t('upd.hint') + '</p>';
  }, (el) => {
    un = U.subscribe(() => sh.update());
    U.fresh(); // открыли «Обновления» — свежая проверка (не чаще раза в две минуты)
    // идёт сборка — пока шторка открыта, время пересчитывается каждую минуту (без сети), проверка — раз в 4 минуты
    // (у GitHub 60 запросов в час на всю сеть Wi-Fi, а проверка — это два запроса)
    let k = 0;
    tick = setInterval(() => { if (!U.state.building) return; if (++k % 4 === 0) U.fresh(); sh.update(); }, 60000);
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-u]'); if (!b) return;
      if (b.dataset.u === 'check') U.check();
      else if (b.dataset.u === 'get') U.download();
      else if (b.dataset.u === 'install') U.install().then((r) => { if (r === 'allow') toast(t('upd.allow')); }).catch(() => toast(t('upd.err')));
    });
    // включили мобильную сеть, а скачивание ждёт Wi-Fi — сразу заново по любой сети
    el.addEventListener('change', (e) => { if (e.target.dataset.sw === 'updMobile') { st.updMobile = e.target.checked; app.store.settingsChanged(); if (st.updMobile && U.state.st === 'down' && U.state.wait) U.now(); } });
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-seg="updMode"] [data-v]'); if (!b) return;
      st.updMode = b.dataset.v; app.store.settingsChanged(); sh.update();
    });
  }, { onClose: () => { if (un) un(); clearInterval(tick); } });
  return sh;
}

// Варианты (только dev, src/core/variants.js): у каждой точки выбора — переключатель; правка слышна сразу
export function variantsSheet(app) {
  const show = () => (!VARIANTS.length ? '<p class="ftr">' + t('variant.none') + '</p>' : '') + VARIANTS.map((v) => '<div class="hdr">' + t('variant.' + v.id) + '</div><div class="group"><div class="cellcol">' +
    seg('var-' + v.id, v.options.map((o) => [o, t('variant.' + v.id + '.' + o)]), variant(v.id), t('variant.' + v.id)) + '</div></div><p class="ftr">' + t('variant.' + v.id + '.hint') + '</p>').join('');
  const sh = sheet(() => snav(t('variant.title')) + '<p class="ftr" style="margin-top:0">' + t('variant.intro') + '</p>' + show(), (el) => {
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-seg^="var-"] [data-v]'); if (!b) return;
      setVariant(app, b.parentElement.dataset.seg.slice(4), b.dataset.v); sh.update();
    });
  });
  return sh;
}
