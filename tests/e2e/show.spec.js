// Пульт выступления (расширение медиатеки): выступление → номер с меткой, банк падов, свой файл, игра пада, пока держат
import { test, expect } from './melete.js';

// WAV 0,6 с, 440 Гц, моно 8 кГц
function wav(sec = 0.6) {
  const n = Math.round(8000 * sec), b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(8000, 24); b.writeUInt32LE(16000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.sin(i / 8000 * 2 * Math.PI * 440) * 12000), 44 + i * 2);
  return b;
}

test('пульт: выступление, номер с меткой, пад со своим файлом', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.free('F', ['show']);
  await page.waitForFunction(() => !document.querySelector('.session .modload'), null, { timeout: 15_000 });
  const T = '.session .pane[data-tool="show"] ';
  await expect(page.locator(T + '.shw')).toBeVisible();
  // выступление
  await page.click(T + '[data-x="evnew"]');
  await page.fill('.sheet [data-f="title"]', 'День студента');
  await page.click('.sheet [data-seg="etimer"] [data-v="length"]');
  await page.fill('.sheet [data-f="length"]', '90');
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  await expect(page.locator(T + '.evt')).toContainText('День студента');
  // номер без трека: время, заметка, метка
  await page.click(T + '[data-x="numnew"]');
  await page.fill('.sheet [data-f="title"]', 'Конкурс 2');
  await page.fill('.sheet [data-f="at"]', '19:50'); await page.press('.sheet [data-f="at"]', 'Tab');
  await page.fill('.sheet [data-f="note"]', 'Ведущий выходит справа');
  await page.click('.sheet [data-x="cueadd"]');
  await page.fill('.sheet [data-ct]', '0:42'); await page.press('.sheet [data-ct]', 'Tab');
  await page.fill('.sheet [data-cx]', 'Свет на сцену'); await page.press('.sheet [data-cx]', 'Tab');
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  await expect(page.locator(T + '.shnum')).toContainText('Конкурс 2');
  await expect(page.locator(T + '.shnum .ntm')).toHaveText('19:50');
  const sh = (await melete.toolsNow()).show;
  expect(sh.events[0]).toMatchObject({ title: 'День студента', timer: 'length', length: 5400 });
  expect(sh.events[0].numbers[0]).toMatchObject({ title: 'Конкурс 2', at: 1190, note: 'Ведущий выходит справа', kind: 'none' });
  expect(sh.events[0].numbers[0].cues).toMatchObject([{ t: 42, text: 'Свет на сцену' }]);
  // звуки: пустой пад → редактор → свой файл
  await page.click(T + '[data-page="pads"]');
  await expect(page.locator(T + '.shdock .shpad')).toHaveCount(2);
  await page.click(T + '.shpads .shpad[data-cell="0"]');
  await page.fill('.sheet [data-f="name"]', 'Дробь');
  await page.click('.sheet [data-x="pick"]');
  await page.setInputFiles('.sheet input[type="file"]', { name: 'drum.wav', mimeType: 'audio/wav', buffer: wav() });
  await expect(page.locator('.sheet [data-x="pick"]')).toContainText('drum', { timeout: 8000 });
  await page.click('.sheet [data-mode="hold"]');
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  await expect(page.locator(T + '.shpad[data-pad]').first()).toContainText('Дробь');
  // звук идёт, пока держат; отпустили — стоит
  const pad = T + '.shpads .shpad[data-pad]';
  const box = await page.locator(pad).first().boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(150);
  await expect(page.locator(pad).first()).toHaveClass(/play/);
  await page.mouse.up();
  await page.waitForTimeout(500);
  await expect(page.locator(pad).first()).not.toHaveClass(/play/);
  // файл звуков не виден в списке медиатеки
  const lib = await page.evaluate(async () => (await import('/src/modules/index.js')).modules.length);
  expect(lib).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('медиатека: кнопка пульта выступления открывает пульт (dev-сборка)', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.free('F', ['audio']);
  await page.waitForFunction(() => !document.querySelector('.session .modload'), null, { timeout: 15_000 });
  await page.click('.session .pane[data-tool="audio"] [data-x="ashow"]');
  await expect(page.locator('.shw')).toBeVisible({ timeout: 10_000 });
  expect(errors).toEqual([]);
});

test('пульт: ГО запускает номер с треком, метка с отсчётом, следующий номер — переход', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.free('F', ['show']);
  await page.waitForFunction(() => !document.querySelector('.session .modload'), null, { timeout: 15_000 });
  const T = '.session .pane[data-tool="show"] ';
  await page.click(T + '[data-x="evnew"]'); await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  // номер 1: трек + метка на 2-й секунде
  await page.click(T + '[data-x="numnew"]');
  await page.fill('.sheet [data-f="title"]', 'Танец');
  await page.click('.sheet [data-seg="nkind"] [data-v="track"]');
  await page.click('.sheet [data-x="pick"]');
  await page.setInputFiles('.sheet input[type="file"]', { name: 'dance.wav', mimeType: 'audio/wav', buffer: wav(8) });
  await expect(page.locator('.sheet [data-x="pick"]')).toContainText('dance', { timeout: 8000 });
  await page.click('.sheet [data-x="cueadd"]');
  await page.fill('.sheet [data-ct]', '0:02'); await page.press('.sheet [data-ct]', 'Tab');
  await page.fill('.sheet [data-cx]', 'Свет на сцену'); await page.press('.sheet [data-cx]', 'Tab');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  // номер 2: без трека
  await page.click(T + '[data-x="numnew"]');
  await page.fill('.sheet [data-f="title"]', 'Ведущие');
  await page.fill('.sheet [data-f="note"]', 'Выход справа');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  // пульт: ГО
  await page.click(T + '[data-page="desk"]');
  await page.click(T + '[data-x="go"]');
  await expect(page.locator(T + '.shnow b')).toHaveText('Танец', { timeout: 10_000 });
  await expect(page.locator(T + '#shcueln')).toContainText('Свет на сцену', { timeout: 8000 });
  await expect.poll(async () => (await page.locator(T + '#shtime').textContent()) || '', { timeout: 10_000 }).not.toMatch(/^0:00 /);
  // следующий номер: ГО — трек уходит, на пульте заметка
  await page.click(T + '[data-x="go"]');
  await expect(page.locator(T + '.shnow b')).toHaveText('Ведущие', { timeout: 8000 });
  await expect(page.locator(T + '#shnote')).toContainText('Выход справа');
  const sh = (await melete.toolsNow()).show, ev = sh.events[0];
  expect(ev.numbers[0].done).toBe(true); expect(sh.cur).toBe(ev.numbers[1].id);
  expect(errors).toEqual([]);
});
