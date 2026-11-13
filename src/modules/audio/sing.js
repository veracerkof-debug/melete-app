// Вид «Петь» плеера медиатеки (слово автора 14.11.2026, DECISIONS «Вокал: прогресс и «Петь»»): караоке с оценкой.
// Мелодия — по отделённому вокалу записи (src/audio/melody.js → rec.mel, один раз); сверху — счёт и строка текста
// (rec.lyr), ниже — полоса: ноты мелодии бегут к линии «сейчас», поверх — линия голоса. «Минус» — дорожка вокала
// в ноль. «Дубль» — микрофон слушает, пока идёт песня; «Стоп» — счёт 0…100 (точно — 1, рядом — 0,5; без учёта октавы),
// фразы «чисто / рядом / мимо» (касание — к началу фразы), уход в центах, выше всего. Итог — в прогресс «Вокала»
// (src/music/vocalprog.js через ctx.ctxOf('vocal')). Рейтингов, сравнения с другими и серий нет — только этот дубль
// против прошлого (четвёртый принцип).
// Связь с плеером — api: { ctx, cur(), pl(), semi(), play(), mixVal(t, k), mixSet(t, k, v), mixApply(t), host() }.
import { extractMelody } from '../../audio/melody.js';
import { listenPitch } from '../../audio/voicepitch.js';
import { melodyNotes, phrasesOf, scoreTake, unpackLine, packLine } from '../../music/melody.js';
import { addToDay } from '../../music/vocalprog.js';
import { vocalsOf } from '../../core/jobs.js';
import { lineAt } from '../../audio/lyrics.js';
import { MAJ_NAMES } from '../../music/notes.js';

const LAT = 0.1; // голос отстаёт от звука на выходе и входе — так проба ложится на ноту
const nm = (m) => MAJ_NAMES[((Math.round(m) % 12) + 12) % 12] + (Math.floor(Math.round(m) / 12) - 1);

export function createSing(api) {
  const S = { id: null, ref: null, notes: [], phr: [], job: null, take: null, res: null, raf: 0, cam: null, err: null };
  const t = (k, v) => api.ctx().t(k, v), esc = (s) => api.ctx().ui.esc(s);

  // Мелодия записи: из rec.mel; нет — снять (один раз, в фоне) по дорожке вокала
  function ensure(rec) {
    if (S.id !== rec.id) { S.id = rec.id; S.ref = null; S.res = null; S.cam = null; S.err = null; }
    if (S.ref || S.job) return;
    if (rec.mel && rec.mel.v === 1 && Array.isArray(rec.mel.p)) { load(rec.mel); return; }
    const v = vocalsOf(api.ctx().files, rec.id);
    if (!v) return;
    S.job = extractMelody(v.blob).then(async (m) => {
      rec.mel = { v: 1, hop: m.hop, src: v.id, p: packLine(m.p), at: Date.now() };
      await api.ctx().files.save(rec);
      if (S.id === rec.id) load(rec.mel);
    }).catch((e) => { S.err = true; api.ctx().logErr(e); }).finally(() => { S.job = null; api.render(); });
  }
  function load(mel) {
    S.ref = unpackLine(mel.p); S.hop = mel.hop || 0.032;
    S.notes = melodyNotes(S.ref, S.hop); S.phr = phrasesOf(S.notes);
  }

  function html(rec) {
    const ctx = api.ctx();
    ensure(rec);
    if (!vocalsOf(ctx.files, rec.id)) return '<div class="pview pempty"><span>' + esc(t('sing.needStems')) + '</span><button class="btn sm" data-x="astems">' + esc(t('stems.btn')) + '</button></div>';
    if (!S.ref) return '<div class="pview pempty"><span>' + esc(t(S.err ? 'sing.melErr' : 'sing.melody')) + '</span></div>';
    const minus = api.mixVal(rec, 'vocals') === 0, on = !!(S.take && S.take.lis);
    requestAnimationFrame(loop);
    return '<div class="pview psing"><div class="sghd"><b class="num" id="sgscore">' + (S.res ? S.res.score : on ? '…' : '') + '</b><span id="sgline"></span></div>' +
      '<div class="sgsurf"><canvas id="sgcv" aria-hidden="true"></canvas><span class="sgnow num" id="sgnow"></span></div>' +
      (S.res && !on ? resHTML() : '') +
      '<div class="row sgbtns"><button class="btn sm' + (minus ? ' on' : '') + '" data-x="sgmin" aria-pressed="' + minus + '">' + esc(t('sing.minus')) + '</button>' +
      '<button class="btn sm fill" data-x="sggo">' + esc(t(on ? 'sing.stop' : 'sing.go')) + '</button></div></div>';
  }
  function resHTML() {
    const r = S.res, cnt = (k) => r.phr.filter((p) => p.r === k).length;
    return '<div class="sgres"><div class="sgsum">' + esc(t('sing.sum', { ok: cnt('ok'), near: cnt('near'), miss: cnt('miss') })) +
      (Math.abs(r.cents) >= 8 ? ' · ' + esc(t(r.cents < 0 ? 'sing.flat' : 'sing.sharp', { c: Math.abs(r.cents) })) : '') + (r.hi ? ' · ' + esc(t('sing.hi', { n: nm(r.hi) })) : '') + '</div>' +
      '<div class="sgphr">' + r.phr.map((p, i) => '<button class="sgp ' + p.r + '" data-x="apbt" data-bt="' + p.t0.toFixed(2) + '" aria-label="' + esc(t('sing.phr', { n: i + 1, p: p.p })) + '">' + (i + 1) + '</button>').join('') + '</div></div>';
  }

  // Дубль: микрофон → пробы по времени песни; песня играет; «Стоп» — счёт
  async function go(rec) {
    const ctx = api.ctx();
    if (S.take && S.take.lis) { finish(rec); return; }
    ctx.audio.unlock();
    S.res = null;
    const take = { samples: [], from: api.pl().currentTime, to: api.pl().currentTime, lis: null, t0: Date.now() };
    S.take = take;
    try {
      take.lis = await listenPitch(ctx.mic.request, () => ctx.audio.now(), (_, m) => {
        if (S.take !== take || api.pl().paused) return;
        const pos = api.pl().currentTime - LAT;
        take.to = Math.max(take.to, api.pl().currentTime);
        take.samples.push({ t: pos, m });
        if (take.samples.length > 20000) take.samples.shift();
      });
    } catch (err) { S.take = null; ctx.ui.toast(ctx.t(err && err.reason === 'denied' ? 'sing.micDenied' : 'sing.micNone')); api.render(); return; }
    if (api.pl().paused) api.play();
    api.render();
  }
  function finish(rec) {
    const take = S.take;
    if (!take) return;
    if (take.lis) take.lis.stop();
    S.take = null;
    if (!api.pl().paused) api.pl().pause();
    if (take.to - take.from < 4 || !S.ref) { api.render(); return; }
    const r = scoreTake(S.ref, S.hop, take.samples, { semi: api.semi(), from: take.from, to: take.to, phrases: S.phr });
    S.res = r;
    log(rec, r, take);
    api.render();
  }
  // В прогресс «Вокала»: кадры мелодии — в «ноты» по 0,25 с (чтобы песня весила как распевка той же длины)
  function log(rec, r, take) {
    const vc = api.ctx().ctxOf && api.ctx().ctxOf('vocal');
    if (!vc || !r.frames) return;
    const k = S.hop / 0.25, d = vc.data(), rg = d.range, voiced = take.samples.filter((x) => x.m > 0);
    const clean = voiced.filter((x) => { const f = S.ref[Math.round(x.t / S.hop)]; if (!f) return false; const dd = x.m - (f / 10 + api.semi()); return Math.abs(((dd % 12) + 18) % 12 - 6) <= 0.5; }).map((x) => Math.round(x.m));
    const hi = clean.length ? Math.max(...clean) : 0, lo = clean.length ? Math.min(...clean) : 0;
    addToDay(d, { sec: voiced.length * 0.05, n: r.frames * k, ok: r.ok * k, near: r.near * k, cs: r.cents * (r.ok + r.near) * k, cn: (r.ok + r.near) * k, hi, lo,
      up: rg && hi > rg.hi ? hi : 0, dn: rg && lo && lo < rg.lo ? lo : 0, take: { k: 'song', id: rec.id, s: r.score } });
    vc.saveData();
  }

  // Полоса: ноты мелодии (со сдвигом тональности) бегут к линии «сейчас», линия голоса — пробы дубля
  function loop() {
    cancelAnimationFrame(S.raf);
    const h = api.host(), cv = h && h.querySelector('#sgcv');
    S.raf = 0;
    if (!cv) return;
    draw(cv);
    if (!api.pl().paused || (S.take && S.take.lis)) S.raf = requestAnimationFrame(loop);
  }
  function draw(cv) {
    const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    if (!r.width || !r.height || !S.ref) return;
    const W = r.width, H = r.height;
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const cs = getComputedStyle(cv), col = (k, d) => (cs.getPropertyValue(k) || '').trim() || d;
    const tint = col('--tint', '#9C7242'), ink = col('--ink', '#222'), fill = col('--fill', '#eee'), l2 = col('--l2', '#888');
    const now = api.pl().currentTime, semi = api.semi(), span = 7, xh = W * 0.3, pps = W / span, x = (tt) => xh + (tt - now) * pps;
    const vis = S.notes.filter((n) => n.t + n.d > now - span * 0.3 && n.t < now + span);
    const ms = vis.map((n) => n.m + semi), want = ms.length ? (Math.min(...ms) + Math.max(...ms)) / 2 : S.cam ?? 60;
    S.cam = S.cam == null ? want : S.cam + (want - S.cam) * 0.05;
    const half = Math.max(7, ms.length ? (Math.max(...ms) - Math.min(...ms)) / 2 + 4 : 7), lo = S.cam - half, hi = S.cam + half;
    const y = (m) => 6 + ((hi - m) / (hi - lo)) * (H - 12), lh = (H - 12) / (hi - lo);
    for (let m = Math.floor(lo); m <= Math.ceil(hi); m++) { // дорожки нот, подпись C
      if ([1, 3, 6, 8, 10].includes(((m % 12) + 12) % 12)) { g.fillStyle = fill; g.fillRect(0, y(m + 0.5), W, lh); }
      if (m % 12 === 0) { g.fillStyle = l2; g.font = '600 10px system-ui,sans-serif'; g.fillText(nm(m), 3, y(m) + 3); }
    }
    const bh = Math.max(8, Math.min(22, lh * 0.8));
    vis.forEach((n) => {
      const x1 = x(n.t), x2 = x(n.t + n.d), cur = n.t <= now && n.t + n.d >= now;
      g.fillStyle = tint; g.globalAlpha = cur ? 1 : n.t + n.d < now ? 0.3 : 0.5;
      g.beginPath(); if (g.roundRect) g.roundRect(x1, y(n.m + semi) - bh / 2, Math.max(4, x2 - x1 - 2), bh, bh / 2); else g.rect(x1, y(n.m + semi) - bh / 2, Math.max(4, x2 - x1 - 2), bh); g.fill();
    });
    g.globalAlpha = 1;
    g.strokeStyle = ink; g.globalAlpha = 0.25; g.lineWidth = 2; g.beginPath(); g.moveTo(xh, 0); g.lineTo(xh, H); g.stroke(); g.globalAlpha = 1;
    const tk = S.take;
    if (tk && tk.samples.length) { // голос: зелёный — в ноту, жёлтый — рядом, красный — мимо
      let prev = null;
      g.lineWidth = 4; g.lineCap = 'round';
      for (const s of tk.samples) {
        if (s.t < now - span * 0.3 || !s.m) { prev = null; continue; }
        const f = S.ref[Math.round(s.t / S.hop)], dd = f ? s.m - (f / 10 + semi) : 0, ac = f ? Math.abs(((dd % 12) + 18) % 12 - 6) : 1;
        const X = x(s.t), Y = y(s.m - Math.round((s.m - (f ? f / 10 + semi : s.m)) / 12) * 12); // октава — к мелодии
        if (prev && Math.abs(Y - prev.Y) < lh * 3) { g.strokeStyle = !f ? l2 : ac <= 0.5 ? '#3E9A5E' : ac <= 1 ? '#D09A2A' : '#CC5546'; g.beginPath(); g.moveTo(prev.X, prev.Y); g.lineTo(X, Y); g.stroke(); }
        prev = { X, Y };
      }
    }
    // строка текста и нота «сейчас»
    const h = api.host(), rec = api.cur();
    const ln = h && h.querySelector('#sgline');
    if (ln && rec && rec.lyr && Array.isArray(rec.lyr.lines)) { const i = lineAt(rec.lyr.lines, now); const txt = i >= 0 ? rec.lyr.lines[i].text : ''; if (ln.textContent !== txt) ln.textContent = txt; }
    const nw = h && h.querySelector('#sgnow'), cn = S.notes.find((n) => n.t <= now && n.t + n.d >= now);
    if (nw) nw.textContent = cn ? nm(cn.m + semi) : '';
    const sc = h && h.querySelector('#sgscore');
    if (sc && tk && tk.samples.length > 20 && performance.now() - (S.scAt || 0) > 700) { S.scAt = performance.now(); sc.textContent = scoreTake(S.ref, S.hop, tk.samples, { semi, from: tk.from, to: now }).score; } // счёт по ходу — раз в 0,7 с
  }

  return {
    html,
    // раз в 200 мс от плеера: перерисовка ожила, песня встала (пауза, конец) — дубль заканчивается сам (после старта — 1,5 с)
    tick() {
      if (S.take && S.take.lis && api.pl().paused && Date.now() - S.take.t0 > 1500) { const rec = api.cur(); if (rec) finish(rec); return; }
      if (api.host() && api.host().querySelector('#sgcv') && !S.raf) loop();
    },
    click(x, rec) {
      if (x === 'sggo') go(rec);
      else if (x === 'sgmin') { const v = api.mixVal(rec, 'vocals') === 0 ? 1 : 0; api.mixSet(rec, 'vocals', v); api.mixApply(rec); api.render(); }
    },
    stop() { if (S.take && S.take.lis) S.take.lis.stop(); S.take = null; cancelAnimationFrame(S.raf); S.raf = 0; },
  };
}
