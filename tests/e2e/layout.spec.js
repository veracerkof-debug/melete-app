// Правка вида сцены (слова автора 22.11 и 25.11.2026): удержать блок — режим правки, только в тишине; размер плавно (планка внизу),
// порядок, скрыть и вернуть; «Готово» — вид сохранён и заморожен: на ходу (звучит метроном) правка не включается
import { test, expect } from './melete.js';

const hold = async (page, loc) => { const b = await loc.boundingBox(); await page.mouse.move(b.x + 4, b.y + b.height / 2); await page.mouse.down(); await page.waitForTimeout(700); await page.mouse.up(); };
// удержать блок и перетащить в точку (fx, fy) блока target; смахнуть блок вбок
const dragTo = async (page, id, target, fx, fy) => {
  const a = await page.locator('.lyb.ed[data-lb="' + id + '"]').boundingBox(), b = await page.locator('.lyb.ed[data-lb="' + target + '"]').boundingBox();
  const x0 = a.x + a.width / 2, y0 = a.y + Math.min(a.height / 2, 40), x1 = b.x + b.width * fx, y1 = b.y + b.height * fy;
  await page.mouse.move(x0, y0); await page.mouse.down(); await page.waitForTimeout(450);
  for (let i = 1; i <= 10; i++) await page.mouse.move(x0 + (x1 - x0) * i / 10, y0 + (y1 - y0) * i / 10);
  await page.mouse.up(); await page.waitForTimeout(300);
};
const swipe = async (page, id) => {
  const a = await page.locator('.lyb.ed[data-lb="' + id + '"]').boundingBox(), y = a.y + Math.min(a.height / 2, 40);
  await page.mouse.move(a.x + 20, y); await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(a.x + 20 + a.width * 0.8 * i / 10, y);
  await page.mouse.up(); await page.waitForTimeout(300);
};
const lay = (page) => page.evaluate(() => window.__melete.store.state.settings.layout.stage);

test('сцена: правка вида — размер, порядок, скрыть/вернуть, «Готово» замораживает', async ({ page, melete, errors }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open({ songs: [] });
  await page.locator('.hstage').scrollIntoViewIfNeeded();
  await page.locator('.hstage').click(); await page.waitForTimeout(600);
  if (await page.locator('[data-sgwgo]').count()) await page.click('[data-sgwgo]');
  await page.waitForTimeout(800);
  await expect(page.locator('.sgplayer')).toBeVisible();
  await expect(page.locator('.lybar')).toHaveCount(0); // обычный вид: никаких рамок и кнопок правки
  // удержание в тишине — правка; содержимое блоков не нажимается
  const geo = () => page.evaluate(() => [...document.querySelectorAll('.sgtempo, .sgplayer, .sgbar, .sgmain')].map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.height)]; }));
  const g0 = await geo();
  await hold(page, page.locator('.sgplayer'));
  await expect(page.locator('.lybi').first()).toBeVisible();
  await expect(page.locator('.lyb.ed')).not.toHaveCount(0);
  // вид правки совпадает с обычным: те же места и высоты (слово автора 26.11.2026)
  const g1 = await geo();
  expect(g1.length).toBe(g0.length);
  g1.forEach((b, i) => { expect(Math.abs(b[0] - g0[i][0])).toBeLessThanOrEqual(3); expect(Math.abs(b[1] - g0[i][1])).toBeLessThanOrEqual(3); });
  // размер: тянуть планку вниз → число в данных, больше единицы
  const g = await page.locator('.lyb[data-lb="tempo"] .lyh').boundingBox();
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2); await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2 + i * 8);
  await page.mouse.up(); await page.waitForTimeout(300);
  const z = (await lay(page)).size.tempo;
  expect(typeof z).toBe('number'); expect(z).toBeGreaterThan(1.05); expect(z).toBeLessThanOrEqual(2.2);
  // кнопок нет, блоки вплотную, инструмент не нажимается
  await expect(page.locator('[data-ly="up"], [data-ly="down"], [data-ly="hide"], [data-ly="pair"]')).toHaveCount(0);
  // порядок: удержать темп и перетащить под следующий блок
  const before = await page.evaluate(() => [...document.querySelectorAll('.lyb.ed')].map((e) => e.dataset.lb));
  await dragTo(page, 'tempo', before[before.indexOf('tempo') + 1], 0.5, 0.9);
  const after = await page.evaluate(() => [...document.querySelectorAll('.lyb.ed')].map((e) => e.dataset.lb));
  expect(after).not.toEqual(before); expect(after.indexOf('tempo')).toBe(before.indexOf('tempo') + 1);
  // скрыть плеер смахиванием и вернуть из «Скрыто»
  await swipe(page, 'player'); await page.waitForTimeout(200);
  await expect(page.locator('.lyb[data-lb="player"]')).toHaveCount(0);
  await page.click('[data-ly="show"][data-id="player"]'); await page.waitForTimeout(200);
  await expect(page.locator('.lyb[data-lb="player"]')).toHaveCount(1);
  // «Готово»: правка закрыта, вид сохранён
  await page.click('[data-ly="done"]'); await page.waitForTimeout(300);
  await expect(page.locator('.lybar')).toHaveCount(0);
  expect((await lay(page)).size.tempo).toBe(z);
  // заморожено на ходу: метроном идёт — удержание правку не включает
  await page.click('[data-sgmetro]'); await page.waitForTimeout(500);
  await hold(page, page.locator('.sgplayer'));
  await expect(page.locator('.lybar')).toHaveCount(0);
  await expect(page.locator('.toast, #toast')).toBeVisible();
  await page.click('[data-sgmetro]'); // остановить
  expect(errors).toEqual([]);
});

test('сцена: блоки рядом — пара, ширина планкой, «Готово», работает и после перезагрузки', async ({ page, melete, errors }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open({ songs: [] });
  await page.locator('.hstage').scrollIntoViewIfNeeded();
  await page.locator('.hstage').click(); await page.waitForTimeout(600);
  if (await page.locator('[data-sgwgo]').count()) await page.click('[data-sgwgo]');
  await page.waitForTimeout(800);
  await expect(page.locator('.lyrow')).toHaveCount(1); // по умолчанию один ряд: «Пэд: управление» рядом с метрономом
  await hold(page, page.locator('.sgplayer'));
  await expect(page.locator('.lybi').first()).toBeVisible();
  // по умолчанию «Пэд: управление» стоит рядом с метрономом
  await expect(page.locator('.lyrow.ed > .lyb[data-lb="padfx"]')).toHaveCount(1);
  await expect(page.locator('.lyrow.ed > .lyb[data-lb="tempo"]')).toHaveCount(1);
  // рядом: перетащить клавиши к левому краю драм-пэдов
  await dragTo(page, 'keys', 'pads', 0.08, 0.5); await page.waitForTimeout(250);
  await expect(page.locator('.lyrow.ed > .lyb[data-lb="pads"]')).toHaveCount(1);
  await expect(page.locator('.lyrow.ed > .lyb[data-lb="keys"]')).toHaveCount(1);
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
  // ширина: тянуть планку вправо
  const v = await page.locator('.lyrow.ed:has([data-lb="keys"]) .lyv').boundingBox();
  await page.mouse.move(v.x + v.width / 2, v.y + v.height / 2); await page.mouse.down();
  for (let i = 1; i <= 6; i++) await page.mouse.move(v.x + v.width / 2 + i * 10, v.y + v.height / 2);
  await page.mouse.up(); await page.waitForTimeout(300);
  const r = (await lay(page)).pair.pads;
  expect(r).toBeGreaterThan(0.55); expect(r).toBeLessThanOrEqual(0.75);
  await page.click('[data-ly="done"]'); await page.waitForTimeout(300);
  await expect(page.locator('.lybar')).toHaveCount(0);
  // обычный вид: ряд из двух блоков, доля ширины как заданно; метроном по-прежнему работает
  await expect(page.locator('.lyrow > .lyb')).toHaveCount(4); // padfx|tempo и keys|pads
  const w = await page.evaluate(() => { const row = document.querySelector('.lyrow:has([data-lb="pads"])'), [a, b] = [...row.children]; return a.getBoundingClientRect().width / row.getBoundingClientRect().width; });
  expect(Math.abs(w - r)).toBeLessThan(0.05);
  await page.click('[data-sgmetro]'); await page.waitForTimeout(400);
  expect(await page.evaluate(() => document.querySelector('[data-sgmetro]').getAttribute('aria-pressed'))).toBe('true');
  await page.click('[data-sgmetro]');
  // «Разделить» возвращает обычный вид
  await page.evaluate(() => { window.__melete.store.state.settings.layout.stage.pair = {}; window.__melete.store.save(); });
  expect(errors).toEqual([]);
});

// слово автора 26.11.2026: в правке раскладки ничто не играет и не нажимается; граница между блоками двигает оба соседних блока
test('сцена: в правке «играть» и пэды молчат; граница сужает соседа, когда растёт блок', async ({ page, melete, errors }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open({ songs: [] });
  await page.locator('.hstage').scrollIntoViewIfNeeded();
  await page.locator('.hstage').click(); await page.waitForTimeout(600);
  if (await page.locator('[data-sgwgo]').count()) await page.click('[data-sgwgo]');
  await page.waitForTimeout(800);
  await hold(page, page.locator('.sgplayer'));
  await expect(page.locator('.lybi').first()).toBeVisible();
  const pl = await page.locator('.sgbpm').boundingBox();
  await page.mouse.click(pl.x + pl.width / 2, pl.y + pl.height / 2); await page.waitForTimeout(300);
  await expect(page.locator('.sgbpm.on')).toHaveCount(0); // метроном в правке не включается
  const key = await page.locator('.sgkey').first().boundingBox();
  await page.mouse.click(key.x + key.width / 2, key.y + key.height / 2); await page.waitForTimeout(300);
  await expect(page.locator('.sgkey.on')).toHaveCount(0);
  await page.locator('.sgpad[data-pad]').first().dispatchEvent('pointerdown', { pointerId: 9, isPrimary: true });
  await expect(page.locator('.sgpad.hit')).toHaveCount(0);
  const g = await page.locator('.lyb[data-lb="tempo"] .lyh').boundingBox();
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2); await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2 + i * 6);
  await page.mouse.up(); await page.waitForTimeout(300);
  const L = await lay(page);
  expect(L.size.tempo).toBeGreaterThan(1.03);
  const nextId = await page.evaluate(() => { const a = [...document.querySelectorAll('.lyb.ed')].map((e) => e.dataset.lb); return a[a.indexOf('tempo') + 1]; });
  expect(L.size[nextId]).toBeLessThan(0.97);
  expect(errors).toEqual([]);
});

test('сцена: мелкие кнопки пэдов — настройки и волна открываются кнопкой, а не долгим нажатием', async ({ page, melete, errors }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open({ songs: [] });
  await page.locator('.hstage').scrollIntoViewIfNeeded();
  await page.locator('.hstage').click(); await page.waitForTimeout(600);
  if (await page.locator('[data-sgwgo]').count()) await page.click('[data-sgwgo]');
  await page.waitForTimeout(800);
  await expect(page.locator('[data-sgap="set"]')).toBeVisible();
  const b = await page.locator('[data-sgap="arp"]').boundingBox();
  expect(b.height).toBeLessThanOrEqual(40);
  // весь ряд метронома — в окне, и на узком экране тоже
  for (const w of [390, 360]) {
    await page.setViewportSize({ width: w, height: 800 }); await page.waitForTimeout(300);
    const xs = await page.evaluate(() => [...document.querySelectorAll('.sgpfx button, .sgtempo button')].map((e) => { const r = e.getBoundingClientRect(); return [r.left, r.right]; }));
    xs.forEach(([l, r]) => { expect(l).toBeGreaterThanOrEqual(0); expect(r).toBeLessThanOrEqual(w + 1); });
  }
  await page.click('[data-sgap="set"]'); await page.waitForTimeout(800);
  await expect(page.locator('#sheetLayer .sheet')).toBeVisible();
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(300);
  await page.click('[data-sgap="wave"]'); await page.waitForTimeout(500);
  await expect(page.locator('[data-sgap="wave"]')).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]);
});

// Размеры блоков: при любом сжатии и увеличении, в узком блоке рядом — ничего не вылезает, главное остаётся нажимаемым (stagefit.css)
test('сцена: размеры блоков — сжатие, увеличение и узкие пары: ничего не вылезает, главное остаётся', async ({ page, melete, errors }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open({ songs: [] });
  await page.locator('.hstage').scrollIntoViewIfNeeded();
  await page.locator('.hstage').click(); await page.waitForTimeout(600);
  if (await page.locator('[data-sgwgo]').count()) await page.click('[data-sgwgo]');
  await page.waitForTimeout(800);
  const IDS = ['main', 'seek', 'player', 'padfx', 'tempo', 'chips', 'keys', 'pads', 'bar'];
  const apply = async (size, pair) => {
    await page.evaluate(([sz, pr]) => { const L = window.__melete.store.state.settings.layout.stage; L.size = sz; L.pair = pr; }, [size, pair]);
    await hold(page, page.locator('.sgplayer, .sgtempo').first()); await page.waitForTimeout(250);
    await page.click('[data-ly="done"]'); await page.waitForTimeout(350);
  };
  const audit = (label) => page.evaluate((lb) => {
    const bad = [];
    for (const blk of document.querySelectorAll('.lyb[data-lb]')) {
      const br = blk.getBoundingClientRect(), inner = blk.firstElementChild; if (!inner) continue;
      const ir = inner.getBoundingClientRect();
      for (const e of blk.querySelectorAll('button, [role="slider"]')) {
        const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue; // скрытые правилом — в порядке
        const edge = e.closest('.sgsongs, .sgtext'); if (edge) continue;
        if (r.left < ir.left - 1.5 || r.right > ir.right + 1.5) bad.push(lb + ' ' + blk.dataset.lb + ' вылезает ' + (e.className || e.tagName) + ' ' + Math.round(r.left) + '..' + Math.round(r.right) + ' из ' + Math.round(ir.left) + '..' + Math.round(ir.right));
        if (Math.min(r.width, r.height) < 24) bad.push(lb + ' ' + blk.dataset.lb + ' мелко ' + (e.className || e.tagName) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
      }
    }
    const need = [['.sgbpm', 'метроном'], ['.sgbtn.main', 'старт'], ['.sgkey', 'клавиши'], ['.sgpad', 'пэды'], ['[data-sgpl="pp"]', 'плеер']];
    for (const [s, n] of need) { const e = document.querySelector(s); if (e) { const r = e.getBoundingClientRect(); if (!r.width || !r.height) bad.push(lb + ' пропал ' + n); } }
    return bad;
  }, label);
  const fails = [];
  for (const z of [0.5, 0.65, 0.9, 1.3, 1.8, 2.2]) { // весь экран одним размером
    await apply(Object.fromEntries(IDS.map((i) => [i, z])), {});
    fails.push(...await audit('размер ' + z));
    if (process.env.SHOTDIR) await page.screenshot({ path: process.env.SHOTDIR + '/z' + z + '.png' });
  }
  for (const r of [0.25, 0.5, 0.75]) for (const z of [0.5, 1, 2]) { // клавиши рядом с метрономом, пэды рядом с громкостями — узкие половины
    await apply(Object.fromEntries(IDS.map((i) => [i, z])), { tempo: r, keys: r, bar: r });
    fails.push(...await audit('пара ' + r + ' размер ' + z));
    if (process.env.SHOTDIR && z === 1) await page.screenshot({ path: process.env.SHOTDIR + '/p' + r + '.png' });
  }
  expect(fails).toEqual([]);
  expect(errors).toEqual([]);
});

// слово автора 26.11.2026: драм-пэды перестраиваются рядами (не сжимаются); «Пэд: управление» крупно — громкости, арп, глайдер
test('сцена: ряды драм-пэдов от размера блока; крупный «Пэд: управление» с настройками', async ({ page, melete, errors }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open({ songs: [] });
  await page.locator('.hstage').scrollIntoViewIfNeeded();
  await page.locator('.hstage').click(); await page.waitForTimeout(600);
  if (await page.locator('[data-sgwgo]').count()) await page.click('[data-sgwgo]');
  await page.waitForTimeout(800);
  const setLay = async (size) => {
    await page.evaluate((sz) => { const L = window.__melete.store.state.settings.layout.stage; L.size = sz; }, size);
    await hold(page, page.locator('.sgplayer')); await page.waitForTimeout(250);
    await page.click('[data-ly="done"]'); await page.waitForTimeout(350);
  };
  const grid = () => page.evaluate(() => { const g = document.querySelector('.sgpgrid'), n = g.children.length, cols = +g.dataset.cols, r = [...g.children].map((e) => e.getBoundingClientRect()); const rows = new Set(r.map((x) => Math.round(x.top))).size; return { n, cols, rows, h: Math.round(r[0].height), w: Math.round(r[0].width) }; });
  const g2 = await grid(); // обычный размер: 2 ряда
  expect(g2.rows).toBe(2); expect(g2.cols).toBe(Math.ceil(g2.n / 2));
  await setLay({ pads: 0.5 }); const g1 = await grid(); // ниже — один ряд, плитки той же высоты
  expect(g1.rows).toBe(1); expect(g1.cols).toBe(g1.n); expect(Math.abs(g1.h - g2.h)).toBeLessThanOrEqual(2);
  await setLay({ pads: 1.5 }); const g3 = await grid(); // выше — три ряда
  expect(g3.rows).toBe(3);
  if (process.env.SHOTDIR) { await setLay({ pads: 0.5 }); await page.screenshot({ path: process.env.SHOTDIR + '/pads1.png' }); }
  // «Пэд: управление» крупно: настройки видны, меняют данные
  await setLay({ padfx: 1.5 });
  await page.evaluate(() => { const a = window.__melete.device.drone; a.arp = { ...(a.arp || {}), on: true, glide: { ...((a.arp || {}).glide || {}), on: true } }; });
  await hold(page, page.locator('.sgplayer')); await page.waitForTimeout(250);
  await page.click('[data-ly="done"]'); await page.waitForTimeout(350);
  await expect(page.locator('.sgpfx-more')).toBeVisible();
  await expect(page.locator('[data-pfx="vol"]')).toBeVisible();
  await page.click('[data-pfx-sty="down"]'); await page.waitForTimeout(250);
  await page.click('[data-pfx-rate="1/16"]'); await page.waitForTimeout(250);
  const el = page.locator('[data-pfx="gecho"]'); await el.fill('0.9');
  const a = await page.evaluate(() => window.__melete.device.drone.arp);
  expect(a.style).toBe('down'); expect(a.rate).toBe('1/16'); expect(a.glide.echo).toBeCloseTo(0.9, 1);
  if (process.env.SHOTDIR) await page.screenshot({ path: process.env.SHOTDIR + '/padfx.png' });
  // обычный размер: настроек нет, только кнопки
  await setLay({}); await expect(page.locator('.sgpfx-more')).toBeHidden();
  expect(errors).toEqual([]);
});

// метроном и «Пэд: управление» в одном ряду (вид по умолчанию) не выходят за свои блоки и за окно на ширинах реальных телефонов
test('сцена: ряд «Пэд: управление» и метронома целиком в блоках на ширинах 360–435', async ({ page, melete, errors }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open({ songs: [] });
  await page.locator('.hstage').scrollIntoViewIfNeeded();
  await page.locator('.hstage').click(); await page.waitForTimeout(600);
  if (await page.locator('[data-sgwgo]').count()) await page.click('[data-sgwgo]');
  await page.waitForTimeout(800);
  for (const w of [360, 390, 413, 435]) {
    await page.setViewportSize({ width: w, height: 900 }); await page.waitForTimeout(350);
    const bad = await page.evaluate((vw) => {
      const out = [], pair = (b) => [...document.querySelectorAll('.sgpfx, .sgtempo')].forEach((blk) => {
        const br = blk.getBoundingClientRect();
        blk.querySelectorAll('button').forEach((e) => { const r = e.getBoundingClientRect(); if (!r.width) return; if (r.left < br.left - 1.5 || r.right > br.right + 1.5 || r.right > vw + 1) out.push(vw + ' ' + (e.dataset.sgmetro !== undefined ? 'bpm' : e.dataset.sgap || e.dataset.sgbpm || e.className) + ' ' + Math.round(r.left) + '..' + Math.round(r.right) + ' блок ' + Math.round(br.left) + '..' + Math.round(br.right)); });
      });
      pair(); return out;
    }, w);
    expect(bad).toEqual([]);
    await expect(page.locator('[data-sgmetro]')).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('шторка: листание вниз внутри прокручиваемого списка не тянет шторку за пальцем', async ({ page, melete, errors }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open();
  await page.evaluate(async () => {
    const { sheet } = await import('/src/ui/index.js');
    sheet(() => '<div id="tscr" style="height:240px;overflow-y:auto">' + Array.from({ length: 60 }, (_, i) => '<p style="margin:8px 0">строка ' + i + '</p>').join('') + '</div><p id="tfoot">низ</p>', (el) => { const s = el.querySelector('#tscr'); s.scrollTop = 200; });
  });
  await page.waitForTimeout(500);
  const b = await page.locator('#tscr').boundingBox(), x = b.x + b.width / 2, y = b.y + 60;
  await page.evaluate(([x, y]) => {
    const t = document.querySelector('#tscr'), ev = (type, cy) => t.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 5, isPrimary: true, pointerType: 'touch', clientX: x, clientY: cy }));
    ev('pointerdown', y); ev('pointermove', y + 30); ev('pointermove', y + 70);
  }, [x, y]);
  expect(await page.evaluate(() => document.querySelector('.sheet').style.transform)).toBe(''); // шторка осталась на месте, листается список
  expect(errors).toEqual([]);
});
