// Сет-лист в метрономе (слово автора 06.11.2026): кнопка открывает полосу песен, и она остаётся, пока её не закроют
// (помнится между запусками) — барабанщик на концерте переключает песни одним касанием. Касание песни — её темп
// и размер сразу; если метроном щёлкает — продолжает без остановки, новый темп с ближайшей доли. Удержание песни —
// её темп в этом сет-листе (целевой, «как играю» или свой), размер, порядок, убрать. Сет-лист — тот же, что у сцены
// (core/metrosets.js через ctx.setlists): собрал для концерта — он и на сцене, и в метрономе.
// Телефон стоя — полоса снизу (листается вбок); лёжа и на компьютере — колонка сбоку.

const LIST_IC = '<svg viewBox="0 0 24 24"><path d="M9 6.5h11M9 12h11M9 17.5h11"/><circle cx="4.6" cy="6.5" r="1.3"/><circle cx="4.6" cy="12" r="1.3"/><circle cx="4.6" cy="17.5" r="1.3"/></svg>';
export const SL_ICON = LIST_IC;
const METERS = [[4, 4], [3, 4], [2, 4], [6, 8], [5, 4], [7, 8], [12, 8], [2, 2]];

export function createSetlistBar(ctx, { M, cfg, apply, rerender }) {
  const { t, ui } = ctx;
  const S = () => ctx.setlists;
  const st = () => ({ open: false, set: null, song: null, ...(ctx.store.get('sl', {}) || {}) });
  const put = (patch) => ctx.store.set('sl', { ...st(), ...patch });
  const cur = () => { const s = st(); const L = S().list(); const id = s.set && L.some((x) => x.id === s.set) ? s.set : L[0] ? L[0].id : null; return id ? S().get(id) : null; };
  const meterTxt = (it) => (it.num ? it.num + '/' + it.den : '');

  // Применить песню: темп и размер; метроном не останавливается
  function play(sl, it) {
    if (!it) return;
    put({ set: sl.id, song: it.songId });
    apply({ bpm: it.bpm, num: it.num, den: it.den });
    ctx.log('сет-лист: ' + (sl.items.indexOf(it) + 1) + ' · ' + (it.bpm || '—') + ' bpm');
  }
  // Соседняя песня (пульт, часы: «вперёд/назад»)
  function step(d) {
    const sl = cur(); if (!sl || !sl.items.length) return false;
    const i = sl.items.findIndex((x) => x.songId === st().song), j = i < 0 ? 0 : Math.max(0, Math.min(sl.items.length - 1, i + d));
    play(sl, sl.items[j]); rerender(); return true;
  }

  function html() {
    if (!st().open) return '';
    const sl = cur(), s = st();
    const head = '<div class="mslh"><button class="mslname" data-sl="pick" aria-label="' + ui.esc(t('sl.pick')) + '"><b>' + ui.esc(sl ? sl.title || t('sl.untitled') : t('sl.title')) + '</b><span aria-hidden="true">▾</span></button>' +
      (sl ? '<button class="mslb" data-sl="add" aria-label="' + ui.esc(t('sl.add')) + '">+</button>' : '') +
      '<button class="mslb" data-sl="close" aria-label="' + ui.esc(t('sl.close')) + '">×</button></div>';
    if (!sl) return '<aside class="msl">' + head + '<button class="mslempty" data-sl="new">' + ui.esc(t('sl.create')) + '</button></aside>';
    const items = sl.items.map((it, i) => '<button class="mslit' + (it.songId === s.song ? ' on' : '') + '" data-sli="' + i + '" aria-pressed="' + (it.songId === s.song) + '">' +
      '<span class="msln num">' + (i + 1) + '</span><span class="mslt"><b>' + ui.esc(it.title) + '</b><span class="num">' + (it.bpm ? it.bpm + ' bpm' : '—') + (meterTxt(it) ? ' · ' + meterTxt(it) : '') + '</span></span></button>').join('');
    return '<aside class="msl">' + head + '<div class="msllist hscroll" role="list">' + (items || '<button class="mslempty" data-sl="add">' + ui.esc(t('sl.addFirst')) + '</button>') + '</div></aside>';
  }

  // Выбор сет-листа: список, новый, на сцену
  function pickSheet() {
    const L = S().list(), s = st();
    const day = (ts) => (ts ? new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '');
    ui.sheet(() => ui.snav(t('sl.title')) + '<div class="group">' + L.map((x) => '<button class="cell" data-pid="' + x.id + '"><span class="grow">' + ui.esc(x.title || t('sl.untitled')) +
      '<span class="bksub">' + ui.esc([day(x.start), ctx.tn('sl.n', x.n)].filter(Boolean).join(' · ')) + '</span></span>' + (x.id === s.set ? '✓' : ui.icons.chev) + '</button>').join('') +
      '<button class="cell act" data-new>' + ui.esc(t('sl.create')) + '</button></div>' +
      (s.set ? '<div class="group" style="margin-top:12px"><button class="cell" data-stage><span class="grow">' + ui.esc(t('sl.stage')) + '</span>' + ui.icons.chev + '</button></div>' : '') +
      '<p class="ftr">' + ui.esc(t('sl.hint')) + '</p>', (el, sh) => el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-pid]');
      if (b) { put({ set: b.dataset.pid, song: null }); sh.close(); rerender(); return; }
      if (e.target.closest('[data-new]')) { sh.close(); create(); return; }
      if (e.target.closest('[data-stage]') && st().set) { sh.close(); ctx.openStage(st().set); }
    }));
  }
  function create() {
    nameSheet(t('sl.newName'), '', (v) => { const id = S().create(v || t('sl.untitled')); put({ set: id, song: null, open: true }); rerender(); addSheet(); });
  }
  function nameSheet(title, val, ok) {
    ui.sheet(() => ui.snav(title, { right: '<button class="link b r" data-ok>' + ui.esc(t('sl.ok')) + '</button>' }) +
      '<div class="group"><div class="cell"><input class="inp grow" data-v value="' + ui.esc(val) + '" maxlength="80" aria-label="' + ui.esc(title) + '"></div></div>', (el, sh) => {
      const i = el.querySelector('[data-v]'); setTimeout(() => i.focus(), 60);
      const go = () => { sh.close(); ok(i.value.trim()); };
      el.addEventListener('click', (e) => { if (e.target.closest('[data-ok]')) go(); });
      i.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    });
  }

  // Добавить: песни из библиотеки касанием (уже добавленные отмечены) или новую — название, темп, размер
  function addSheet() {
    const sl = cur(); if (!sl) return;
    let q = '', nm = 4, dn = 4;
    const list = () => { const have = new Set((S().get(sl.id) || sl).items.map((x) => x.songId)), L = S().songs().filter((s) => !q || (s.title + ' ' + s.artist).toLowerCase().includes(q));
      return L.slice(0, 200).map((s) => '<button class="cell" data-song="' + s.id + '"' + (have.has(s.id) ? ' disabled' : '') + '><span class="grow">' + ui.esc(s.title) + (s.artist ? '<span class="bksub">' + ui.esc(s.artist) + '</span>' : '') + '</span>' + (have.has(s.id) ? '✓' : '+') + '</button>').join('') || '<p class="ftr">' + ui.esc(t('sl.noSongs')) + '</p>'; };
    const sh = ui.sheet(() => ui.snav(t('sl.add')) +
      '<div class="hdr">' + ui.esc(t('sl.quick')) + '</div><div class="group"><div class="cell mslq"><input class="inp grow" data-qt placeholder="' + ui.esc(t('sl.qTitle')) + '" aria-label="' + ui.esc(t('sl.qTitle')) + '" maxlength="80">' +
      '<input class="inp num mslbpm" data-qb type="number" inputmode="numeric" min="20" max="300" placeholder="bpm" aria-label="bpm"></div>' +
      '<div class="cell hscroll mslmeters">' + METERS.map(([a, b]) => '<button class="pill" data-qm="' + a + '/' + b + '" aria-pressed="' + (a === nm && b === dn) + '">' + a + '/' + b + '</button>').join('') + '</div>' +
      '<button class="cell act" data-qadd>' + ui.esc(t('sl.qAdd')) + '</button></div>' +
      '<div class="hdr">' + ui.esc(t('sl.lib')) + '</div><div class="group"><div class="cell"><input class="inp grow" data-q placeholder="' + ui.esc(t('sl.search')) + '" aria-label="' + ui.esc(t('sl.search')) + '"></div></div>' +
      '<div class="group msllib">' + list() + '</div>', (el) => {
      const lib = () => { el.querySelector('.msllib').innerHTML = list(); };
      el.addEventListener('input', (e) => { if (e.target.matches('[data-q]')) { q = e.target.value.trim().toLowerCase(); lib(); } });
      el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-song]');
        if (b) { S().add(sl.id, [b.dataset.song]); lib(); rerender(); return; }
        const m = e.target.closest('[data-qm]');
        if (m) { [nm, dn] = m.dataset.qm.split('/').map(Number); el.querySelectorAll('[data-qm]').forEach((x) => x.setAttribute('aria-pressed', x === m)); return; }
        if (e.target.closest('[data-qadd]')) {
          const ti = el.querySelector('[data-qt]'), bp = el.querySelector('[data-qb]');
          if (!ti.value.trim()) { ti.focus(); return; }
          S().quick(sl.id, { title: ti.value.trim(), bpm: +bp.value || cfg().bpm, num: nm, den: dn });
          ti.value = ''; bp.value = ''; lib(); rerender(); ui.toast(t('sl.added'));
        }
      });
    });
    return sh;
  }

  // Песня в сет-листе: темп (свой / целевой / как играю / по песне), размер, порядок, убрать
  function itemSheet(i) {
    const sl = cur(); if (!sl) return;
    const it0 = sl.items[i]; if (!it0) return;
    const it = () => (S().get(sl.id).items.find((x) => x.songId === it0.songId)) || it0;
    const body = () => {
      const x = it(), L = S().get(sl.id).items, k = L.findIndex((y) => y.songId === x.songId);
      const pick = (v, lab) => (v ? '<button class="pill" data-bpm="' + v + '" aria-pressed="' + (x.bpm === v) + '">' + ui.esc(lab) + ' · ' + v + '</button>' : '');
      return ui.snav(x.title) +
        '<div class="hdr">' + ui.esc(t('sl.tempo')) + '</div><div class="group"><div class="cell mslstep">' + ui.icb('data-d="-5"', '−5', t('sl.slower5'), 'txt') + ui.icb('data-d="-1"', '−1', t('sl.slower'), 'txt') +
        '<b class="num grow" style="text-align:center;font-size:28px">' + (x.bpm || '—') + '</b>' + ui.icb('data-d="1"', '+1', t('sl.faster'), 'txt') + ui.icb('data-d="5"', '+5', t('sl.faster5'), 'txt') + '</div>' +
        '<div class="cell hscroll">' + pick(x.target, t('sl.target')) + pick(x.current, t('sl.current')) + '<button class="pill" data-bpm="' + cfg().bpm + '">' + ui.esc(t('sl.now')) + ' · ' + cfg().bpm + '</button>' +
        (x.own ? '<button class="pill" data-bpm="song">' + ui.esc(t('sl.bySong')) + '</button>' : '') + '</div></div><p class="ftr">' + ui.esc(t('sl.tempoHint')) + '</p>' +
        '<div class="hdr">' + ui.esc(t('sl.meter')) + '</div><div class="group"><div class="cell hscroll">' + '<button class="pill" data-m="" aria-pressed="' + !x.num + '">' + ui.esc(t('sl.keep')) + '</button>' +
        METERS.map(([a, b]) => '<button class="pill" data-m="' + a + '/' + b + '" aria-pressed="' + (x.num === a && x.den === b) + '">' + a + '/' + b + '</button>').join('') + '</div></div>' +
        '<div class="group" style="margin-top:12px"><button class="cell" data-mv="-1"' + (k > 0 ? '' : ' disabled') + '><span class="grow">' + ui.esc(t('sl.up')) + '</span></button>' +
        '<button class="cell" data-mv="1"' + (k < L.length - 1 ? '' : ' disabled') + '><span class="grow">' + ui.esc(t('sl.down')) + '</span></button>' +
        '<button class="cell danger" data-rm>' + ui.esc(t('sl.remove')) + '</button></div>';
    };
    const sh = ui.sheet(body, (el, h) => el.addEventListener('click', (e) => {
      const x = it(), g = (s) => e.target.closest(s); let b;
      if ((b = g('[data-d]'))) S().setBpm(sl.id, x.songId, Math.max(20, Math.min(300, (x.bpm || cfg().bpm) + +b.dataset.d)));
      else if ((b = g('[data-bpm]'))) S().setBpm(sl.id, x.songId, b.dataset.bpm === 'song' ? null : +b.dataset.bpm);
      else if ((b = g('[data-m]'))) { const [a, d] = b.dataset.m ? b.dataset.m.split('/').map(Number) : [0, 0]; S().setMeter(sl.id, x.songId, a, d); }
      else if ((b = g('[data-mv]'))) { const L = S().get(sl.id).items; S().move(sl.id, L.findIndex((y) => y.songId === x.songId), +b.dataset.mv); }
      else if (g('[data-rm]')) { S().remove(sl.id, x.songId); h.close(); rerender(); return; }
      else return;
      h.update(); rerender();
      if (st().song === x.songId) { const nx = it(); apply({ bpm: nx.bpm, num: nx.num, den: nx.den }); } // звучащая песня — сразу слышно
    }));
    return sh;
  }

  function onClick(e) {
    const it = e.target.closest('[data-sli]');
    if (it) { if (Date.now() - held < 500) return; const sl = cur(); play(sl, sl && sl.items[+it.dataset.sli]); rerender(); return true; }
    const a = e.target.closest('[data-sl]');
    if (!a) return false;
    const k = a.dataset.sl;
    if (k === 'pick') pickSheet();
    else if (k === 'add') addSheet();
    else if (k === 'new') create();
    else if (k === 'close') { put({ open: false }); rerender(); }
    return true;
  }
  // удержание песни — её настройки в сет-листе
  let held = 0, hTm = 0, hSt = null;
  function onDown(e) {
    const it = e.target.closest('[data-sli]'); if (!it) return;
    hSt = { x: e.clientX, y: e.clientY }; clearTimeout(hTm);
    hTm = setTimeout(() => { held = Date.now(); hSt = null; itemSheet(+it.dataset.sli); }, 550);
  }
  function onMove(e) { if (hSt && Math.hypot(e.clientX - hSt.x, e.clientY - hSt.y) > 8) { clearTimeout(hTm); hSt = null; } }
  function onUp() { clearTimeout(hTm); hSt = null; }

  return {
    html, onClick, onDown, onMove, onUp, step,
    get open() { return !!st().open; },
    toggle() { put({ open: !st().open }); rerender(); },
    // название песни для пульта и экрана браслета
    now() { const sl = cur(); const it = sl && sl.items.find((x) => x.songId === st().song); return it ? it.title : ''; },
  };
}
