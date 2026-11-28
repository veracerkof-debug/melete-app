// Компьютер: поиск Ctrl K, разделы Ctrl 1–9, клавиши инструментов и Пробел на главной (screens/palette.js)
import { test, expect } from './melete.js';

test.use({ viewport: { width: 1440, height: 900 }, hasTouch: false });

test('компьютер: Ctrl K — поиск песни и инструмента; Ctrl 3 — «Песни»; M — метроном; полоса «темп к цели»', async ({ page, melete, errors }) => {
  await melete.open({ settings: { home: { off: [] }, profile: { level: 'amateur' } }, songs: [{ id: 's1', title: 'Autumn Leaves', artist: 'Cannonball', key: 'Gm', notes: '', targetBpm: 120, currentBpm: 96, createdAt: 1, updatedAt: 1 }, { id: 's2', title: 'Blue Bossa', artist: 'Dorham', key: 'Cm', notes: '', targetBpm: 140, currentBpm: 84, createdAt: 1, updatedAt: 1 }] });
  await page.waitForTimeout(1500);
  // «Сегодня» — центр управления (deskhome.js); прежняя главная — по кнопке внизу; там полоса «сейчас → цель» у песни
  await expect(page.locator('.dday')).toBeVisible();
  await page.click('[data-act="deskclassic"]'); await page.waitForTimeout(400);
  await expect(page.locator('.hpg').first()).toContainText('96 → 120');
  await page.click('[data-act="deskclassic"]'); await page.waitForTimeout(400);
  // кнопка поиска в верхней полосе
  await expect(page.locator('.dfind')).toBeVisible();
  await page.keyboard.press('Control+k'); await page.waitForTimeout(250);
  await expect(page.locator('.kpal input')).toBeFocused();
  await page.keyboard.type('blue'); await page.waitForTimeout(200);
  await expect(page.locator('.pli').first()).toContainText('Blue Bossa');
  await page.keyboard.press('Enter'); await page.waitForTimeout(600);
  await expect(page.locator('.kpal')).toHaveCount(0);
  await expect(page.locator('#main')).toContainText('Blue Bossa'); // страница песни
  // инструмент через поиск
  await page.keyboard.press('Control+k'); await page.keyboard.type('тюнер'); await page.waitForTimeout(200);
  await expect(page.locator('.pli').first()).toContainText('Тюнер');
  await page.keyboard.press('Escape'); await expect(page.locator('.kpal')).toHaveCount(0);
  // разделы по номерам верхней полосы: Сегодня, Служение (календарь), Песни…
  await page.keyboard.press('Control+1'); await page.waitForTimeout(400);
  await expect(page.locator('.dtab[data-dt="today"]')).toHaveAttribute('aria-current', 'page');
  await page.keyboard.press('Control+3'); await page.waitForTimeout(400);
  await expect(page.locator('.dtab[data-dt="songs"]')).toHaveAttribute('aria-current', 'page');
  // буква инструмента — открыть его
  await page.keyboard.press('m'); await page.waitForTimeout(900);
  await expect(page.locator('.tview')).toHaveCount(1);
  // в поле ввода буквы не срабатывают
  expect(errors).toEqual([]);
});

test('компьютер: Пробел на главной — «Свободная практика»; в поле ввода — нет', async ({ page, melete, errors }) => {
  await melete.open({ settings: { home: { off: [] }, profile: { level: 'amateur' } } });
  await page.waitForTimeout(600);
  await page.keyboard.press('Control+k'); await page.keyboard.type('m ');
  await expect(page.locator('.session')).toHaveCount(0); // пробел в поиске — просто пробел
  await page.keyboard.press('Escape');
  await page.locator('body').click({ position: { x: 700, y: 820 } }); // пустое место «Сегодня»
  await page.keyboard.press(' '); await page.waitForTimeout(1200);
  await expect(page.locator('.session')).toHaveCount(1);
  expect(errors).toEqual([]);
});
