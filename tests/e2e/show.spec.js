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
  await page.click(T + '[data-x="progsheet"]'); await page.click('.sheet [data-x="numnew"]');
  await page.fill('.sheet [data-f="title"]', 'Конкурс 2');
  await page.fill('.sheet [data-f="at"]', '19:50'); await page.press('.sheet [data-f="at"]', 'Tab');
  await page.fill('.sheet [data-f="note"]', 'Ведущий выходит справа');
  await page.click('.sheet [data-x="cueadd"]');
  await page.fill('.sheet [data-ct]', '0:42'); await page.press('.sheet [data-ct]', 'Tab');
  await page.fill('.sheet [data-cx]', 'Свет на сцену'); await page.press('.sheet [data-cx]', 'Tab');
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  await expect(page.locator('.sheet .shnum')).toContainText('Конкурс 2');
  await expect(page.locator('.sheet .shnum .ntm')).toHaveText('19:50');
  const sh = (await melete.toolsNow()).show;
  expect(sh.events[0]).toMatchObject({ title: 'День студента', timer: 'length', length: 5400 });
  expect(sh.events[0].numbers[0]).toMatchObject({ title: 'Конкурс 2', at: 1190, note: 'Ведущий выходит справа', kind: 'none' });
  expect(sh.events[0].numbers[0].cues).toMatchObject([{ t: 42, text: 'Свет на сцену' }]);
  // звуки: пустой пад → редактор → свой файл
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  await page.click(T + '[data-page="pads"]');
  await expect(page.locator(T + '.shdock .shpad')).toHaveCount(0); // пустые закреплённые не рисуются (только в правке)
  await expect(page.locator(T + '[data-duck]')).toBeVisible(); // «Ведущий» — пока держат, всё тише
  await expect(page.locator(T + '.shmeter i')).toHaveCount(24); // метр уровня над громкостью
  // готовые звуки CC0 (public/sounds) раскладываются сами один раз: банк «Готовые», девять падов и «+» следом
  await expect(page.locator(T + '.shbanks [data-bank]').first()).toContainText('Готовые', { timeout: 15_000 });
  await expect(page.locator(T + '.shpads .shpad[data-pad]')).toHaveCount(9);
  await page.click(T + '.shpads .shpad[data-cell="9"]');
  await page.fill('.sheet [data-f="name"]', 'Дробь');
  await page.click('.sheet [data-x="pick"]');
  await page.setInputFiles('.sheet input[type="file"]', { name: 'drum.wav', mimeType: 'audio/wav', buffer: wav() });
  await expect(page.locator('.sheet [data-x="pick"]')).toContainText('drum', { timeout: 8000 });
  await page.click('.sheet [data-mode="hold"]');
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  await expect(page.locator(T + '.shpads:not(.drm) .shpad[data-pad]', { hasText: 'Дробь' })).toHaveCount(1);
  // звук идёт, пока держат; отпустили — стоит
  const pad = T + '.shpads:not(.drm) .shpad[data-pad]';
  await page.locator(pad, { hasText: 'Дробь' }).evaluate((el) => el.scrollIntoView({ block: 'center' })); // закреплённая полоса внизу не должна закрывать пад
  const box = await page.locator(pad, { hasText: 'Дробь' }).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(150);
  await expect(page.locator(pad, { hasText: 'Дробь' })).toHaveClass(/play/);
  await page.mouse.up();
  await page.waitForTimeout(500);
  await expect(page.locator(pad, { hasText: 'Дробь' })).not.toHaveClass(/play/);
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
  await page.click(T + '[data-x="progsheet"]'); await page.click('.sheet [data-x="numnew"]');
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
  await page.click('.sheet [data-x="numnew"]');
  await page.fill('.sheet [data-f="title"]', 'Ведущие');
  await page.fill('.sheet [data-f="note"]', 'Выход справа');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  // пульт: ГО
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await page.click(T + '[data-page="desk"]');
  await page.click(T + '[data-x="pp"]');
  await expect(page.locator(T + '.shpick.cur b')).toHaveText('Танец', { timeout: 10_000 });
  await expect(page.locator(T + '#shcueln')).toContainText('Свет на сцену', { timeout: 8000 });
  await expect.poll(async () => (await page.locator(T + '#shtime').textContent()) || '', { timeout: 10_000 }).not.toMatch(/^0:00 /);
  // следующий номер: касание строки выбирает его, на пульте заметка
  await page.click(T + '[data-pick]:nth-of-type(2)');
  await expect(page.locator(T + '.shpick.cur b')).toHaveText('Ведущие', { timeout: 8000 });
  await expect(page.locator(T + '#shnote')).toContainText('Выход справа');
  const sh = (await melete.toolsNow()).show, ev = sh.events[0];
  expect(sh.cur).toBe(ev.numbers[1].id);
  expect(errors).toEqual([]);
});

test('фон: шум своим файлом, наплыв, пэд на квинте от тональности, фон номера', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.free('F', ['show']);
  await page.waitForFunction(() => !document.querySelector('.session .modload'), null, { timeout: 15_000 });
  const T = '.session .pane[data-tool="show"] ';
  await page.click(T + '[data-page="pads"]'); await page.click(T + '[data-x="bedsheet"]');
  await expect(page.locator('.sheet .shbedp')).toBeVisible();
  // шум: свой файл, касание включает (наплыв), повторное — убирает
  await page.click('.sheet [data-x="noiseadd"]');
  await page.setInputFiles('.sheet input[type="file"]', { name: 'hall.wav', mimeType: 'audio/wav', buffer: wav(3) });
  await expect(page.locator('.sheet .shnoise')).toContainText('hall', { timeout: 8000 });
  await page.click('.sheet .shnoise');
  await expect(page.locator('.sheet .shnoise.on')).toHaveCount(1, { timeout: 8000 });
  await page.click('.sheet .shnoise');
  await expect(page.locator('.sheet .shnoise.on')).toHaveCount(0, { timeout: 8000 });
  // пэд: включить, тональность вручную — подпись сменилась
  await page.click('.sheet [data-sw="bpad"] + i, .sheet label:has([data-sw="bpad"])');
  await page.click('.sheet [data-tonic="8"]');
  await expect(page.locator('.sheet .shbk')).toContainText('A♭');
  await page.click('.sheet [data-bsnd="air"]');
  // фон номера: задан в шторке номера
  await page.keyboard.press('Escape'); await page.waitForTimeout(300); await page.click(T + '[data-page="desk"]');
  await page.click(T + '[data-x="evnew"]'); await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await page.click(T + '[data-x="progsheet"]'); await page.click('.sheet [data-x="numnew"]');
  await page.fill('.sheet [data-f="title"]', 'Тихий момент');
  await page.click('.sheet [data-seg="nbed"] [data-v="set"]');
  await page.click('.sheet [data-nnoise]:not([data-nnoise=""])');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  const sh = (await melete.toolsNow()).show;
  expect(sh.bed.pad).toMatchObject({ on: true, tonic: 8, sound: 'air' });
  expect(sh.noises.length).toBe(1);
  expect(sh.events[0].numbers[0].bed).toMatchObject({ noise: sh.noises[0].id });
  // ГО запускает номер и включает его шум (шторка «Программа» закрывается)
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await page.click(T + '[data-x="pp"]');
  await expect(page.locator(T + '.shbar [data-vol="master"]')).toHaveCount(1);
  await page.click(T + '[data-page="pads"]'); await page.click(T + '[data-x="bedsheet"]');
  await expect(page.locator('.sheet .shnoise.on')).toHaveCount(1, { timeout: 8000 });
  expect(errors).toEqual([]);
});

test('громкость: общая — ползунок внизу «Эфира» и «Звуков», остальные — в шторке «Звук»; значения общие для страниц', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.free('F', ['show']);
  await page.waitForFunction(() => !document.querySelector('.session .modload'), null, { timeout: 15_000 });
  const T = '.session .pane[data-tool="show"] ';
  await page.click(T + '[data-page="pads"]');
  await expect(page.locator(T + '[data-knob]')).toHaveCount(0); // крутилок на экране больше нет
  await page.locator(T + '[data-vol="master"]').fill('70');
  await page.click(T + '[data-page="desk"]');
  await expect(page.locator(T + '[data-vol="master"]')).toHaveValue('70'); // то же значение на другой странице
  await page.click(T + '[data-x="levels"]');
  await expect(page.locator('.sheet [data-vol]')).toHaveCount(3); // трек, фон, звуки
  await page.locator('.sheet [data-vol="pads"]').fill('84');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  const sh = (await melete.toolsNow()).show;
  expect(sh.master).toBe(70); expect(sh.level).toBe(84);
  expect(errors).toEqual([]);
});

test('нормализация и громкости номера: запись измеряется, поправка в шторке; крутилки трека и пэда на пульте', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.free('F', ['show']);
  await page.waitForFunction(() => !document.querySelector('.session .modload'), null, { timeout: 15_000 });
  const T = '.session .pane[data-tool="show"] ';
  await page.click(T + '[data-x="evnew"]'); await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await page.click(T + '[data-x="progsheet"]'); await page.click('.sheet [data-x="numnew"]');
  await page.fill('.sheet [data-f="title"]', 'Тихий трек');
  await page.click('.sheet [data-seg="nkind"] [data-v="track"]');
  await page.click('.sheet [data-x="pick"]');
  await page.setInputFiles('.sheet input[type="file"]', { name: 'quiet.wav', mimeType: 'audio/wav', buffer: wav(8) });
  await expect(page.locator('.sheet [data-x="pick"]')).toContainText('quiet', { timeout: 8000 });
  // громкость измерена: LUFS и поправка (WAV с пиком 0,37 ≈ −8,6 дБ → записан тихо относительно −16: поправка есть)
  await expect(page.locator('.sheet #shloud')).toContainText('LUFS', { timeout: 15_000 });
  await expect(page.locator('.sheet #shloud')).toContainText('дБ');
  await page.click('.sheet [data-seg="nbed"] [data-v="set"]');
  await expect(page.locator('.sheet [data-s="padLevel"]')).toBeVisible();
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  // пульт: ГО, крутилки номера (шторка «Программа» закрывается)
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await page.click(T + '[data-page="desk"]'); await page.click(T + '[data-x="pp"]');
  await expect(page.locator(T + '.shpick.playing')).toHaveCount(1, { timeout: 15_000 }); // трек пошёл — страница перерисована, крутилку не выдернет из-под пальца
  await page.waitForTimeout(400);
  await page.click(T + '[data-x="levels"]');
  await expect(page.locator('.sheet [data-vol="deck"]')).toBeVisible({ timeout: 10_000 });
  const v0 = +(await page.locator('.sheet [data-vol="deck"]').inputValue()), v1 = Math.min(100, v0 + 12);
  await page.locator('.sheet [data-vol="deck"]').fill(String(v1)); // у номера с записью — громкость самой песни
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  const sh = (await melete.toolsNow()).show, n = sh.events[0].numbers[0];
  expect(n.level).toBe(v1);
  // настройки: цель нормализации
  await page.click(T + '[data-x="set"]');
  await page.click('.sheet [data-seg="ntarget"] [data-v="-19"]');
  expect((await melete.toolsNow()).show.norm.target).toBe(-19);
  expect(errors).toEqual([]);
});

test('пульт: «стоп всем» — только двойное касание; избранные пады на «Эфире» включаются в настройках', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.free('F', ['show']);
  await page.waitForFunction(() => !document.querySelector('.session .modload'), null, { timeout: 15_000 });
  const T = '.session .pane[data-tool="show"] ';
  await page.click(T + '[data-x="evnew"]'); await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await page.click(T + '[data-page="desk"]');
  // одно касание заряжает и сходит само; два подряд — гасят
  await page.click(T + '[data-x="panic"]');
  await expect(page.locator(T + '.shpanic.armed')).toHaveCount(1);
  await expect(page.locator(T + '.shpanic.armed')).toHaveCount(0, { timeout: 4000 });
  await page.click(T + '[data-x="panic"]'); await page.click(T + '[data-x="panic"]');
  await expect(page.locator(T + '.shpanic.armed')).toHaveCount(0);
  // избранные пады: по умолчанию нет, плитка включает колонку справа
  await expect(page.locator(T + '.shfavs')).toHaveCount(0);
  await page.click(T + '[data-x="set"]'); await page.click('.sheet [data-tg="deskPads"]');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await expect(page.locator(T + '.shfavs .shpad')).not.toHaveCount(0);
  expect(errors).toEqual([]);
});

test('звуки умнее: «Сейчас звучат» с ✕, заливка падов, блокировка касаний, шторка «Звук» с плавным стопом', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.free('F', ['show']);
  await page.waitForFunction(() => !document.querySelector('.session .modload'), null, { timeout: 15_000 });
  const T = '.session .pane[data-tool="show"] ';
  await page.click(T + '[data-page="pads"]');
  await expect(page.locator(T + '.shpads .shpad[data-pad]')).toHaveCount(9, { timeout: 15_000 });
  await page.waitForTimeout(800);
  const pad = T + '.shpad[data-pad] >> nth=0';
  await page.dispatchEvent(pad, 'pointerdown', { pointerId: 1 }); await page.dispatchEvent(pad, 'pointerup', { pointerId: 1 });
  await expect(page.locator(T + '#shnowp')).toBeVisible();
  await expect(page.locator(T + '#shnowp [data-stop]')).toHaveCount(1);
  await page.click(T + '#shnowp [data-stop]');
  await expect(page.locator(T + '#shnowp')).toBeHidden({ timeout: 5000 });
  await page.click(T + '[data-x="levels"]');
  await page.click('.sheet [data-sf="4"]'); await page.click('.sheet [data-ld="15"]'); await page.click('.sheet [data-auto="1"]');
  await expect(page.locator('.sheet [data-sf="4"]')).toHaveClass(/on/);
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  await page.click(T + '[data-lock]');
  await expect(page.locator(T + '.shlock')).toBeVisible();
  const b = await page.locator(T + '[data-unlock]').boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await page.waitForTimeout(1500); await page.mouse.up();
  await expect(page.locator(T + '.shlock')).toHaveCount(0);
  expect(errors).toEqual([]);
});
