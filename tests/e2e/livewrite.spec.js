// Табы с нуля (слово автора 22.11.2026): «Писать с нуля» — пустая партия на 4 такта; касание паузы → «нота»; длительность кнопками; «+ такт».
import { test, expect } from './melete.js';

test('табы с нуля: пустая партия, нота в паузу, длительность, + такт', async ({ page, melete, errors }) => {
  test.setTimeout(120_000);
  await melete.open();
  await melete.tools({ notes: { live: { src: 'midi', metro: false, inst: 'guitar' } }, wsMap: { free: { layout: 'HH', panes: ['notes', 'piano'], focus: 0, sub: {}, ratio: 0.72 } } });
  await page.evaluate(() => document.querySelector('[data-act="free"]')?.click());
  await page.waitForSelector('.session .pane', { timeout: 10_000 });
  await page.waitForTimeout(1200);
  await page.waitForFunction(() => !document.querySelector('.session .modload'), null, { timeout: 15_000 });
  await melete.click('[data-x="lvnew"]'); await page.waitForTimeout(300);
  await melete.click('[data-x="lvblank"]');
  await page.waitForFunction(() => document.querySelectorAll('.atsurf text, .atsurf svg').length > 0, null, { timeout: 20_000 });
  await page.waitForTimeout(1500);
  await expect(page.locator('.lvkp')).toHaveCount(1); // с нуля — сразу клавиатура ввода нот
  await melete.click('[data-x="lvinend"]'); await page.waitForTimeout(400); // «Готово» — обычная правка касанием
  await expect(page.locator('[data-x="lvbaradd"]')).toHaveCount(1);
  // касание по первому такту — пауза выбрана, «добавить ноту»
  const box = await page.locator('.atsurf').boundingBox();
  await page.mouse.click(box.x + 60, box.y + 40); await page.waitForTimeout(500);
  const add = page.locator('[data-x="lvadd"]');
  await expect(add).toHaveCount(1); // пауза выбрана — предложено добавить ноту
  {
    await add.click(); await page.waitForTimeout(600);
    await expect(page.locator('[data-x="lvdur"]')).toHaveCount(5);
    await page.click('[data-x="lvdur"][data-b="0.5"]'); await page.waitForTimeout(400);
    await expect(page.locator('[data-x="lvdur"][data-b="0.5"].on')).toHaveCount(1);
  }
  await melete.click('[data-x="lvdesel"]').catch(() => {});
  await melete.click('[data-x="lvbaradd"]'); await page.waitForTimeout(800);
  expect(await page.evaluate(() => new Promise((res) => { const r = indexedDB.open('practice-audio'); r.onsuccess = () => { const q = r.result.transaction('tracks', 'readonly').objectStore('tracks').getAll(); q.onsuccess = () => res(Math.max(0, ...q.result.filter((x) => x.fmt === 'live').map((x) => (x.live && x.live.minBars) || 0))); }; }))).toBeGreaterThanOrEqual(5);
  expect(errors).toEqual([]);
});

// Выбор входа для записи табов с микрофона (слово автора 22.11.2026)
test('табы с микрофона: вход выбирается из списка, «Авто» по умолчанию', async ({ page, melete, errors }) => {
  test.setTimeout(90_000);
  await melete.open();
  await melete.tools({ notes: { live: { src: 'mic', metro: false, inst: 'guitar' } }, wsMap: { free: { layout: 'HH', panes: ['notes', 'piano'], focus: 0, sub: {}, ratio: 0.72 } } });
  await page.evaluate(() => document.querySelector('[data-act="free"]')?.click());
  await page.waitForSelector('.session .pane', { timeout: 10_000 });
  await page.waitForTimeout(1200);
  await page.waitForFunction(() => !document.querySelector('.session .modload'), null, { timeout: 15_000 });
  await melete.click('[data-x="lvnew"]'); await page.waitForTimeout(300);
  await melete.click('[data-x="lvset"]'); await page.waitForTimeout(500);
  await expect(page.locator('[data-x="lvindev"]')).toHaveCount(1);
  await page.click('[data-x="lvindev"]'); await page.waitForTimeout(900);
  await expect(page.locator('[data-dev=""]')).toHaveCount(1); // «Авто»
  expect(await page.locator('[data-dev]').count()).toBeGreaterThanOrEqual(1);
  await page.click('[data-dev=""]'); await page.waitForTimeout(400);
  void errors;
});

// Выбор MIDI-устройства для записи табов (слово автора 22.11.2026)
test('табы с MIDI: устройство выбирается, «Все» по умолчанию', async ({ page, melete, errors }) => {
  test.setTimeout(90_000);
  await melete.open();
  await melete.tools({ notes: { live: { src: 'midi', metro: false, inst: 'guitar' } }, wsMap: { free: { layout: 'HH', panes: ['notes', 'piano'], focus: 0, sub: {}, ratio: 0.72 } } });
  await page.evaluate(() => document.querySelector('[data-act="free"]')?.click());
  await page.waitForSelector('.session .pane', { timeout: 10_000 });
  await page.waitForTimeout(1200);
  await page.waitForFunction(() => !document.querySelector('.session .modload'), null, { timeout: 15_000 });
  await melete.click('[data-x="lvnew"]'); await page.waitForTimeout(300);
  await melete.click('[data-x="lvset"]'); await page.waitForTimeout(500);
  await page.click('[data-x="lvmidev"]'); await page.waitForTimeout(500);
  await expect(page.locator('[data-md=""]')).toHaveCount(1);
  await page.click('[data-md=""]'); await page.waitForTimeout(300);
  void errors;
});

// PDF для печати и Guitar Pro (слово автора 22.11.2026)
test('табы: выгрузка в PDF и Guitar Pro', async ({ page, melete, errors }) => {
  test.setTimeout(120_000);
  await melete.open();
  await melete.tools({ notes: { live: { src: 'midi', metro: false, inst: 'guitar' } }, wsMap: { free: { layout: 'HH', panes: ['notes', 'piano'], focus: 0, sub: {}, ratio: 0.72 } } });
  await page.evaluate(() => document.querySelector('[data-act="free"]')?.click());
  await page.waitForSelector('.session .pane', { timeout: 10_000 });
  await page.waitForTimeout(1200);
  await page.waitForFunction(() => !document.querySelector('.session .modload'), null, { timeout: 15_000 });
  await melete.click('[data-x="lvnew"]'); await page.waitForTimeout(300);
  await melete.click('[data-x="lvrec"]'); await page.waitForTimeout(400);
  for (const m of [64, 67, 71, 69]) {
    const c = await melete.centre('.pane[data-tool="piano"] [data-m="' + m + '"]', 0.5, 0.85);
    await page.mouse.move(c[0], c[1]); await page.mouse.down(); await page.waitForTimeout(260); await page.mouse.up(); await page.waitForTimeout(80);
  }
  await melete.click('[data-x="lvstop"]');
  await page.waitForFunction(() => document.querySelectorAll('.atsurf text').length > 5, null, { timeout: 20_000 });
  await page.waitForTimeout(1500);
  const get = async (k) => {
    await melete.click('[data-x="lvshare"]'); await page.waitForTimeout(400);
    const [d] = await Promise.all([page.waitForEvent('download', { timeout: 30_000 }), page.click('[data-k="' + k + '"]')]);
    const fs = await import('node:fs'); const buf = fs.readFileSync(await d.path());
    return { name: d.suggestedFilename(), buf };
  };
  const pdf = await get('pdf');
  expect(pdf.buf.subarray(0, 5).toString()).toBe('%PDF-');
  expect(pdf.buf.length).toBeGreaterThan(8000);
  expect(pdf.buf.toString('latin1')).toContain('/Count 1');
  if (process.env.PDF_OUT) (await import('node:fs')).writeFileSync(process.env.PDF_OUT, pdf.buf);
  const gp = await get('gp');
  expect(gp.buf.subarray(0, 2).toString()).toBe('PK');
  expect(errors).toEqual([]);
});

// Ввод нот на стане (слово автора 22.11.2026): пианино, октава — вверх/вниз, диез и бемоль — вправо/влево, окно с любой ноты, длительности, пауза, шаг назад
async function openWrite(page, melete, inst) {
  await melete.open();
  await melete.tools({ notes: { live: { src: 'midi', metro: false, inst } }, wsMap: { free: { layout: 'HH', panes: ['notes', 'piano'], focus: 0, sub: {}, ratio: 0.72 } } });
  await page.evaluate(() => document.querySelector('[data-act="free"]')?.click());
  await page.waitForSelector('.session .pane', { timeout: 10_000 });
  await page.waitForTimeout(1200);
  await page.waitForFunction(() => !document.querySelector('.session .modload'), null, { timeout: 15_000 });
  await melete.click('[data-x="lvblank"]'); // главная кнопка списка — «Писать ноты и табы»
  await expect(page.locator('.lvkp')).toHaveCount(1);
}
const savedPart = (page) => page.evaluate(() => new Promise((res) => { const r = indexedDB.open('practice-audio'); r.onsuccess = () => { const q = r.result.transaction('tracks', 'readonly').objectStore('tracks').getAll(); q.onsuccess = () => res((q.result.find((x) => x.live) || {}).live || null); }; }));
const swipeAt = async (page, loc, dx, dy) => { await loc.waitFor(); await page.waitForTimeout(250); const b = await loc.boundingBox(), x = b.x + b.width / 2, y = b.y + b.height * 0.85; await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + dx / 2, y + dy / 2, { steps: 3 }); await page.mouse.move(x + dx, y + dy, { steps: 3 }); await page.mouse.up(); await page.waitForTimeout(150); };
const tapAt = async (page, loc) => { await loc.waitFor(); await page.waitForTimeout(150); const b = await loc.boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height * 0.85); await page.waitForTimeout(100); };

test('ввод нот: пианино, октава вверх/вниз, диез вправо, бемоль влево, длительность, пауза, шаг назад', async ({ page, melete, errors }) => {
  test.setTimeout(120_000);
  await openWrite(page, melete, 'keys');
  await expect(page.locator('.lvpiano .lvpk:not(.bk)')).toHaveCount(8);
  await expect(page.locator('.lvpiano .lvpk.bk').first()).toBeVisible(); // чёрные клавиши
  await expect(page.locator('[data-x="lvindur"]')).toHaveCount(5);
  const key = (m) => page.locator('.lvpk[data-m="' + m + '"]');
  for (const m of [60, 64, 67]) await tapAt(page, key(m)); // до ми соль четвертными
  await page.click('[data-x="lvindur"][data-b="0.5"]');     // восьмые
  await swipeAt(page, key(71), 50, 0);                       // си вправо — диез (до)
  await swipeAt(page, key(62), -50, 0);                      // ре влево — бемоль
  await expect(page.locator('.lvpk[data-m="60"] sub')).toHaveText('4'); // подпись октавы у «до»
  await swipeAt(page, key(64), 0, -60);                      // вверх — октава выше (нота не ставится)
  await expect(page.locator('.lvpk[data-m="72"] sub')).toHaveText('5');
  await tapAt(page, key(72));
  await page.click('[data-x="lvinrest"]'); await page.click('[data-x="lvinrest"]'); await page.click('[data-x="lvinback"]');
  await page.waitForFunction(() => document.querySelectorAll('.atsurf text, .atsurf svg').length > 0, null, { timeout: 20_000 });
  await page.waitForTimeout(1500);
  await expect(page.locator('.lvcur')).toHaveCount(1);       // курсор на стане
  await page.waitForTimeout(900);
  const p1 = await savedPart(page);
  expect(p1 && p1.raw.map((r) => r.m)).toEqual([60, 64, 67, 72, 61, 72]); // до ми соль · си♯ · ре♭ · до октавой выше
  // окно клавиш с любой ноты: с соль и с фа-диеза
  await page.click('[data-x="lvinpick"]');
  await page.click('[data-x="lvinpc"][data-pc="7"]');
  await expect(page.locator('.lvpiano .lvpk:not(.bk)').first()).toHaveAttribute('data-m', '79'); // октава 5 → соль5
  await page.click('[data-x="lvinpick"]'); await page.click('[data-x="lvinpc"][data-pc="6"]');
  await expect(page.locator('.lvpiano .lvpk.bk').first()).toHaveAttribute('data-m', '78');
  // вид клавиш: ступени и буквы
  await page.click('[data-x="lvinkb"]'); await expect(page.locator('.lvkey')).toHaveCount(8);
  await page.click('[data-x="lvinkb"]'); await expect(page.locator('.lvpiano.abc .lvpk')).not.toHaveCount(0);
  await expect(page.locator('.lvpiano.abc .lvpk.bk')).toHaveCount(0);
  await page.click('[data-x="lvinend"]'); await page.waitForTimeout(300);
  await expect(page.locator('.lvkp')).toHaveCount(0);
  expect(errors.filter((e) => !/ResizeObserver/.test(String(e)))).toEqual([]);
});

// Табы нотами: гриф «струны × лады», касание — нота на курсор, аккорд, окно ладов
test('ввод табов: гриф, аккорд, лады вбок', async ({ page, melete, errors }) => {
  test.setTimeout(120_000);
  await openWrite(page, melete, 'guitar');
  await expect(page.locator('.lvfret')).toHaveCount(1);        // у гитары сразу гриф
  await expect(page.locator('.lvfc')).toHaveCount(6 * 7);
  const cell = (s, f) => page.locator('.lvfc[data-s="' + s + '"][data-f="' + f + '"]');
  await tapAt(page, cell(1, 3));                                // соль на тонкой E
  await page.click('[data-x="lvinstack"]');                    // аккорд: курсор стоит
  await tapAt(page, cell(6, 0)); await tapAt(page, cell(5, 2));
  await expect(page.locator('.lvfc.on')).toHaveCount(2);
  await page.click('[data-x="lvinnext"]');                     // дальше — к следующей доле
  await swipeAt(page, page.locator('.lvfc[data-f="3"]').first(), -90, 0); // вбок — другие лады
  await expect(page.locator('.lvfret .lvfc').first()).toHaveAttribute('data-f', '3');
  await page.click('[data-x="lvinmode"]');                     // переключить на клавиши
  await expect(page.locator('.lvpiano')).toHaveCount(1);
  await page.click('[data-x="lvinmode"]');
  await page.waitForTimeout(1200);
  const p1 = await savedPart(page);
  expect(p1 && p1.raw.map((r) => [r.m, r.s, r.f])).toEqual([[67, 1, 3], [40, 6, 0], [47, 5, 2]]);
  expect(errors.filter((e) => !/ResizeObserver/.test(String(e)))).toEqual([]);
});
