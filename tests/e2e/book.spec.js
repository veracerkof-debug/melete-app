// «Учебник» — отдельный инструмент: два раздела (академическая и джазовая теория), оглавление раздела, глава со схемами,
// термин-ссылка → определение → глава; ссылка из «Теории» («Гаммы») открывает учебник; грамота: нотная строка шрифтом нот,
// ритм-сетка и метр звучат; три языка
import { test, expect, sleep } from './melete.js';

// главы и видимые части в разделах (часть без глав не показывается); «Практика и справка» — в обоих
const SCHOOL = { cards: 15, parts: 4 }, JAZZ = { cards: 20, parts: 5 };
const open = async (melete, page, sec, extra = {}) => {
  if (sec === 'book') { await melete.tools({ book: { book: extra.book || {} } }); await melete.free('F', ['book']); }
  else { await melete.tools({ theory: { sec, ...extra } }); await melete.free('F', ['theory']); }
  await page.waitForSelector('.pane .book, .pane .bklink', { timeout: 15_000 });
};

test('учебник: оглавление, глава, схемы, термины', async ({ page, melete, errors }) => {
  await melete.open();
  await open(melete, page, 'book');
  await expect(page.locator('.book .bcard')).toHaveCount(SCHOOL.cards);
  await expect(page.locator('.book .bpart')).toHaveCount(SCHOOL.parts);
  // джазовый раздел
  await page.locator('.book [data-bsec="jazz"]').click();
  await expect(page.locator('.book .bcard')).toHaveCount(JAZZ.cards);
  await expect(page.locator('.book .bpart')).toHaveCount(JAZZ.parts);
  await page.screenshot({ path: 'test-results/book-toc.png' });
  await page.locator('.book [data-bsec="school"]').click();
  await expect(page.locator('.book .bcard')).toHaveCount(SCHOOL.cards);
  // поиск термина
  await page.fill('.book [data-bq]', 'тритон');
  await expect(page.locator('.book .bfrow').first()).toBeVisible();
  await page.fill('.book [data-bq]', '');
  // глава «Аккорды»: схемы нарисованы, кнопки отвечают
  await page.locator('.book [data-bch="chords"]').click();
  await sleep(page, 400);
  await expect(page.locator('.book .bkhead h2')).toHaveText('Аккорды');
  const labs = page.locator('.book .blab');
  expect(await labs.count()).toBeGreaterThan(3);
  for (let i = 0; i < await labs.count(); i++) expect((await labs.nth(i).innerHTML()).length, 'схема ' + i).toBeGreaterThan(100);
  const ust = page.locator('.book .blab').filter({ has: page.locator('[data-a="u:9M"]') }).first();
  await ust.locator('[data-a="u:9M"]').click();
  await expect(ust.locator('.us.on')).toHaveCount(1);
  await page.screenshot({ path: 'test-results/book-chapter.png' });
  // назад на главу «Интервалы»; термин → шторка → глава термина
  await page.locator('.book .bpn button').first().click();
  await sleep(page, 400);
  await expect(page.locator('.book .bkhead h2')).toHaveText('Интервалы');
  await page.locator('.book .bterm[data-term="guide"]').first().click();
  await expect(page.locator('.sheet .btdef')).toBeVisible();
  await page.locator('.sheet [data-go]').click();
  await sleep(page, 500);
  await expect(page.locator('.book .bkhead h2')).toHaveText('ii–V–I');
  // назад к оглавлению
  await page.locator('.book [data-btoc]').click();
  await expect(page.locator('.book .bsec.jazz')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.book .bcard')).toHaveCount(JAZZ.cards);
  void errors;
});

test('учебник: ссылка из раздела «Гаммы» ведёт в главу', async ({ page, melete, errors }) => {
  await melete.open();
  await open(melete, page, 'scales');
  await page.locator('.pane .bklink').click();
  await page.waitForSelector('.book .bkhead', { timeout: 15_000 });
  await expect(page.locator('.book .bkhead h2')).toHaveText('Гаммы и лады');
  void errors;
});

test('учебник: грамота — ноты, ритм, метр', async ({ page, melete, errors }) => {
  await melete.open();
  await open(melete, page, 'book', { book: { ch: 'rhythm' } });
  await expect(page.locator('.book .bkhead h2')).toHaveText('Длительности и паузы');
  // нотные строки нарисованы шрифтом нот
  expect(await page.locator('.book .bkscore').count()).toBeGreaterThan(8);
  // ритм-сетка: клетка переключается, звучит
  const cell = page.locator('.book .rgc').nth(1);
  const was = await cell.getAttribute('aria-pressed');
  await cell.click();
  await expect(page.locator('.book .rgc').nth(1)).toHaveAttribute('aria-pressed', was === 'true' ? 'false' : 'true');
  await page.locator('.book .blab .bkplay').last().click();
  // метр: смена размера и звук
  await page.locator('.book .bpn button').last().click();
  await sleep(page, 400);
  await expect(page.locator('.book .bkhead h2')).toHaveText('Метр, размер, такт');
  await page.locator('.book select[data-sel="m"]').selectOption('6/8');
  await expect(page.locator('.book .mbt')).toHaveCount(6);
  await page.locator('.book .blab').filter({ has: page.locator('.mbt') }).locator('.bkplay').click();
  await sleep(page, 600);
  await page.screenshot({ path: 'test-results/book-meter.png' });
  void errors;
});

for (const [lang, title] of [['en', 'Intervals'], ['uz', 'Intervallar']]) {
  test('учебник: язык ' + lang, async ({ page, melete, errors }) => {
    await melete.open({ settings: { lang } });
    await open(melete, page, 'book', { book: { ch: 'iv' } });
    await expect(page.locator('.book .bkhead h2')).toHaveText(title);
    expect(await page.locator('.book .bktext').innerText()).not.toMatch(/[А-Яа-яЁё]/);
    // глава грамоты на этом языке — тоже без кириллицы
    await open(melete, page, 'book', { book: { ch: 'sound' } });
    expect(await page.locator('.book .bktext').innerText()).not.toMatch(/[А-Яа-яЁё]/);
    void errors;
  });
}

test('учебник: игра и тема — клаве, проверка расположения, детектив листа', async ({ page, melete, errors }) => {
  await melete.open();
  await open(melete, page, 'book', { book: { ch: 'latin' } });
  await expect(page.locator('.book .bkhead h2')).toHaveText('Латина: клаве');
  await page.locator('.book [data-seg="mode"] [data-v="m"]').click();
  const cell = page.locator('.book .clrow button.rgc').nth(1);
  const was = await cell.getAttribute('aria-pressed');
  await cell.click();
  await expect(page.locator('.book .clrow button.rgc').nth(1)).toHaveAttribute('aria-pressed', was === 'true' ? 'false' : 'true');
  await expect(page.locator('.book .clres')).toHaveCount(2);
  await page.locator('.book .blab .bkplay').first().click();
  // аранжировка: звуки кладутся касанием клавиш, правила проверяются
  await open(melete, page, 'book', { book: { ch: 'arr' } });
  const vc = page.locator('.book .blab').filter({ has: page.locator('.vkl') });
  await vc.locator('[data-a="clr"]').click();
  await expect(vc.locator('.vk')).toHaveCount(0);
  await vc.locator('[data-midi="52"]').click();
  await vc.locator('[data-midi="58"]').click();
  expect(await vc.locator('.vk').count()).toBeGreaterThan(3);
  // тема: ответ в детективе листа
  await open(melete, page, 'book', { book: { ch: 'tune' } });
  await page.locator('.book [data-a="a:0:e"]').click();
  await expect(page.locator('.book .dtc.ok')).toHaveCount(1);
  void errors;
});

test('учебник: уроки — начальный путь, инструмент, упражнения, «урок пройден»', async ({ page, melete, errors }) => {
  await melete.open();
  await open(melete, page, 'book');
  await page.locator('.book [data-bpath]').click();
  await expect(page.locator('.book .bplist li')).toHaveCount(20);
  // первый урок пути — глава «Игра на инструменте», урок 1
  await page.locator('.book .bpgo').click();
  await expect(page.locator('.book .bkhead h2')).toHaveText('Игра на инструменте');
  await expect(page.locator('.book .bkles')).toHaveCount(6);
  const ex = page.locator('.book .bkles').first().locator('.bklex');
  await expect(ex.locator('.xn')).toHaveCount(5); // пианино: до–соль
  await ex.locator('[data-li="g"]').click();
  await expect(page.locator('.book .bkles').first().locator('.bklex .xn')).toHaveCount(6); // гитара: открытые струны
  await page.locator('.book .bkles').first().locator('[data-ldone]').click();
  await expect(page.locator('.book .bklnav button.ok')).toHaveCount(1);
  // ход пути в оглавлении
  await page.locator('.book [data-btoc]').click();
  await expect(page.locator('.book .bpath small')).toContainText('1');
  // урок ритма: схема касаний рисуется
  await open(melete, page, 'book', { book: { ch: 'rhythm', sec: 'school' } });
  await expect(page.locator('.book .bkles')).toHaveCount(4);
  await expect(page.locator('.book .bkles').first().locator('[data-lab="xtap"] .bkscore')).toHaveCount(1);
  void errors;
});
