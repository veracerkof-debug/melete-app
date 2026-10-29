// Ἐλάχιστον — отдельное приложение главного экрана (docs/launcher.md): страница на том же сервере разработки
// (/launcher/index.html). Минимальный экран по умолчанию, церковный режим и крест из настроек, жесты, все приложения.
import { test, expect } from './melete.js';

const PAGE = '/launcher/index.html';

async function open(page, prefs = {}) {
  await page.goto(PAGE);
  await page.evaluate((p) => { localStorage.clear(); localStorage.setItem('elachiston.prefs', JSON.stringify({ v: 2, lang: 'ru', ...p })); }, prefs);
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

test('минимальный вид по умолчанию: часы, дата, приложения справа внизу, без креста и украшений', async ({ page, errors }) => {
  await open(page);
  await expect(page.locator('.l-home .clock')).toHaveText(/^\d{2}:\d{2}$/);
  await expect(page.locator('.l-date-t')).not.toBeEmpty();
  await expect(page.locator('.l-status')).toBeVisible(); // своя строка состояния
  await expect(page.locator('.l-home')).toHaveClass(/align-right/);
  const n = await page.locator('.l-app').count();
  expect(n).toBeGreaterThan(0);
  expect(n).toBeLessThanOrEqual(7);
  // список — в нижней половине экрана, у правого края
  const box = await page.locator('.l-app').first().boundingBox();
  expect(box.y).toBeGreaterThan(844 / 2);
  expect(box.x + box.width).toBeGreaterThan(390 - 40);
  await expect(page.locator('.l-cross')).toHaveCount(0);
  await expect(page.locator('.l-dock .l-dock-btn')).not.toHaveCount(0);
  await expect(page.locator('.l-tracker.demo')).toHaveCount(1); // Melete не подключено — в браузере пример блока
  await expect(page.locator('.l-balance')).toBeHidden(); // в кошельке нет записей — баланса нет
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'fade');
  expect(errors).toEqual([]);
});

test('церковный режим: крест посередине, вверху, у даты, внизу и за часами; без режима — нет', async ({ page, errors }) => {
  for (const at of ['center', 'top', 'date', 'bottom', 'back']) {
    for (const cross of ['latin', 'greek', 'orthodox', 'circle']) {
      await open(page, { church: true, cross, crossAt: at });
      await expect(page.locator('.l-cross.at-' + at + ' svg'), `${cross} ${at}`).toHaveCount(1);
    }
  }
  await open(page, { church: true, cross: 'none' });
  await expect(page.locator('.l-cross')).toHaveCount(0);
  await open(page, { church: false, cross: 'latin' });
  await expect(page.locator('.l-cross')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('удержание — настройки; церковный режим включает крест, вид креста выбирается', async ({ page, errors }) => {
  await open(page);
  await hold(page);
  await expect(page.locator('.l-sheet h2')).toHaveText('Главный экран');
  await expect(page.locator('.l-set-tabs button.on')).toHaveText('Вид'); // четыре страницы; переключатель — вверху
  await page.locator('.l-row', { hasText: 'Церковный режим' }).click();
  await page.locator('.l-cross-pick', { hasText: 'Восьмиконечный' }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.l-cross.at-center')).toBeVisible(); // по умолчанию — посередине
  expect(errors).toEqual([]);
});

test('правка на месте: удержание часов — переставить, размер, убрать и вернуть; приложения — переставить', async ({ page, errors }) => {
  await open(page);
  const clock = await page.locator('[data-blk="clock"]').boundingBox();
  await hold(page, clock.x + clock.width / 2, clock.y + clock.height / 2);
  await expect(page.locator('.l-home')).toHaveClass(/editing/);
  await expect(page.locator('.l-arr-bar .l-arr-name')).toHaveText('Часы');
  // размер — кнопкой (щипок — на телефоне)
  await page.locator('.l-arr-bar .l-arr-k').last().click();
  await expect(page.locator('.l-arr-bar .l-arr-v')).toHaveText('105 %');
  // дату — над часами: перетащить
  const date = await page.locator('[data-blk="date"]').boundingBox();
  const c2 = await page.locator('[data-blk="clock"]').boundingBox();
  await page.mouse.move(date.x + 20, date.y + date.height / 2); await page.mouse.down();
  await page.mouse.move(date.x + 20, date.y - 20, { steps: 4 }); await page.mouse.move(date.x + 20, c2.y + 5, { steps: 6 });
  await page.mouse.up();
  const order = await page.locator('[data-blk]').evaluateAll((els) => els.map((e) => e.dataset.blk));
  expect(order.indexOf('date')).toBeLessThan(order.indexOf('clock'));
  // убрать дату и вернуть
  await page.locator('[data-blk="date"]').click();
  await page.locator('.l-arr-bar .l-arr-chip.danger').click();
  await expect(page.locator('[data-blk="date"]')).toHaveCount(0);
  await page.locator('.l-arr-bar .l-arr-chip', { hasText: 'Дата' }).click();
  await expect(page.locator('[data-blk="date"]')).toHaveCount(1);
  // приложение — вниз на одно место
  const names = () => page.locator('.l-app .label').allTextContents();
  const before = await names();
  const a0 = await page.locator('.l-app').nth(0).boundingBox();
  const a1 = await page.locator('.l-app').nth(1).boundingBox();
  await page.mouse.move(a0.x + a0.width - 20, a0.y + a0.height / 2); await page.mouse.down();
  await page.mouse.move(a0.x + a0.width - 20, a0.y + a0.height, { steps: 4 }); await page.mouse.move(a0.x + a0.width - 20, a1.y + a1.height - 4, { steps: 6 });
  await page.mouse.up();
  expect((await names()).slice(0, 2)).toEqual([before[1], before[0]]);
  // касание в правке ничего не открывает; «Готово» — выход
  await page.locator('.l-arr-done').click();
  await expect(page.locator('.l-home')).not.toHaveClass(/editing/);
  await expect(page.locator('.l-arr-bar')).toHaveCount(0);
  // «Назад» тоже выходит
  await hold(page, clock.x + clock.width / 2, clock.y + clock.height / 2 + 40);
  await page.evaluate(() => window.__launcherBack());
  await expect(page.locator('.l-home')).not.toHaveClass(/editing/);
  expect(errors).toEqual([]);
});

test('скрыть приложение: из «Всех приложений» — нет нигде, в поиске тоже; вернуть — из настроек', async ({ page, errors }) => {
  await open(page);
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('.l-drawer')).toHaveClass(/open/);
  const app = page.locator('.l-d-app', { hasText: 'Музыка' });
  const box = await app.boundingBox();
  await page.mouse.move(box.x + 30, box.y + box.height / 2); await page.mouse.down(); await page.waitForTimeout(700); await page.mouse.up();
  await page.locator('.l-sheet .l-pick', { hasText: 'Скрыть приложение' }).click();
  await expect(page.locator('.l-d-app', { hasText: 'Музыка' })).toHaveCount(0);
  await page.locator('.l-drawer .l-search').fill('муз');
  await expect(page.locator('.l-d-app', { hasText: 'Музыка' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('.l-app .label', { hasText: 'Музыка' })).toHaveCount(0); // и с главного
  await hold(page, 60, 330);
  await page.locator('.l-set-tabs button', { hasText: 'Главный' }).click();
  await expect(page.locator('.l-edit-row', { hasText: 'Музыка' })).toHaveCount(1);
  await page.locator('.l-edit-row', { hasText: 'Музыка' }).locator('.l-hide-back').click();
  await page.keyboard.press('Escape');
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('.l-d-app', { hasText: 'Музыка' })).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('кошелёк: новый — пустой; пример из прежних версий удаляется одним касанием, свои записи остаются', async ({ page, errors }) => {
  await open(page);
  await page.keyboard.press('ArrowLeft');
  const w = page.frameLocator('iframe.l-money:not(.l-notes)');
  await expect(w.locator('.cats.grid .cat').first()).toBeVisible();
  await expect(w.locator('.demo')).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('elachiston.money.draft')).recs.length)).toBe(0);
  // как было у прежних версий: записи примера — id с номером в хвосте; своя — без
  await page.evaluate(() => {
    const t = Date.now();
    const base = t.toString(36) + 'abcd';
    localStorage.setItem('elachiston.money.draft', JSON.stringify({ budget: 4000000, recs: [
      { id: base + '0', t, k: 'e', c: 'food', a: 25000, n: '' }, { id: base + '17', t, k: 'i', c: 'salary', a: 4200000, n: '' },
      { id: t.toString(36) + 'wxyz', t, k: 'e', c: 'cig', a: 34000, n: 'своя' }] }));
  });
  await page.evaluate(() => window.__launcherBack());
  await page.reload(); await page.waitForSelector('.l-home .clock');
  await page.keyboard.press('ArrowLeft');
  await w.locator('.demo button').click();
  await expect(w.locator('.demo')).toHaveCount(0);
  const db = await page.evaluate(() => JSON.parse(localStorage.getItem('elachiston.money.draft')));
  expect(db.recs.map((r) => r.n)).toEqual(['своя']);
  expect(db.budget).toBe(0);
  expect(errors).toEqual([]);
});

test('переименовать приложение: новое название везде, поиск — и по старому; пустое — снова системное', async ({ page, errors }) => {
  await open(page);
  await page.keyboard.press('ArrowUp');
  const box = await page.locator('.l-d-app', { hasText: 'Карты' }).boundingBox();
  await page.mouse.move(box.x + 30, box.y + box.height / 2); await page.mouse.down(); await page.waitForTimeout(700); await page.mouse.up();
  await page.locator('.l-sheet .l-field input').fill('Дорога');
  await page.keyboard.press('Escape');
  await expect(page.locator('.l-d-app', { hasText: 'Дорога' })).toHaveCount(1);
  await page.locator('.l-drawer .l-search').fill('карт');
  await expect(page.locator('.l-d-app', { hasText: 'Дорога' })).toHaveCount(1); // по системному названию тоже
  await page.keyboard.press('Escape');
  await expect(page.locator('.l-app .label', { hasText: 'Дорога' })).toHaveCount(1); // и на главном
  // пустое — снова «Карты»; правка — касанием приложения в правке главного
  const c = await page.locator('[data-blk="clock"]').boundingBox();
  await hold(page, c.x + c.width / 2, c.y + c.height / 2);
  await page.locator('.l-app', { hasText: 'Дорога' }).click();
  await page.locator('.l-sheet .l-field input').fill('');
  await page.keyboard.press('Escape');
  await page.locator('.l-arr-done').click();
  await expect(page.locator('.l-app .label', { hasText: 'Карты' })).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('старые настройки: украшения убраны, приложения на месте', async ({ page, errors }) => {
  await page.goto(PAGE);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('elachiston.prefs', JSON.stringify({ intro: true, lang: 'ru', clock: 'codex', wallpaper: 'sun', ornament: 'wheel', theme: 'paper', style: 'rich' })); });
  await page.reload();
  await page.waitForSelector('.l-home .clock');
  await expect(page.locator('.l-intro, .l-wallpaper, .l-ornament')).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('elachiston.prefs')).v)).toBe(2);
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
  await page.waitForTimeout(400); // панель уехала
  await page.mouse.click(200, 420); // касание пустого места — фокус точно у главного экрана (клавиши — ему)
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

test('настройки: смахнуть вбок — соседняя вкладка; потянуть вниз — закрываются', async ({ page, errors }) => {
  await open(page);
  await hold(page);
  await expect(page.locator('.l-set-tabs button.on')).toHaveText('Вид');
  const body = await page.locator('.l-sheet-body').boundingBox();
  await page.mouse.move(body.x + 300, body.y + 200); await page.mouse.down();
  await page.mouse.move(body.x + 220, body.y + 202, { steps: 4 }); await page.mouse.move(body.x + 60, body.y + 204, { steps: 6 });
  await page.mouse.up();
  await expect(page.locator('.l-set-tabs button.on')).toHaveText('Главный');
  // потянуть вниз с любого места (содержимое в начале) — шторка уходит
  await page.mouse.move(body.x + 150, body.y + 120); await page.mouse.down();
  await page.mouse.move(body.x + 150, body.y + 180, { steps: 4 }); await page.mouse.move(body.x + 150, body.y + 520, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('.l-sheet-wrap')).toHaveCount(0);
  expect(errors).toEqual([]);
});
