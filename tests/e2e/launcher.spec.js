// Ἐλάχιστον — отдельное приложение главного экрана (docs/launcher.md): страница на том же сервере разработки
// (/launcher/index.html). Светский вид по умолчанию, церковный режим из настроек, жесты, все приложения, пояснения.
import { test, expect } from './melete.js';

const PAGE = '/launcher/index.html';

async function open(page, prefs = {}) {
  await page.goto(PAGE);
  await page.evaluate((p) => { localStorage.clear(); localStorage.setItem('elachiston.prefs', JSON.stringify({ intro: false, lang: 'ru', ...p })); }, prefs);
  await page.reload();
  await page.waitForSelector('.l-home .clock');
  await page.waitForTimeout(600);
}

// удержание пустого места (мышью: у края экрана жесты не начинаются — там «Назад» системы)
async function hold(page, x = 60, y = 600) {
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(700);
  await page.mouse.up();
}

test('светский вид по умолчанию: часы, дата, приложения, без греческого и стиха', async ({ page, errors }) => {
  await open(page);
  await expect(page.locator('.l-daymonth')).not.toBeEmpty();
  await expect(page.locator('.l-app')).not.toHaveCount(0);
  await expect(page.locator('.l-echo')).toHaveCount(0);
  await expect(page.locator('.l-hourline')).toBeHidden();
  await expect(page.locator('.l-subline')).toBeHidden();
  await expect(page.locator('.l-tracker.demo')).toHaveCount(1); // Melete не подключено — в браузере пример блока
  await expect(page.locator('.l-balance')).toBeHidden(); // в кошельке нет записей — баланса нет
  expect(errors).toEqual([]);
});

test('церковный режим: греческий день, литургический час с пояснением, стих дня', async ({ page, errors }) => {
  await open(page, { church: true });
  await expect(page.locator('.l-echo')).toBeVisible();
  await expect(page.locator('.l-subline .ref')).not.toBeEmpty();
  await page.locator('.l-hourline').click();
  await expect(page.locator('.l-sheet .l-ex-link').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.l-sheet-wrap')).toHaveCount(0);
  await page.locator('.l-echo').click();
  await expect(page.locator('.l-sheet h2')).toHaveText(/Κυριακή|Δευτέρα|Τρίτη|Τετάρτη|Πέμπτη|Παρασκευή|Σάββατο/);
  expect(errors).toEqual([]);
});

test('удержание — настройки; церковный режим включается переключателем', async ({ page, errors }) => {
  await open(page);
  await hold(page);
  await expect(page.locator('.l-sheet h2')).toHaveText('Главный экран');
  await expect(page.locator('.l-set-tabs button.on')).toHaveText('Вид'); // четыре страницы; переключатель — вверху
  await page.locator('.l-row', { hasText: 'Церковный режим' }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.l-echo')).toBeVisible();
  expect(errors).toEqual([]);
});

test('смахнуть вверх — все приложения с поиском; Esc закрывает', async ({ page, errors }) => {
  await open(page);
  await page.mouse.move(200, 640);
  await page.mouse.down();
  await page.mouse.move(200, 600, { steps: 3 });
  await page.mouse.move(200, 380, { steps: 6 });
  await page.mouse.up();
  await expect(page.locator('.l-drawer')).toHaveClass(/open/);
  await page.locator('.l-drawer .l-search').fill('mel');
  await expect(page.locator('.l-d-app')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.locator('.l-drawer')).not.toHaveClass(/open/);
  expect(errors).toEqual([]);
});

test('каждый вид часов и живые обои рисуются без ошибок', async ({ page, errors }) => {
  for (const clock of ['tablet', 'codex', 'greek', 'sundial', 'word', 'orbit', 'flip', 'scroll', 'letters', 'mosaic', 'biblical']) {
    await open(page, { church: true, clock, wallpaper: clock === 'orbit' ? 'planet' : clock === 'word' ? 'sun' : 'hands' });
    // «Мозаика» — без текста, одни камешки: проверяется разметка, а не текст
    expect(await page.locator('.l-home .clock').evaluate((e) => e.children.length), clock).toBeGreaterThan(0);
  }
  expect(errors).toEqual([]);
});

test('смахнуть вправо — блокнот, влево — кошелёк; «Назад» закрывает', async ({ page, errors }) => {
  await open(page);
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('iframe.l-notes.open')).toHaveCount(1);
  await expect(page.frameLocator('iframe.l-notes').locator('.row').first()).toBeVisible();
  await page.evaluate(() => window.__launcherBack());
  await expect(page.locator('iframe.l-notes.open')).toHaveCount(0);
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('iframe.l-money.open:not(.l-notes)')).toHaveCount(1);
  await expect(page.frameLocator('iframe.l-money:not(.l-notes)').locator('.cats.grid .cat').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('панели идут за пальцем: потянуть вверх — все приложения; отпустить рано — вернулись', async ({ page, errors }) => {
  await open(page);
  // недалеко — панель возвращается
  await page.mouse.move(200, 640); await page.mouse.down();
  for (let y = 632; y >= 560; y -= 8) { await page.mouse.move(200, y); await page.waitForTimeout(40); } // медленно, не взмах
  await page.waitForTimeout(250);
  await expect(page.locator('.l-drawer.dragging')).toHaveCount(1);
  await page.mouse.up();
  await expect(page.locator('.l-drawer')).not.toHaveClass(/open/);
  // далеко — доезжает
  await page.mouse.move(200, 700); await page.mouse.down();
  await page.mouse.move(200, 600, { steps: 3 }); await page.mouse.move(200, 250, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('.l-drawer')).toHaveClass(/open/);
  await page.waitForTimeout(600); // панель доезжает
  // потянуть вниз за заголовок — закрывается
  const grip = await page.locator('.l-d-title').boundingBox();
  await page.mouse.move(grip.x + 40, grip.y + grip.height / 2); await page.mouse.down();
  await page.mouse.move(grip.x + 40, grip.y + 80, { steps: 3 }); await page.mouse.move(grip.x + 40, grip.y + 480, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('.l-drawer')).not.toHaveClass(/open/);
  expect(errors).toEqual([]);
});

test('кошелёк: смахнуть слева направо внутри — закрывается; блокнот — справа налево', async ({ page, errors }) => {
  await open(page);
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('iframe.l-money.open:not(.l-notes)')).toHaveCount(1);
  const wallet = page.frameLocator('iframe.l-money:not(.l-notes)');
  const box = await wallet.locator('.cats.grid').boundingBox();
  await page.mouse.move(box.x + 40, box.y + 20); await page.mouse.down();
  await page.mouse.move(box.x + 120, box.y + 22, { steps: 4 }); await page.mouse.move(box.x + 330, box.y + 24, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('iframe.l-money.open:not(.l-notes)')).toHaveCount(0);
  await page.waitForTimeout(400); // панель уехала, фокус — снова у главного экрана
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('iframe.l-notes.open')).toHaveCount(1);
  const notes = page.frameLocator('iframe.l-notes');
  const nb = await notes.locator('.list').boundingBox();
  await page.mouse.move(nb.x + 340, nb.y + 300); await page.mouse.down();
  await page.mouse.move(nb.x + 260, nb.y + 302, { steps: 4 }); await page.mouse.move(nb.x + 40, nb.y + 304, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('iframe.l-notes.open')).toHaveCount(0);
  expect(errors).toEqual([]);
});
