// «Сцена — один экран» (слово автора 22.11.2026): без события, сет-лист на экране, темп, барабанные пэды с залом и эхом, замок, «стоп всё»
import { test, expect } from './melete.js';

test('рабочая сцена: без события, список песен, темп, пэды, замок, стоп всё', async ({ page, melete, errors }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  const songs = [{ id: 's1', title: 'Первая', key: 'C', targetBpm: 96, notes: 'C   G\nСлова раз', created: Date.now() }, { id: 's2', title: 'Вторая', key: 'G', targetBpm: 120, notes: 'G   D\nСлова два', created: Date.now() }, { id: 's3', title: 'Третья', created: Date.now() }];
  await melete.open({ songs });
  await page.locator('.hstage').scrollIntoViewIfNeeded();
  await page.locator('.hstage').click(); await page.waitForTimeout(600);
  // событий нет — выбор состава рабочего сет-листа
  await page.click('[data-sgw="s1"]'); await page.click('[data-sgw="s2"]'); await page.waitForTimeout(200);
  await page.click('[data-sgwgo]'); await page.waitForTimeout(800);
  await expect(page.locator('.stage')).toHaveCount(1);
  expect(await melete.text('.sgsong.cur b')).toBe('Первая');
  await page.waitForTimeout(3000); // плашка веб-версии уходит
  // список программы на экране: касание строки — прыжок к песне
  await page.click('.sgsong[data-sgreel="1"]'); await page.waitForTimeout(500);
  expect(await melete.text('.sgsong.cur b')).toBe('Вторая');
  // темп: +1; цифры темпа — кнопка метронома (касание включает и выключает)
  const bpm = () => page.evaluate(() => +document.querySelector('.sgbpm b').textContent);
  const b0 = await bpm(); expect(b0).toBe(120);
  await page.click('[data-sgbpm="1"]'); await page.waitForTimeout(200);
  expect(await bpm()).toBe(121);
  await page.locator('.sgbpm').dispatchEvent('pointerdown', { pointerId: 5, isPrimary: true, clientY: 300 });
  await page.locator('.sgbpm').dispatchEvent('pointerup', { pointerId: 5, isPrimary: true, clientY: 300 });
  await page.waitForTimeout(300);
  await expect(page.locator('.sgbpm.on')).toHaveCount(1);
  await page.locator('.sgbpm').dispatchEvent('pointerdown', { pointerId: 5, isPrimary: true, clientY: 300 });
  await page.locator('.sgbpm').dispatchEvent('pointerup', { pointerId: 5, isPrimary: true, clientY: 300 });
  await page.waitForTimeout(300);
  await expect(page.locator('.sgbpm.on')).toHaveCount(0);
  // барабанные пэды: восемь, касание — удар (подсветка), ползунки пространства и эха
  await expect(page.locator('.sgpad[data-pad]')).toHaveCount(8);
  await page.locator('.sgpad.p-kickw').dispatchEvent('pointerdown', { pointerId: 7, isPrimary: true });
  await page.waitForTimeout(150);
  await expect(page.locator('.sgpad.p-kickw.hit')).toHaveCount(1);
  for (const i of [1, 2, 4, 7]) { await page.locator('.sgpad[data-pad]').nth(i).dispatchEvent('pointerdown', { pointerId: 7, isPrimary: true }); await page.waitForTimeout(60); }
  await page.locator('[data-fx="space"]').fill('90'); await page.locator('[data-fx="echo"]').fill('70');
  expect(await page.evaluate(() => sessionStorage.getItem('melete.stage.space'))).toBe('0.9');
  const shot = process.env.ED_SHOTS; if (shot) await page.screenshot({ path: shot + '/stage.png' });
  // инструменты постоянные: панель звуков всегда на экране
  await expect(page.locator('.sgpad[data-pad]').first()).toBeVisible();
  // замок: касания игнорируются, снимается удержанием
  await page.click('[data-sg="lock"]'); await page.waitForTimeout(200);
  await expect(page.locator('.sglock')).toHaveCount(1);
  await page.click('.sglock', { force: true, position: { x: 20, y: 20 } }); // игнорируется
  expect(await melete.text('.sgsong.cur b')).toBe('Вторая');
  await melete.hold('[data-sgunlock]', 900); await page.waitForTimeout(300);
  await expect(page.locator('.sglock')).toHaveCount(0);
  // старт и «стоп всё» удержанием ■
  await page.click('[data-sg="play"]'); await page.waitForTimeout(800);
  await expect(page.locator('.sgbtn.main.on')).toHaveCount(1);
  await melete.hold('.sgbtn.main.on', 1000); await page.waitForTimeout(400);
  await expect(page.locator('.sgbtn.main.on')).toHaveCount(0);
  // состав рабочего сет-листа сохранён в настройках
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('practice.v1')).settings.stageWork.songs)).toEqual(['s1', 's2']);
  expect(errors).toEqual([]);
});

test('сцена без песен: метроном одной кнопкой, пэд по клавишам, «Звуки» с ударными', async ({ page, melete, errors }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open({ songs: [] });
  await page.locator('.hstage').scrollIntoViewIfNeeded();
  await page.locator('.hstage').click(); await page.waitForTimeout(600);
  if (await page.locator('[data-sgwgo]').count()) await page.click('[data-sgwgo]');
  await page.waitForTimeout(800);
  await expect(page.locator('.stage')).toHaveCount(1);
  expect(await melete.text('.sghead b')).toBeTruthy();
  // плеер: шторка открывается, в «Уровнях» есть своя строка
  await expect(page.locator('.sgplayer')).toBeVisible(); await expect(page.locator('[data-sgplseek]')).toBeVisible();
  await page.click('[data-sgpl="pick"]'); await expect(page.locator('.sheet')).toBeVisible(); await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await expect(page.locator('[data-sgt="mix"], [data-sgt="view"], [data-sgt="pad"]')).toHaveCount(0); // кнопок «Уровни», «Список», «Пэд» больше нет
  // клавиши пэда видны сразу; касание — звучит, повторное по той же — стоп
  await expect(page.locator('.sgkey')).toHaveCount(12);
  const tap = async (sel) => { await page.locator(sel).dispatchEvent('pointerdown', { pointerId: 3, isPrimary: true, clientX: 100, clientY: 100 }); await page.locator(sel).dispatchEvent('pointerup', { pointerId: 3, isPrimary: true, clientX: 100, clientY: 100 }); await page.waitForTimeout(300); };
  await tap('[data-sgk="7"]');
  await expect(page.locator('.sgkey.on')).toHaveCount(1);
  // звуки: готовый банк «Ударные» — восемь падов, касание подсвечивает
  await expect(page.locator('.sgpad[data-pad]')).toHaveCount(8);
  await page.locator('.sgpad.p-snare').dispatchEvent('pointerdown', { pointerId: 9, isPrimary: true });
  await page.waitForTimeout(120);
  await expect(page.locator('.sgpad.p-snare.hit')).toHaveCount(1);
  // метроном и пэд вместе; «стоп всё» гасит
  await tap('.sgbpm');
  await expect(page.locator('.sgbpm.on')).toHaveCount(1);
  await page.click('[data-sg="panic"]'); await page.waitForTimeout(500);
  await expect(page.locator('.sgbpm.on')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('сцена: панель табов — файл песни рисуется на сцене, щипок-масштаб без ошибок', async ({ page, melete, errors }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  const songs = [{ id: 's1', title: 'С табами', key: 'C', targetBpm: 90, notes: 'C   G\nСлова', created: Date.now() }, { id: 's2', title: 'Без табов', key: 'G', targetBpm: 100, notes: 'Слова', created: Date.now() }];
  await melete.open({ songs });
  await page.evaluate(async () => {
    const tab = ['e|-----0-----0---|', 'B|---1-----1-----|', 'G|-0-------0-----|', 'D|---------------|', 'A|---------------|', 'E|---------------|'].join('\n');
    await window.__melete.files.add({ id: 'tb1', kind: 'tab', name: 'riff.txt', blob: new Blob([tab], { type: 'text/plain' }), size: tab.length, songs: ['s1'], fmt: 'ascii', det: 'ascii', created: Date.now() });
  });
  await page.locator('.hstage').scrollIntoViewIfNeeded();
  await page.locator('.hstage').click(); await page.waitForTimeout(600);
  await page.click('[data-sgw="s1"]'); await page.click('[data-sgw="s2"]'); await page.click('[data-sgwgo]'); await page.waitForTimeout(800);
  await expect(page.locator('[data-sgt="tab"]')).toHaveCount(1); // у первой песни есть табы
  await page.click('[data-sgt="tab"]');
  await expect(page.locator('.sgscore')).toHaveCount(1);
  await expect(page.locator('.sgsurfhost svg, .sgscoretxt').first()).toBeVisible({ timeout: 30_000 });
  // следующая песня без табов — панель уходит, чип скрыт
  await page.click('.sgsong:not(.cur)'); await page.waitForTimeout(500);
  await expect(page.locator('[data-sgt="tab"]')).toHaveCount(0);
  await expect(page.locator('.sgscore')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('сцена: крутилки громкости по источникам и жест вверх-вниз по экрану — программа вкл/выкл', async ({ page, melete, errors }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open({ songs: [] });
  await page.locator('.hstage').scrollIntoViewIfNeeded();
  await page.locator('.hstage').click(); await page.waitForTimeout(600);
  if (await page.locator('[data-sgwgo]').count()) await page.click('[data-sgwgo]');
  await page.waitForTimeout(800);
  await expect(page.locator('.sgkn')).toHaveCount(5); // общая, клик, пэд, драм, медиа
  // крутилка «Драм»: тянуть вверх-вниз меняет значение
  const kn = page.locator('[data-sgkn="sounds"]'), before = +(await kn.getAttribute('aria-valuenow'));
  const bb = await kn.boundingBox();
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.mouse.down();
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2 + 40, { steps: 4 }); await page.mouse.up();
  expect(+(await kn.getAttribute('aria-valuenow'))).toBeLessThan(before);
  // жест вверх по экрану: метроном включился; ещё раз — выключился
  const swipeUp = () => page.evaluate(() => {
    const el = document.querySelector('.sgbig') || document.querySelector('.sgtext'), r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const ev = (type, cy) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 9, isPrimary: true, pointerType: 'touch', clientX: x, clientY: cy }));
    ev('pointerdown', y); ev('pointermove', y - 80); ev('pointerup', y - 160);
  });
  await swipeUp(); await page.waitForTimeout(400);
  await expect(page.locator('.sgbpm.on')).toHaveCount(1);
  await swipeUp(); await page.waitForTimeout(400);
  await expect(page.locator('.sgbpm.on')).toHaveCount(0);
  expect(errors).toEqual([]);
});

function wavBytes(sec = 8, sr = 8000) {
  const n = sec * sr, b = new Uint8Array(44 + n * 2), v = new DataView(b.buffer), w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.round(Math.sin(i / 8) * 3000), true);
  return [...b];
}

test('сцена: плеер запоминает запись и всегда готов — ▶ играет, касание полосы перематывает', async ({ page, melete, errors }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open({ songs: [] });
  await page.evaluate(async (bytes) => {
    const app = window.__melete; await app.files.ready;
    await app.files.add({ id: 'plx', name: 'Фоновое пианино.wav', type: 'audio/wav', kind: 'audio', blob: new Blob([new Uint8Array(bytes)], { type: 'audio/wav' }), dur: 8, created: Date.now() });
    localStorage.setItem('melete.stage.player', 'plx');
  }, wavBytes());
  await page.locator('.hstage').scrollIntoViewIfNeeded();
  await page.locator('.hstage').click(); await page.waitForTimeout(600);
  if (await page.locator('[data-sgwgo]').count()) await page.click('[data-sgwgo]');
  await page.waitForTimeout(1000);
  await expect(page.locator('.sgplseek span')).toHaveText('Фоновое пианино.wav'); // запись готова без выбора
  await page.click('[data-sgpl="pp"]'); await page.waitForTimeout(1200);
  await expect(page.locator('[data-sgpl="pp"]')).toHaveAttribute('aria-pressed', 'true');
  // касание середины полосы — перемотка на середину
  const bar = page.locator('[data-sgplseek]'), bb = await bar.boundingBox();
  await page.mouse.click(bb.x + bb.width * 0.5, bb.y + bb.height / 2); await page.waitForTimeout(400);
  const w = await page.evaluate(() => parseFloat(document.querySelector('.sgplseek i').style.width));
  expect(w).toBeGreaterThan(40); expect(w).toBeLessThan(70);
  await page.click('[data-sgpl="pp"]'); await page.waitForTimeout(300);
  await expect(page.locator('[data-sgpl="pp"]')).toHaveAttribute('aria-pressed', 'false');
  expect(errors).toEqual([]);
});
