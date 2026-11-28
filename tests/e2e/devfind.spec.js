// Автопоиск устройств (screens/devfind.js, src/core/discover.js): блок «Рядом» на экране «Устройства» и в мастере.
// Сети в браузере нет: найденные устройства подставляются через window.__MELETE_DISCOVER__, окно Windows — подменой Tauri.
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
  }));
});
const found = (page, list) => page.addInitScript((l) => { window.__MELETE_DISCOVER__ = l; }, list);
const openPage = async (page, melete) => {
  await melete.click('[data-act="panel"]'); await page.waitForTimeout(500);
  await melete.click('[data-pp="link"], .pdnav [data-pp="link"]'); await page.waitForTimeout(500);
};

test('автопоиск: «Рядом» — найденные, сопряжённое без кнопки, выбор → только код', async ({ page, melete }) => {
  await fakeTauri(page); await seed(page);
  await found(page, [
    { name: 'Гитара', type: 'phone', addr: '192.168.1.77', port: 53329, id: 'c0ffee11' },
    { name: 'Студия', type: 'desktop', addr: '192.168.1.114', port: 53329, id: 'abababab' },
    { name: 'Чужой', type: 'desktop', addr: '8.8.8.8', port: 53329, id: 'x' },
  ]);
  await page.setViewportSize({ width: 1536, height: 790 });
  await melete.open();
  await openPage(page, melete);
  const near = page.locator('.pdpage .dvnear');
  await expect(near).toHaveCount(1);
  // до нажатия сеть не трогается: списка нет
  await expect(near.locator('.dvnrow')).toHaveCount(0);
  await near.locator('[data-dv="nfind"]').click();
  await expect(near.locator('.dvnrow')).toHaveCount(2); // чужой (внешний адрес) отброшен
  await expect(near.locator('.dvnrow.paired')).toContainText('Студия');
  await expect(near.locator('.dvnrow.paired')).toContainText('Уже подключено');
  await expect(near.locator('.dvnrow.paired [data-dv="npick"]')).toHaveCount(0);
  const pick = near.locator('button[data-dv="npick"]');
  await expect(pick).toHaveCount(1);
  expect((await pick.boundingBox()).height).toBeGreaterThanOrEqual(40);
  await page.screenshot({ path: 'test-results/devfind-list.png' });
  // выбор → мастер: адрес подставлен, ни ввода адреса, ни QR, только код
  await pick.click(); await page.waitForTimeout(500);
  const sh = page.locator('#sheetLayer .sheet');
  await expect(sh).toContainText('Гитара');
  await expect(sh).toContainText('192.168.1.77');
  await expect(sh.locator('[data-dvin="addr"]')).toHaveCount(0);
  await expect(sh.locator('[data-dvw="scan"]')).toHaveCount(0);
  await expect(sh.locator('[data-dvin="code"]')).toBeVisible();
  await page.screenshot({ path: 'test-results/devfind-pick.png' });
  // «Другой способ» — обычные поля адреса и кода
  await sh.locator('[data-dvw="unpick"]').click(); await page.waitForTimeout(300);
  await expect(sh.locator('[data-dvin="addr"]')).toBeVisible();
  await expect(sh.locator('.dvnear')).toHaveCount(1);
});

test('автопоиск: ничего не найдено — подсказка; мастер ищет при входе на шаг «подключиться»', async ({ page, melete }) => {
  await fakeTauri(page);
  await found(page, []);
  await melete.open();
  await openPage(page, melete);
  const pg = page.locator('.panel .dvpage');
  await pg.locator('.dvadd').click(); await page.waitForTimeout(500);
  const sh = page.locator('#sheetLayer .sheet');
  await sh.locator('[data-dvw="role"][data-v="join"]').click();
  await expect(sh.locator('.dvnearst')).toContainText('Ничего не найдено');
  await expect(sh.locator('.dvnfind')).toContainText('Искать снова');
  await expect(sh.locator('[data-dvin="addr"]')).toBeVisible(); // ручной ввод остаётся
});
