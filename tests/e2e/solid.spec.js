// Монолитная сессия и листание между инструментами (слово автора 18.11.2026)
import { test, expect } from './melete.js';

const group = (page) => page.evaluate(() => document.querySelector('.session .pane')?.dataset.group || null);
const pills = (page) => page.evaluate(() => [...document.querySelectorAll('#tpills .tb')].map((b) => b.dataset.pill));
const NONE = ['glider', 'theremin', 'drone', 'looper', 'studio', 'ear'], EDGE = ['piano', 'notes', 'beat', 'show'];

test('монолит: окна без рамок, карточек и подложек; граница — тонкая линия', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.free('HH', ['metro', 'tuner', 'piano', 'drone']);
  const st = await page.evaluate(() => {
    const cs = (el) => getComputedStyle(el), out = {};
    const ses = document.querySelector('.session');
    out.solid = ses.classList.contains('solid');
    out.panes = [...document.querySelectorAll('.session .ws .pane')].map((p) => { const c = cs(p); return { r: c.borderTopLeftRadius, sh: c.boxShadow, bw: c.borderTopWidth, bg: c.backgroundColor, focus: p.classList.contains('focus') }; });
    const d = cs(document.querySelector('.session .sdock'));
    out.dock = { bt: d.borderTopWidth, bg: d.backgroundColor, bf: d.backdropFilter };
    const sp = document.querySelector('.session .wsdiv span');
    out.line = sp.getBoundingClientRect().height;
    return out;
  });
  expect(st.solid).toBe(true);
  for (const p of st.panes) { expect(p.r).toBe('0px'); expect(p.sh).toBe('none'); expect(p.bw).toBe('0px'); }
  // фон окон не заливается плашкой: не в фокусе — прозрачный
  for (const p of st.panes.filter((x) => !x.focus)) expect(p.bg).toBe('rgba(0, 0, 0, 0)');
  expect(st.dock.bt).toBe('0px');
  expect(st.dock.bg).toBe('rgba(0, 0, 0, 0)');
  expect(st.line).toBeLessThanOrEqual(1.5);
  // граница остаётся целью для пальца
  const hit = await page.evaluate(() => { const r = document.querySelector('.session .wsdiv').getBoundingClientRect(); return Math.min(r.width, r.height); });
  expect(hit).toBeGreaterThanOrEqual(11);
  expect(errors).toEqual([]);
});

test('монолит выключается настройкой: окна снова карточками, листания нет', async ({ page, melete, errors }) => {
  await melete.open({ settings: { solidView: false } });
  await melete.free('F', ['tuner', 'metro', 'theory']);
  const r = await page.evaluate(() => ({ solid: document.querySelector('.session').classList.contains('solid'), rad: getComputedStyle(document.querySelector('.session .pane')).borderTopLeftRadius }));
  expect(r.solid).toBe(false);
  expect(r.rad).not.toBe('0px');
  const g0 = await group(page);
  await melete.swipe('.session .ws .pane', -230, 0, { fx: 0.85, fy: 0.9 , steps: 3 });
  expect(await group(page)).toBe(g0);
  expect(errors).toEqual([]);
});

test('листание в «весь экран»: смахивание влево-вправо — соседний инструмент в порядке панели', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.free('F', ['tuner', 'metro', 'theory']);
  const order = await pills(page);
  const swipeable = order.filter((g) => !NONE.includes(g));
  const g0 = await group(page);
  const i0 = swipeable.indexOf(g0);
  expect(i0).toBeGreaterThanOrEqual(0);
  const left = () => melete.swipe('.session .ws .pane', -230, 4, { fx: 0.85, fy: 0.92, steps: 3 });
  const right = () => melete.swipe('.session .ws .pane', 230, 4, { fx: 0.15, fy: 0.92, steps: 3 });
  const sel = (g) => page.evaluate((g) => document.querySelector('#tpills .tb[aria-selected="true"]')?.dataset.pill === g, g);
  // смахнуть влево — следующий; в панели он подсвечен; обратно — тот же
  if (i0 < swipeable.length - 1) {
    await left();
    const g1 = await group(page);
    expect(g1).toBe(swipeable[i0 + 1]);
    expect(await sel(g1)).toBe(true);
    // (у медиатеки есть своя прокрутка вбок — жест оттуда не начинается: там листает значок панели)
    if (g1 !== 'audio') { await right(); expect(await group(page)).toBe(g0); }
    else { await melete.click('#tpills [data-pill="' + g0 + '"]'); await page.waitForTimeout(600); }
  }
  // смахнуть вправо — предыдущий
  if (i0 > 0) {
    await right();
    expect(await group(page)).toBe(swipeable[i0 - 1]);
    expect(await sel(swipeable[i0 - 1])).toBe(true);
  }
  expect(errors).toEqual([]);
});

test('листание: не срабатывает от края «Назад», по вертикали и коротким смахиванием', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.free('F', ['tuner', 'metro', 'theory']);
  const g0 = await group(page);
  await melete.swipe('.session .ws .pane', -300, 0, { fx: 0.97, fy: 0.92 , steps: 3 }); // начало у самого края (≤ 24 px)
  expect(await group(page)).toBe(g0);
  await melete.swipe('.session .ws .pane', -40, 0, { fy: 0.92 , steps: 3 }); // коротко
  expect(await group(page)).toBe(g0);
  await melete.swipe('.session .ws .pane', -150, 220, { fy: 0.5 , steps: 3 }); // по диагонали
  expect(await group(page)).toBe(g0);
  expect(errors).toEqual([]);
});

test('листание: в глайдере (nav none) жест не работает и не уводит прочь', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.free('F', ['glider', 'metro', 'tuner']);
  expect(await group(page)).toBe('glider');
  await melete.swipe('.session .ws .pane', -230, 0, { fx: 0.85, fy: 0.9 , steps: 3 });
  expect(await group(page)).toBe('glider');
  await melete.swipe('.session .ws .pane', 230, 0, { fx: 0.15, fy: 0.9 , steps: 3 });
  expect(await group(page)).toBe('glider');
  // широкое смахивание тоже не листает: глайдер — nav none
  const w = await page.evaluate(() => document.querySelector('.session .ws').getBoundingClientRect().width);
  await melete.swipe('.session .ws .pane', -Math.round(w * 0.86), 0, { fx: 0.94, fy: 0.5, steps: 2 });
  expect(await group(page)).toBe('glider');
  expect(errors).toEqual([]);
});

test('листание: в пианино (nav edge) — только широкое смахивание от края до края', async ({ page, melete, errors }) => {
  await melete.open({ settings: { dockOrder: ['metro', 'tuner', 'piano', 'notes', 'drone', 'voice', 'audio', 'theory'] } }); // после пианино — «Ноты» (nav edge): объединённые инструменты не листаются
  await melete.free('F', ['piano', 'metro', 'tuner']);
  expect(await group(page)).toBe('piano');
  const order = await pills(page);
  const i0 = order.indexOf('piano');
  const nextOk = order.slice(i0 + 1).find((g) => !NONE.includes(g));
  const w = await page.evaluate(() => document.querySelector('.session .ws').getBoundingClientRect().width);
  // обычное смахивание — клавиши играют, окно то же
  await melete.swipe('.session .ws .pane', -230, 0, { fx: 0.85, fy: 0.9 , steps: 3 });
  expect(await group(page)).toBe('piano');
  // широкое: от правой зоны (≥ 88 % ширины) почти до левого края, быстро — листает вперёд
  await melete.swipe('.session .ws .pane', -Math.round(w * 0.86), 0, { fx: 0.9, fy: 0.9, steps: 2 });
  expect(nextOk).toBeTruthy();
  expect(await group(page)).toBe(nextOk);
  // и обратно: у соседнего — его способ (обычное смахивание или широкое от левой зоны)
  if (EDGE.includes(nextOk)) await melete.swipe('.session .ws .pane', Math.round(w * 0.86), 0, { fx: 0.1, fy: 0.9, steps: 2 });
  else await melete.swipe('.session .ws .pane', 230, 0, { fx: 0.15, fy: 0.9 , steps: 3 });
  expect(await group(page)).toBe('piano');
  expect(errors).toEqual([]);
});

test('листание: широкое смахивание не начинается с середины окна', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.free('F', ['notes', 'metro', 'tuner']);
  const g0 = await group(page);
  const w = await page.evaluate(() => document.querySelector('.session .ws').getBoundingClientRect().width);
  await melete.swipe('.session .ws .pane', -Math.round(w * 0.6), 0, { fx: 0.8, fy: 0.9 });
  expect(await group(page)).toBe(g0);
  expect(errors).toEqual([]);
});

test('жесты разделителя окон не затронуты: две половины остаются, ручка на месте', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.free('HH', ['metro', 'tuner', 'piano', 'drone']);
  expect(await melete.count('.session .ws .pane')).toBe(2);
  const before = await page.evaluate(() => document.querySelector('.session .ws .pane').getBoundingClientRect().height);
  const c = await melete.centre('.session .wsdiv.main');
  await page.mouse.move(c[0], c[1]); await page.mouse.down(); await page.mouse.move(c[0], c[1] + 90, { steps: 6 }); await page.mouse.up();
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => document.querySelector('.session .ws .pane').getBoundingClientRect().height);
  expect(after).toBeGreaterThan(before + 40);
  expect(errors).toEqual([]);
});
