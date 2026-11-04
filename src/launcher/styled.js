// Свой вид блоков главного для стилей (styles.js). Блоки те же и в том же порядке (раскладка, правка жестами,
// размеры работают как в «Классике»); стиль подменяет только то, что рисуется иначе:
//   term — Melete карточкой с клетками практики по дням; cli — всё текстом и знаками, курсор мигает;
//   menu — приложения строками со значками, папки раскрываются деревом прямо на главном.
import { prefs } from './data.js';
import { trackerData, fmtDur } from './tracker.js';
import { walletBalance } from './wallet.js';
import { hasLock } from './lock.js';
import { folderOfKey, folderName, folderApps, folderIcon } from './folders.js';
import { appOf } from './apps.js';
import { iconSVG, appIconHTML } from './icons.js';
import { isNative } from './native.js';
import { t } from './i18n.js';
import { h } from './ui.js';

// — часы знаками: цифры 3×5 из «█», в сетке (ширина клетки не зависит от шрифта) —
const GLYPH = {
  0: ['███', '█ █', '█ █', '█ █', '███'], 1: [' █ ', '██ ', ' █ ', ' █ ', '███'], 2: ['███', '  █', '███', '█  ', '███'],
  3: ['███', '  █', '███', '  █', '███'], 4: ['█ █', '█ █', '███', '  █', '  █'], 5: ['███', '█  ', '███', '  █', '███'],
  6: ['███', '█  ', '███', '█ █', '███'], 7: ['███', '  █', '  █', '  █', '  █'], 8: ['███', '█ █', '███', '█ █', '███'],
  9: ['███', '█ █', '███', '  █', '███'], ':': [' ', '█', ' ', '█', ' '],
};
export function asciiClock(el, hh, mm) {
  const s = `${hh}:${mm}`;
  const cols = [];
  [...s].forEach((ch, i) => { if (i) cols.push(null); (GLYPH[ch] || GLYPH[0])[0].split('').forEach((_, c) => cols.push([ch, c])); });
  const grid = h('span', { class: 'l-ascii', style: { gridTemplateColumns: `repeat(${cols.length}, .62em)` } });
  for (let r = 0; r < 5; r++) {
    cols.forEach((cc) => {
      const on = cc && (GLYPH[cc[0]] || GLYPH[0])[r][cc[1]] === '█';
      grid.append(h('b', { class: on ? 'on' : '' }, on ? '█' : '·'));
    });
  }
  el.replaceChildren(grid);
}

// «Командная строка» — как PowerShell (слово автора 02.11.2026): приглашение PS C:\>, команда жёлтым, параметры
// серым; вывод — таблицами Format-Table (заголовок и ----), списками Format-List (Имя : значение), ход — Write-Progress
// (голубой блок, жёлтые буквы, [oooo    ]), выбор — как подтверждение PowerShell: [П] Почта
const prompt = (cmd, ...params) => h('div', { class: 'l-cli l-ps' }, h('span', { class: 'l-ps-pr' }, 'PS C:\\> '), h('span', { class: 'l-ps-cmd' }, cmd),
  ...params.map((x) => h('span', { class: x.startsWith('-') ? 'l-ps-par' : 'l-ps-arg' }, ' ' + x)));
const psBar = (f, n = 22) => { const k = Math.round(Math.max(0, Math.min(1, f)) * n); return '[' + 'o'.repeat(k) + ' '.repeat(n - k) + ']'; };
// Write-Progress: голубой блок с жёлтыми буквами
const progress = (activity, status, f) => h('div', { class: 'l-ps-prog', 'aria-hidden': 'true' },
  h('div', {}, ' ' + activity), h('div', {}, '    ' + status), h('div', {}, '    ' + psBar(f)));
// таблица Format-Table: заголовки, черта из дефисов, строки; ширина столбца — по самому длинному
function psTable(cols, rows) {
  const w = cols.map((c, i) => Math.max(c.length, ...rows.map((r) => String(r[i]).length)));
  const line = (r) => r.map((x, i) => String(x).padEnd(w[i])).join(' ').trimEnd();
  return [h('div', { class: 'l-cli l-ps-head' }, line(cols)), h('div', { class: 'l-cli l-ps-head' }, line(w.map((n) => '-'.repeat(n)))), ...rows.map((r) => h('div', { class: 'l-cli' }, line(r)))];
}
// Format-List: «Имя : значение», двоеточия по одной линии
const psList = (pairs) => { const w = Math.max(...pairs.map(([k]) => k.length)); return pairs.map(([k, v, cls]) => h('div', { class: 'l-cli' }, h('span', { class: 'l-ps-key' }, k.padEnd(w) + ' : '), h('span', { class: cls || '' }, v))); };

const money = (n) => (n < 0 ? '−' : '') + Math.abs(Math.round(n)).toLocaleString('ru-RU').replace(/ /g, ' ');

// клетки практики: 7 дней, 6 клеток в столбце (2 часа и больше — все)
function heat(per = []) {
  const today = (new Date().getDay() + 6) % 7;
  const days = t('heat.days').split(',');
  const grid = h('div', { class: 'l-heat', 'aria-hidden': 'true' });
  for (let d = 0; d < 7; d++) {
    const on = Math.min(6, Math.ceil(((per[d] || 0) / 7200) * 6));
    const col = h('div', {}, h('div', { class: 'l-heat-c' + (d === today ? ' today' : '') }, ...Array.from({ length: 6 }, (_, r) => h('i', { class: 5 - r < on ? 'on' : '' }))),
      h('div', { class: 'l-heat-d' }, days[d] || ''));
    grid.append(col);
  }
  return grid;
}


// ═════════ общие рисунки стилей (SVG, без картинок) ═════════
const svgEl = (vb, body, cls = '') => `<svg class="${cls}" viewBox="${vb}" aria-hidden="true">${body}</svg>`;
const clamp01 = (f) => Math.max(0, Math.min(1, f || 0));

// ЖК-цифры из семи сегментов (inst): a b c d e f g
const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
const SEGP = {
  a: 'M4.5 1.5h11l-2.2 2.6H6.7z', b: 'M17 3.2v13.3l-1.3 1-1.3-1V5.6z', c: 'M17 19.5v13.3l-2.6-2.4V20.5l1.3-1z', d: 'M4.5 34.5h11l-2.2-2.6H6.7z',
  e: 'M3 19.5l1.3-1 1.3 1v9.9L3 32.8z', f: 'M3 3.2l2.6 2.4v10.9l-1.3 1-1.3-1z', g: 'M5.2 18l1.5-1.3h6.6l1.5 1.3-1.5 1.3H6.7z',
};
export function sevenSeg(el, hh, mm) {
  const digit = (ch, x) => `<g transform="translate(${x} 0)">${Object.keys(SEGP).map((k) => `<path d="${SEGP[k]}" class="${(SEG[ch] || '').includes(k) ? 'on' : 'off'}"/>`).join('')}</g>`;
  const s = `${hh}`.padStart(2, ' ') + `${mm}`;
  let x = 0, body = '';
  [...s].forEach((ch, i) => { if (i === 2) { body += `<circle cx="${x + 3}" cy="12" r="1.7" class="on"/><circle cx="${x + 3}" cy="25" r="1.7" class="on"/>`; x += 8; } if (ch !== ' ') body += digit(ch, x); x += 22; });
  el.innerHTML = svgEl(`-1 0 ${x + 1} 36`, `<g transform="skewX(-6) translate(3 0)">${body}</g>`, 'l-lcd');
}

// чёрная ручка со стрелкой и точкой (inst): f — 0..1 по дуге 270°
const knob = (f) => {
  const a = (-135 + 270 * clamp01(f)) * Math.PI / 180, x = 50 + 30 * Math.sin(a), y = 50 - 30 * Math.cos(a);
  return svgEl('0 0 100 100', `<circle cx="50" cy="50" r="46" class="k-b"/><path d="M50 50L${(50 + 18 * Math.sin(a + Math.PI)).toFixed(1)} ${(50 - 18 * Math.cos(a + Math.PI)).toFixed(1)}" class="k-n"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" class="k-d"/>`, 'l-knob');
};
// полукруглая шкала со стрелкой (inst, заряд)
const gauge = (f) => {
  const ticks = Array.from({ length: 13 }, (_, i) => { const a = Math.PI * (1 - i / 12); const r1 = 34, r2 = i % 3 ? 38 : 41; return `<path d="M${(50 + r1 * Math.cos(a)).toFixed(1)} ${(52 - r1 * Math.sin(a)).toFixed(1)}L${(50 + r2 * Math.cos(a)).toFixed(1)} ${(52 - r2 * Math.sin(a)).toFixed(1)}"/>`; }).join('');
  const a = Math.PI * (1 - clamp01(f));
  return svgEl('0 0 100 58', `<path d="M8 52H92" class="g-b"/><path d="M14 52A36 36 0 0 1 86 52" class="g-a"/>${ticks}<path d="M50 52L${(50 + 30 * Math.cos(a)).toFixed(1)} ${(52 - 30 * Math.sin(a)).toFixed(1)}" class="g-n"/>`, 'l-gauge');
};
// вертикальные столбики (panel, заряд)
const bars = (f, n = 18) => svgEl(`0 0 ${n * 10} 60`, Array.from({ length: n }, (_, i) => `<rect x="${i * 10 + 2}" y="0" width="5" height="60" rx="2.5" class="${i < Math.round(clamp01(f) * n) ? 'on' : 'off'}"/>`).join(''), 'l-bars');
// дуга с точкой (panel, практика)
const arcDot = (f) => {
  const a = Math.PI * (1 - clamp01(f)), x = 60 + 50 * Math.cos(a), y = 58 - 38 * Math.sin(a);
  return svgEl('0 0 120 64', `<path d="M10 58Q60 -18 110 58" class="ad-b"/><path d="M10 58Q60 -18 110 58" class="ad-a" pathLength="1" stroke-dasharray="${clamp01(f).toFixed(3)} 1"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" class="ad-d"/>`, 'l-arcdot');
};
// кольцо с делениями (tele): 60 делений, закрашено по доле
const tickRing = (f, mid) => {
  const n = 60, on = Math.round(clamp01(f) * n);
  const ticks = Array.from({ length: n }, (_, i) => { const a = (i / n) * 2 * Math.PI - Math.PI / 2; return `<path d="M${(50 + 38 * Math.cos(a)).toFixed(1)} ${(50 + 38 * Math.sin(a)).toFixed(1)}L${(50 + 46 * Math.cos(a)).toFixed(1)} ${(50 + 46 * Math.sin(a)).toFixed(1)}" class="${i < on ? 'on' : 'off'}"/>`; }).join('');
  return svgEl('0 0 100 100', `${ticks}<text x="50" y="56" text-anchor="middle" class="tr-t">${mid}</text>`, 'l-tring');
};
// полоса из сегментов (tele)
const segBar = (f, n = 20) => h('span', { class: 'l-segbar', 'aria-hidden': 'true' }, ...Array.from({ length: n }, (_, i) => h('i', { class: i < Math.round(clamp01(f) * n) ? 'on' : '' })));
// линия по дням недели (tele)
const lineChart = (per = []) => {
  const max = Math.max(3600, ...per), pts = per.map((v, i) => [10 + i * 30, 56 - (v / max) * 46]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1].toFixed(1)}`).join('');
  return svgEl('0 0 200 64', `<defs><linearGradient id="lcg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--l-acc)" stop-opacity=".45"/><stop offset="1" stop-color="var(--l-acc)" stop-opacity="0"/></linearGradient></defs>`
    + `${[0, 1, 2, 3, 4, 5, 6].map((i) => `<path d="M${10 + i * 30} 6V58" class="lc-g"/>`).join('')}<path d="${line}L190 58L10 58Z" fill="url(#lcg)"/><path d="${line}" class="lc-l"/>`, 'l-line');
};
// лепестки недели (soft): длина — минуты дня, сегодня — акцентом
const petals = (per = [], today) => {
  const max = Math.max(3600, ...per);
  const body = per.map((v, i) => {
    const a = (i / 7) * 360, len = 16 + 28 * Math.min(1, v / max);
    return `<path transform="rotate(${a} 50 50)" d="M50 43C${50 - 11} ${43 - len * 0.4} ${50 - 8} ${43 - len} 50 ${43 - len}C${50 + 8} ${43 - len} ${50 + 11} ${43 - len * 0.4} 50 43Z" class="${i === today ? 'pt on' : v ? 'pt' : 'pt off'}"/>`;
  }).join('');
  return svgEl('0 0 100 100', body + '<circle cx="50" cy="50" r="7" class="pt-c"/>', 'l-petals');
};
const todayIdx = () => (new Date().getDay() + 6) % 7;

// make-функции стиля поверх обычных (home.js); ctx: handlers, renderList, renderDock, hold(id)
export function styledMake(id, ctx) {
  const { handlers } = ctx;
  const go = (route) => (e) => { if (!e.currentTarget.dataset.suppress) handlers.onMelete(route); };

  // данные для стилей
  const P = () => { const d = prefs.tracker ? trackerData() : null; return { d, p: d?.practice, lv: d?.live, rd: d?.reading }; };
  const pct = (f) => Math.round(clamp01(f) * 100) + '%';
  const press = (fn) => (e) => { if (!e.currentTarget.dataset.suppress) fn(); };
  const holdT = (el) => { el.longPress = () => handlers.onBlockHold('tracker'); return el; };
  const holdB = (el) => { el.longPress = () => handlers.onBlockHold('balance'); return el; };
  const bal = () => { const b = walletBalance(); return b == null ? null : { b, shut: hasLock() }; };
  const balText = (x) => (x.shut ? '•••' : money(x.b));
  const clockTap = press(() => handlers.onGesture('clockTap'));

  if (id === 'inst') {
    return {
      clock: () => h('div', { class: 'clock-wrap l-tile wide', onclick: clockTap },
        h('div', { class: 'clock' }), h('i', { class: 'l-grille', 'aria-hidden': 'true' }), h('span', { class: 'l-brand' }, 'elachiston'), h('i', { class: 'l-nub', 'aria-hidden': 'true' })),
      tracker: () => {
        const { p } = P(), bt = ctx.battery();
        const tiles = [];
        if (p) tiles.push(h('button', { class: 'l-tile', onclick: press(() => handlers.onMelete('free')), 'aria-label': `${t('ring.practice')} ${pct(p.progress)}` },
          h('span', { class: 'l-tile-k' }, t('ring.practice')), h('span', { class: 'l-tile-g', html: knob(p.progress) }), h('span', { class: 'l-tile-v' }, pct(p.progress))));
        if (bt.level != null) tiles.push(h('div', { class: 'l-tile', 'aria-label': `${t('ring.bat')} ${pct(bt.level)}` },
          h('span', { class: 'l-tile-k' }, t('ring.bat')), h('span', { class: 'l-tile-g', html: gauge(bt.level) }), h('span', { class: 'l-tile-v' }, pct(bt.level) + (bt.charging ? ' +' : ''))));
        return tiles.length ? holdT(h('div', { class: 'l-tracker l-tiles' }, ...tiles)) : null;
      },
      balance: () => { const x = bal(); return x ? holdB(h('button', { class: 'l-balance l-pill', onclick: press(handlers.onWallet) }, h('i', { class: 'l-pill-dot' }), h('span', { class: 'l-bal-k' }, t('bal.title')), h('span', { class: 'l-bal-v' }, balText(x)), h('span', { class: 'l-bal-c' }, t('bal.cur')))) : h('div', { class: 'l-balance', hidden: true }); },
    };
  }
  if (id === 'panel') {
    return {
      clock: () => h('div', { class: 'clock-wrap l-pan', onclick: clockTap }, h('div', { class: 'clock' }), h('div', { class: 'l-date' })),
      date: () => null,
      tracker: () => {
        const { p } = P(), bt = ctx.battery();
        const pans = [];
        if (p) pans.push(h('button', { class: 'l-pan', onclick: press(() => handlers.onMelete('free')) }, h('span', { class: 'l-pan-l' }, h('small', {}, t('ring.practice')), h('b', {}, fmtDur(p.total, t))), h('span', { class: 'l-pan-g', html: arcDot(p.progress) })));
        if (bt.level != null) pans.push(h('div', { class: 'l-pan' }, h('span', { class: 'l-pan-l' }, h('small', {}, t('ring.bat')), h('b', {}, pct(bt.level))), h('span', { class: 'l-pan-g', html: bars(bt.level) })));
        return pans.length ? holdT(h('div', { class: 'l-tracker l-pans' }, ...pans)) : null;
      },
      balance: () => { const x = bal(); return x ? holdB(h('button', { class: 'l-balance l-pan', onclick: press(handlers.onWallet) }, h('span', { class: 'l-pan-l' }, h('small', {}, t('bal.title')), h('b', {}, balText(x))), h('span', { class: 'l-pan-g l-pan-tmp' }, h('i'), h('i')))) : h('div', { class: 'l-balance', hidden: true }); },
    };
  }
  if (id === 'tele') {
    return {
      tracker: () => {
        const { p, rd } = P(), bt = ctx.battery();
        const stat = (k, v, bar) => h('div', { class: 'l-tl-s' }, h('small', {}, k), h('b', {}, v), bar);
        const top = h('div', { class: 'l-tl-top' },
          p ? stat(t('tl.practice'), pct(p.progress), segBar(p.progress, 12)) : null,
          p ? stat(t('tr.week'), fmtDur(p.total, t), segBar(p.total / Math.max(1, p.goal), 12)) : null,
          bt.level != null ? stat(t('ring.bat'), pct(bt.level), h('span', { class: 'l-dots' }, ...Array.from({ length: 12 }, (_, i) => h('i', { class: i < Math.round(bt.level * 12) ? 'on' : '' })))) : null);
        const box = h('button', { class: 'l-tracker l-tele', onclick: press(() => handlers.onMelete('free')) }, top);
        if (p) box.append(h('div', { class: 'l-tl-mid' }, h('span', { class: 'l-tl-ring', html: tickRing(p.progress, pct(p.progress)) }), h('span', { class: 'l-tl-line', html: lineChart(p.per) })));
        if (rd?.ref) box.append(h('div', { class: 'l-tl-rd' }, h('small', {}, t('tr.reading')), ' ', rd.ref));
        return top.children.length ? holdT(box) : null;
      },
    };
  }
  if (id === 'cont') {
    return {
      clock: () => {
        const { p } = P();
        const ring = p ? `<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="16" class="cr-b"/><circle cx="20" cy="20" r="16" class="cr-a" pathLength="1" stroke-dasharray="${clamp01(p.progress).toFixed(3)} 1" transform="rotate(-90 20 20)"/><text x="20" y="23.5" text-anchor="middle">${Math.round(clamp01(p.progress) * 100)}</text></svg>` : '';
        return h('div', { class: 'clock-wrap l-cpill', onclick: clockTap }, h('div', { class: 'clock' }), ring ? h('span', { class: 'l-cring', html: ring }) : null);
      },
      date: () => {
        const now = new Date();
        return h('div', { class: 'l-cdate', onclick: press(() => handlers.onGesture('dateTap')) },
          h('div', { class: 'l-cdate-t' }, h('span', {}, t('cont.today')), h('b', {}, ctx.weekday(now)), h('span', {}, ctx.dayMonth(now).replace(/^\d+[\s-]*/, ''))),
          h('div', { class: 'l-cdate-n' }, String(now.getDate())));
      },
      tracker: () => {
        const { p, rd } = P();
        if (!p && !rd?.ref) return null;
        const max = Math.max(3600, ...(p?.per || []));
        return holdT(h('button', { class: 'l-tracker l-cbox', onclick: press(() => handlers.onMelete('free')) },
          h('span', { class: 'l-cbox-l' }, h('small', {}, t('ring.practice')), h('b', {}, p ? fmtDur(p.total, t) : rd.ref), p ? h('small', {}, t('tr.ofGoal', { goal: fmtDur(p.goal, t) }).replace(/ · .*$/, '')) : null),
          p ? h('span', { class: 'l-cbox-g', 'aria-hidden': 'true' }, ...p.per.map((v, i) => h('i', { class: i === todayIdx() ? 'on' : '', style: { height: `${12 + 44 * Math.min(1, v / max)}px` } }))) : null));
      },
    };
  }
  if (id === 'diary') {
    return {
      clock: () => h('div', { class: 'clock-wrap l-dhead', onclick: clockTap }, h('small', {}, ctx.monthYear(new Date())), h('div', { class: 'clock' }), h('div', { class: 'l-date' })),
      date: () => null,
      tracker: () => {
        const { p, rd } = P();
        if (!p && !rd?.ref) return null;
        const box = h('button', { class: 'l-tracker l-dlog', onclick: press(() => handlers.onMelete('free')) });
        if (p) {
          const days = p.per.map((v, i) => ({ v, i })).filter((x) => x.v > 0);
          box.append(h('div', { class: 'l-dsum' }, `${t('diary.sessions', { n: days.length })} · ${fmtDur(p.total, t)}`));
          const mon = new Date(); mon.setDate(mon.getDate() - todayIdx());
          days.forEach(({ v, i }) => {
            const d = new Date(mon); d.setDate(mon.getDate() + i);
            box.append(h('div', { class: 'l-dent' }, h('i', { class: 'l-dbar', style: { '--h': `${(i * 47) % 360}` } }),
              h('span', { class: 'l-dent-t' }, h('b', {}, ctx.dayMonth(d)), h('small', {}, ctx.weekday(d))), h('span', { class: 'l-dent-v' }, fmtDur(v, t)), h('i', { class: 'l-ddot' })));
          });
        }
        if (rd?.ref) box.append(h('p', { class: 'l-dnote' }, `${t('tr.reading')}: ${rd.ref}`));
        return holdT(box);
      },
      balance: () => { const x = bal(); return x ? holdB(h('button', { class: 'l-balance l-dent', onclick: press(handlers.onWallet) }, h('span', { class: 'l-dent-t' }, h('b', {}, t('bal.title'))), h('span', { class: 'l-dent-v' }, `${balText(x)} ${t('bal.cur')}`))) : h('div', { class: 'l-balance', hidden: true }); },
    };
  }
  if (id === 'soft') {
    return {
      tracker: () => {
        const { p, lv } = P();
        if (!p) return null;
        return holdT(h('button', { class: 'l-tracker l-soft-pt', onclick: press(() => handlers.onMelete(lv?.session ? 'session' : 'free')) },
          h('span', { class: 'l-pt-g', html: petals(p.per, todayIdx()) }),
          h('span', { class: 'l-pt-v' }, lv?.session ? t('tr.live') : fmtDur(p.total, t), h('small', {}, pct(p.progress)))));
      },
    };
  }
  if (id === 'term') {
    return {
      tracker: () => {
        const d = prefs.tracker ? trackerData() : null;
        if (!d || (!d.practice && !d.live && !d.reading?.ref)) return null;
        const p = d.practice, lv = d.live, rd = d.reading;
        const card = h('button', { class: 'l-tracker l-term', onclick: go(lv?.session ? 'session' : 'free'), 'aria-label': 'Melete' });
        if (lv) card.append(h('div', { class: 'l-term-row' }, h('span', {}, '● ' + (lv.session ? t('tr.live') : t('tr.playing'))), h('span', { class: 'l-term-sm' }, lv.what || '')));
        if (p) {
          card.append(h('div', { class: 'l-term-row' }, h('span', { class: 'l-term-big' }, fmtDur(p.total, t)), h('span', { class: 'l-term-sm' }, Math.round(p.progress * 100) + '% · ' + fmtDur(p.goal, t))));
          card.append(heat(p.per));
        }
        if (rd?.ref) card.append(h('div', { class: 'l-term-row', style: { marginTop: '8px' } }, h('span', { class: 'l-term-sm' }, t('tr.reading')), h('span', {}, rd.ref)));
        card.longPress = () => handlers.onBlockHold('tracker');
        return card;
      },
    };
  }
  if (id === 'cli') {
    return {
      clock: () => h('div', { class: 'clock-wrap', onclick: (e) => { if (!e.currentTarget.dataset.suppress) handlers.onGesture('clockTap'); } }, prompt('Get-Date', '-Format', 'HH:mm'), h('div', { class: 'clock' })),
      tracker: () => {
        const d = prefs.tracker ? trackerData() : null;
        if (!d || (!d.practice && !d.live && !d.reading?.ref)) return null;
        const p = d.practice, lv = d.live, rd = d.reading;
        const box = h('button', { class: 'l-tracker l-cli-box', onclick: go(lv?.session ? 'session' : 'free'), 'aria-label': 'Melete' }, prompt('Get-Practice', '-Week'));
        if (lv) box.append(...psList([['Status', lv.session ? t('tr.live') : t('tr.playing'), 'l-ps-ok']]));
        // неделя: Write-Progress и таблица минут по дням (сегодня — жёлтым)
        if (p) {
          box.append(progress(t('ring.practice'), `${fmtDur(p.total, t)} / ${fmtDur(p.goal, t)} · ${Math.round(clamp01(p.progress) * 100)}%`, p.progress));
          const days = t('heat.days').split(','), tdy = (new Date().getDay() + 6) % 7;
          const rows = psTable(days.map((d) => d.slice(0, 2)), [p.per.map((v) => String(Math.round((v || 0) / 60)))]);
          const last = rows[rows.length - 1];
          // сегодняшний столбец — выделен: строка таблицы перестраивается по клеткам
          const cells = p.per.map((v) => String(Math.round((v || 0) / 60)).padEnd(2));
          last.replaceChildren(...cells.map((c, k) => h('span', { class: k === tdy ? 'l-ps-cmd' : '' }, c + (k < 6 ? ' ' : ''))));
          box.append(...rows);
        }
        if (rd?.ref) box.append(...psList([[t('tr.reading'), rd.ref], ['Done', rd.done >= rd.total ? 'True' : 'False', rd.done >= rd.total ? 'l-ps-ok' : 'l-ps-dim']]));
        box.longPress = () => handlers.onBlockHold('tracker');
        return box;
      },
      balance: () => {
        const b = walletBalance();
        if (b == null) return h('div', { class: 'l-balance', hidden: true });
        return h('button', { class: 'l-balance l-cli-box', onclick: (e) => { if (!e.currentTarget.dataset.suppress) handlers.onWallet(); }, 'aria-label': t('bal.title') },
          prompt('(Get-Wallet).Balance'), h('div', { class: 'l-cli' }, hasLock() ? '********' : `${money(b)} ${t('bal.cur')}`));
      },
      apps: () => {
        const list = ctx.renderList();
        if (!list.classList.contains('l-apps')) return list; // колесо — само по себе, без строк подсказки
        // Get-ChildItem: Mode — d---- у папки, -a--- у приложения (ставит CSS), дальше — приглашение с курсором
        list.prepend(prompt('Get-ChildItem'), ...psTable(['Mode ', 'Name'], []));
        list.classList.add('l-ps-ls');
        list.append(h('div', { class: 'l-cli l-ps' }, h('span', { class: 'l-ps-pr' }, 'PS C:\\> '), h('i', { class: 'l-cli-cur', 'aria-hidden': 'true' })));
        return list;
      },
      // значки внизу — как выбор в подтверждении PowerShell: [П] Почта  [М] Музыка
      dock: () => {
        const el = ctx.renderDock();
        el.querySelectorAll('.l-dock-btn').forEach((b) => {
          const full = (b.getAttribute('aria-label') || '').trim(), name = full.length > 9 ? full.slice(0, 8) + '…' : full;
          b.classList.add('l-cli-key');
          b.replaceChildren('[', h('b', {}, (name[0] || '·').toUpperCase()), '] ', name);
        });
        return el;
      },
    };
  }
  if (id === 'menu') {
    return {
      apps: () => {
        const list = ctx.renderList();
        // значки у каждой строки; папка — «+», касание раскрывает дерево прямо здесь
        list.querySelectorAll('.l-app').forEach((btn) => {
          const item = ctx.items[+btn.dataset.i];
          if (!item) return;
          const fold = folderOfKey(item.key), app = appOf(item.key);
          if (!btn.querySelector('.l-app-ico')) {
            const ico = item.icon ? iconSVG(item.icon) : fold ? iconSVG(folderIcon(fold)) : app?.pkg && isNative() ? appIconHTML(app.pkg) : iconSVG('link');
            btn.prepend(h('span', { class: 'l-app-ico', html: ico }));
          }
          if (fold) {
            const open = openTree.has(fold.id);
            btn.classList.toggle('open', open);
            btn.append(h('span', { class: 'l-fold-tw', 'aria-hidden': 'true' }, open ? '−' : '+'));
            btn.menuFolder = () => { if (openTree.has(fold.id)) openTree.delete(fold.id); else openTree.add(fold.id); ctx.rerender(); };
            if (open) {
              const tree = h('div', { class: 'l-tree' }, ...folderApps(fold).map((a) => h('button', { onclick: () => ctx.openApp(a) }, a.label)));
              btn.after(tree);
            }
          }
        });
        return list;
      },
    };
  }
  return {};
}
const openTree = new Set();
