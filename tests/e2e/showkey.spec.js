// Пульт звукаря: жест по клавише фона выбирает созвучие (влево мажор, вправо минор, вверх sus, вниз ♭6); записи в пульте нет
import { test, expect } from './melete.js';

test('пульт: жест по клавише фона — минор/мажор/sus; кнопки записи нет', async ({ page, melete, errors }) => {
  await page.setViewportSize({ width: 455, height: 990 });
  await melete.open();
  await melete.openTool('audio'); await page.click('[data-x="ashow"]');
  await page.waitForSelector('.tview .shw', { timeout: 15_000 });
  await expect(page.locator('.tview .tvrec, .tview .tvrecf')).toHaveCount(0); // запись в пульте не нужна
  await page.click('.tview [data-page="pads"]'); await page.waitForTimeout(500);
  const swipe = async (pc, dx, dy) => {
    const b = await page.locator('.shdk[data-tonic="' + pc + '"]').boundingBox(), x = b.x + b.width / 2, y = b.y + b.height / 2;
    await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + dx, y + dy, { steps: 5 }); await page.mouse.up(); await page.waitForTimeout(350);
  };
  const label = (pc) => page.locator('.shdk[data-tonic="' + pc + '"]');
  await swipe(4, 60, 0); await expect(label(4)).toHaveText('Em');
  await swipe(4, -60, 0); await expect(label(4)).toHaveText('E');
  await swipe(9, 0, -60); await expect(label(9)).toHaveText('Asus');
  await swipe(9, 0, 60); await expect(label(9)).toHaveText('A♭6');
  // касание — только выбор тональности, созвучие остаётся
  await label(9).click(); await expect(label(9)).toHaveText('A♭6');
  expect(errors).toEqual([]);
});
