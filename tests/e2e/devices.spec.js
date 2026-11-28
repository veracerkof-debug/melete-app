// Экран «Устройства» (screens/devices.js, слово автора 28.11.2026): список «Мои устройства», шторка устройства, мастер
// «Подключить устройство», «Другие способы». В браузере сети нет: сопряжённые устройства подставляются в melete.sync,
// окно Windows — подменой Tauri (как в desk.spec.js).
import { test, expect } from './melete.js';

const fakeTauri = (page) => page.addInitScript(() => {
  let cb = 0;
  const st = { on: false, port: 53319, ips: ['192.168.1.23'], name: 'PC' };
  window.__TAURI_INTERNALS__ = {
    transformCallback: () => ++cb, unregisterCallback: () => {}, convertFileSrc: (p) => p,
    metadata: { currentWindow: { label: 'main' }, currentWebview: { windowLabel: 'main', label: 'main' } },
    invoke: async (cmd) => {
      if (cmd === 'sync_start') { st.on = true; return st; }
      if (cmd === 'sync_status') return st;
      if (cmd === 'sync_stop') { st.on = false; return null; }
      if (cmd === 'guest_status') return { on: false, ips: st.ips, name: 'PC', port: 53320 };
      if (cmd === 'localsend_status') return { on: false, ips: st.ips, alias: 'Melete · PC' };
      if (cmd === 'startup_files') return [];
      return null;
    },
  };
});

const seed = (page) => page.addInitScript(() => {
  if (localStorage.getItem('melete.sync')) return;
  localStorage.setItem('melete.sync', JSON.stringify({
    pc: { addr: 'https://192.168.1.114:53329', key: 'k1', name: 'Студия', v: 3, fp: 'ab'.repeat(32), last: Date.now() - 5 * 60000 },
    devs: { 'https://192.168.1.126:53329': { addr: 'https://192.168.1.126:53329', key: 'k2', name: 'Pixel брата', phone: true, last: 0, ids: [], mode: { rc: true, sync: false } } },
  }));
});

const openPage = async (page, melete) => {
  await melete.click('[data-act="panel"]'); await page.waitForTimeout(500);
  await melete.click('[data-pp="link"], .pdnav [data-pp="link"]'); await page.waitForTimeout(500);
};

test('устройства: пустой список и вход в мастер (окно компьютера)', async ({ page, melete, errors }) => {
  await fakeTauri(page);
  await melete.open();
  await openPage(page, melete);
  const pg = page.locator('.panel .dvpage');
  await expect(pg.locator('.dvempty')).toBeVisible();
  await expect(pg.locator('.dvadd')).toBeVisible();
  await page.screenshot({ path: 'test-results/devices-empty.png' });
  // «Принимать подключения» — переключатель на странице; «Другие способы» — строки
  await expect(pg.locator('[data-psw="syncSrv"]')).toHaveCount(1);
  await expect(pg.locator('[data-act="ens"]')).toHaveCount(1);
  // мастер: у компьютера один тип — телефон; роль: показать код или подключиться (DEV)
  await pg.locator('.dvadd').click(); await page.waitForTimeout(500);
  const sh = page.locator('#sheetLayer .sheet');
  await expect(sh.locator('.dvtile')).toHaveCount(2);
  await sh.locator('[data-dvw="role"][data-v="show"]').click(); await page.waitForTimeout(600);
  await expect(sh.locator('.sypair')).toContainText('192.168.1.23');
  await expect(sh.locator('.dvwait')).toBeVisible();
  await page.screenshot({ path: 'test-results/devices-wizard-show.png' });
  // назад к роли и к шагу «подключиться»: поля адреса и кода
  await sh.locator('[data-dvw="back"]').click(); await page.waitForTimeout(300);
  await sh.locator('[data-dvw="role"][data-v="join"]').click(); await page.waitForTimeout(300);
  await expect(sh.locator('[data-dvin="addr"]')).toBeVisible();
  await expect(sh.locator('[data-dvin="code"]')).toBeVisible();
  await sh.locator('[data-dvin="addr"]').fill('192.168.1.99');
  await sh.locator('[data-dvin="code"]').fill('123456');
  // ввод не сбрасывается перерисовкой
  await page.waitForTimeout(400);
  await expect(sh.locator('[data-dvin="addr"]')).toHaveValue('192.168.1.99');
  void errors;
});

test('устройства: карточки, шторка устройства, режимы и «Забыть» (телефон)', async ({ page, melete, errors }) => {
  await seed(page);
  await melete.open();
  await openPage(page, melete);
  const cards = page.locator('.panel .dvcard');
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0)).toContainText('Студия');
  await expect(cards.nth(0)).toContainText('на связи');
  await expect(cards.nth(1)).toContainText('Pixel брата');
  await expect(cards.nth(1)).toContainText('ещё не обменивались');
  // у второго включён только «Пульт»: кнопка «Звук / пульт» есть, «Синхронизировать» нет
  await expect(cards.nth(1).locator('[data-dv="rc"]')).toHaveCount(1);
  await expect(cards.nth(1).locator('[data-dv="sync"]')).toHaveCount(0);
  await expect(cards.nth(0).locator('[data-dv="sync"]')).toHaveCount(1);
  // цели касания — не меньше 40 px
  for (const sel of ['.dvhead', '.dvbtn']) { const b = await cards.nth(0).locator(sel).first().boundingBox(); expect(b.height).toBeGreaterThanOrEqual(40); }
  await page.screenshot({ path: 'test-results/devices-list.png' });
  // шторка устройства: два переключателя, проверка связи, адрес, «Забыть»
  await cards.nth(1).locator('[data-dv="open"]').click(); await page.waitForTimeout(500);
  const sh = page.locator('#sheetLayer .sheet');
  await expect(sh.locator('[data-dvlm]')).toHaveCount(2);
  await expect(sh.locator('[data-dvs="check"]')).toBeVisible();
  await expect(sh).toContainText('192.168.1.126');
  await page.screenshot({ path: 'test-results/devices-sheet.png' });
  // включить «Синхронизацию» — на карточке появится кнопка
  await sh.locator('[data-dvlm="sync"]').evaluate((el) => el.click()); await page.waitForTimeout(300);
  await page.locator('#sheetLayer [data-close]').first().click(); await page.waitForTimeout(500);
  await expect(cards.nth(1).locator('[data-dv="sync"]')).toHaveCount(1);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('melete.sync')).devs['https://192.168.1.126:53329'].mode)).toEqual({ rc: true, sync: true });
  // «Забыть» с подтверждением
  await cards.nth(1).locator('[data-dv="open"]').click(); await page.waitForTimeout(500);
  await page.locator('#sheetLayer [data-dvs="forget"]').click(); await page.waitForTimeout(400);
  await page.locator('.ask [data-k="yes"]').click(); await page.waitForTimeout(500);
  await expect(page.locator('.panel .dvcard')).toHaveCount(1);
  expect(await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('melete.sync')).devs || {}).length)).toBe(0);
  void errors;
});

// без `errors`: попытка достучаться до адреса из браузера упирается в CSP — это и есть «не отвечает», шум консоли здесь ожидаем
test('устройства: не отвечает — подсказка и «Найти заново»; «Проверить связь» не падает без сети', async ({ page, melete }) => {
  await seed(page);
  await melete.open();
  await openPage(page, melete);
  // проверка связи в браузере не достучится до адреса — устройство помечается «не отвечает», и объясняется почему
  await page.locator('.panel .dvcard').first().locator('[data-dv="open"]').click(); await page.waitForTimeout(500);
  await page.locator('#sheetLayer [data-dvs="check"]').click();
  await page.waitForSelector('#sheetLayer .dvhint', { timeout: 15000 });
  await page.locator('#sheetLayer [data-close]').first().click(); await page.waitForTimeout(500);
  const first = page.locator('.panel .dvcard').first();
  await expect(first).toContainText('не отвечает');
  await expect(first.locator('.dvhint')).toContainText('Wi-Fi');
  await expect(first.locator('.dvhint [data-dv="sync"]')).toHaveCount(1); // «Найти заново» — синхронизация сама ищет компьютер в сети
});

test('устройства: компьютер на широком экране', async ({ page, melete, errors }) => {
  await fakeTauri(page);
  await seed(page);
  await page.setViewportSize({ width: 1536, height: 790 });
  await melete.open();
  await melete.click('[data-act="panel"]'); await page.waitForTimeout(500);
  await melete.click('.pdnav [data-pp="link"]'); await page.waitForTimeout(500);
  await expect(page.locator('.pdpage .dvcard')).toHaveCount(2);
  await page.screenshot({ path: 'test-results/devices-desk.png' });
  void errors;
});
