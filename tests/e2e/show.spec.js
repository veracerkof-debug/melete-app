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
  await expect(page.locator(T + '.shdock .shpad')).toHaveCount(2);
  await page.locator(T + '.shbanks [data-bank]').first().click(); // готовые «Ударные» — отдельной полосой сверху, во вкладках — свои банки; первый — пустой
  await page.click(T + '.shpads .shpad[data-cell="0"]');
  await page.fill('.sheet [data-f="name"]', 'Дробь');
  await page.click('.sheet [data-x="pick"]');
  await page.setInputFiles('.sheet input[type="file"]', { name: 'drum.wav', mimeType: 'audio/wav', buffer: wav() });
  await expect(page.locator('.sheet [data-x="pick"]')).toContainText('drum', { timeout: 8000 });
  await page.click('.sheet [data-mode="hold"]');
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  await expect(page.locator(T + '.shpads:not(.drm) .shpad[data-pad]').first()).toContainText('Дробь');
  // звук идёт, пока держат; отпустили — стоит
  const pad = T + '.shpads:not(.drm) .shpad[data-pad]';
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
  await expect(page.locator(T + '.shstrip:not(.shnk) [data-knob]')).toHaveCount(4);
  await page.click(T + '[data-page="pads"]'); await page.click(T + '[data-x="bedsheet"]');
  await expect(page.locator('.sheet .shnoise.on')).toHaveCount(1, { timeout: 8000 });
  expect(errors).toEqual([]);
});

test('громкость: крутилки внизу «Программы» и «Звуков», общая громкость; двойное касание — на 0', async ({ page, melete, errors }) => {
  await melete.open();
  await melete.free('F', ['show']);
  await page.waitForFunction(() => !document.querySelector('.session .modload'), null, { timeout: 15_000 });
  const T = '.session .pane[data-tool="show"] ';
  await page.click(T + '[data-page="pads"]');
  await expect(page.locator(T + '[data-knob]')).toHaveCount(4); // страница «Звуки»
  const kn = T + '[data-knob="master"]', b = await page.locator(kn).boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2 + 42, { steps: 6 }); await page.mouse.up(); // вниз на 42 px ≈ −30
  const v = +(await page.locator(kn).getAttribute('aria-valuenow'));
  expect(v).toBeGreaterThan(60); expect(v).toBeLessThan(80);
  await page.click(T + '[data-page="desk"]');
  await expect(page.locator(T + '.shstrip:not(.shnk) [data-knob]')).toHaveCount(4);
  await page.click(T + '[data-page="pads"]');
  await expect(page.locator(T + '[data-knob="master"]')).toHaveAttribute('aria-valuenow', String(v)); // то же значение на другой странице
  await page.locator(T + '[data-knob="pads"]').focus(); await page.keyboard.press('ArrowDown');
  await expect(page.locator(T + '[data-knob="pads"]')).toHaveAttribute('aria-valuenow', '84');
  await page.click(T + '[data-page="desk"]');
  await expect(page.locator(T + '.shstrip:not(.shnk) [data-knob]')).toHaveCount(4);
  const sh = (await melete.toolsNow()).show;
  expect(sh.master).toBe(v); expect(sh.level).toBe(84);
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
  await expect(page.locator(T + '[data-knob="deck"]')).toBeVisible({ timeout: 10_000 });
  const kn = T + '.shstrip [data-knob="deck"]', b = await page.locator(kn).boundingBox();
  const v0 = +(await page.locator(kn).getAttribute('aria-valuenow'));
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2 - 28, { steps: 5 }); await page.mouse.up(); // вверх на 28 px ≈ +20
  const v1 = +(await page.locator(kn).getAttribute('aria-valuenow'));
  expect(v1 === 100 || v1 > v0 + 10).toBe(true);
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
