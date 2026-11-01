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

// полоса знаками: [██████░░░░]
const bar = (f, n = 16) => { const k = Math.round(Math.max(0, Math.min(1, f)) * n); return '█'.repeat(k) + '░'.repeat(n - k); };
const prompt = (cmd) => h('div', { class: 'l-cli l-cli-dim' }, h('span', { class: 'l-cli-p' }, '~$'), ' ' + cmd);

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

// make-функции стиля поверх обычных (home.js); ctx: handlers, renderList, renderDock, hold(id)
export function styledMake(id, ctx) {
  const { handlers } = ctx;
  const go = (route) => (e) => { if (!e.currentTarget.dataset.suppress) handlers.onMelete(route); };
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
      clock: () => h('div', { class: 'clock-wrap', onclick: (e) => { if (!e.currentTarget.dataset.suppress) handlers.onGesture('clockTap'); } }, prompt('date'), h('div', { class: 'clock' })),
      tracker: () => {
        const d = prefs.tracker ? trackerData() : null;
        if (!d || (!d.practice && !d.live && !d.reading?.ref)) return null;
        const p = d.practice, lv = d.live, rd = d.reading;
        const box = h('button', { class: 'l-tracker l-cli-box', onclick: go(lv?.session ? 'session' : 'free'), 'aria-label': 'Melete' }, prompt('melete --week'));
        if (lv) box.append(h('div', { class: 'l-cli' }, h('span', { class: 'l-cli-p' }, '● '), lv.session ? t('tr.live') : t('tr.playing')));
        if (p) box.append(h('div', { class: 'l-cli' }, '[', h('span', { class: 'l-cli-p' }, bar(p.progress)), `] ${fmtDur(p.total, t)} / ${fmtDur(p.goal, t)}`));
        if (rd?.ref) box.append(h('div', { class: 'l-cli l-cli-dim' }, `bible: ${rd.ref}`));
        box.longPress = () => handlers.onBlockHold('tracker');
        return box;
      },
      balance: () => {
        const b = walletBalance();
        if (b == null) return h('div', { class: 'l-balance', hidden: true });
        return h('button', { class: 'l-balance l-cli-box', onclick: (e) => { if (!e.currentTarget.dataset.suppress) handlers.onWallet(); }, 'aria-label': t('bal.title') },
          prompt('wallet'), h('div', { class: 'l-cli' }, hasLock() ? '*** ***' : `${money(b)} ${t('bal.cur')}`));
      },
      apps: () => {
        const list = ctx.renderList();
        list.prepend(prompt('ls ~'));
        list.append(h('div', { class: 'l-cli' }, h('span', { class: 'l-cli-p' }, '~$ '), h('i', { class: 'l-cli-cur', 'aria-hidden': 'true' })));
        return list;
      },
      // значки внизу — словами в скобках: [тел] [смс]
      dock: () => {
        const el = ctx.renderDock();
        el.querySelectorAll('.l-dock-btn').forEach((b) => {
          const name = (b.getAttribute('aria-label') || '').split(/\s+/)[0].toLowerCase().slice(0, 6);
          b.classList.add('l-cli-key');
          b.replaceChildren('[', h('b', {}, name || '·'), ']');
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
