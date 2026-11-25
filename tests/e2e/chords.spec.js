// Вид «Аккорды» плеера (chordview.js): «сейчас» — аккорд, ступень, схема на грифе, следующий; такты с аккордами по
// функциям; текущий такт идёт за воспроизведением; касание такта — перемотка
import { test, expect } from './melete.js';

test('вид «Аккорды»: сейчас, схема, такты, перемотка', async ({ page, melete, errors }) => {
  await melete.open({ settings: { autoStems: 'off', autoAna: false } });
  await page.evaluate(async () => {
    const { createFiles } = await import('/src/core/files.js'); const { encodeWav } = await import('/src/audio/voicefx.js');
    const f = createFiles(); await f.ready;
    const SR = 44100, D = 40, N = SR * D, x = new Float32Array(N); for (let i = 0; i < N; i++) x[i] = 0.2 * Math.sin((2 * Math.PI * 220 * i) / SR);
    const bpm = 96, b = 60 / bpm, beats = [], downbeats = []; for (let t = 0.2; t < D; t += b) { beats.push(+t.toFixed(3)); if (beats.length % 4 === 1) downbeats.push(+t.toFixed(3)); }
    const prog = ['C', 'G', 'A:min', 'F', 'D:min7', 'G:7', 'C', 'C:maj7', 'A:min7', 'E:7'];
    const chords = []; for (let i = 0; i * 4 < beats.length; i++) { const t0 = beats[i * 4], t1 = beats[i * 4 + 4] ?? D; chords.push({ t: t0, d: +(t1 - t0).toFixed(2), c: prog[i % prog.length] }); }
    await f.add({ id: 'r1', name: 'chords.wav', size: 1, type: 'audio/wav', kind: 'audio', songs: [], marks: [{ t: 0.2, name: 'Вступление' }, { t: 10.2, name: 'Куплет' }], created: Date.now(), blob: new Blob([encodeWav([x, x], SR)], { type: 'audio/wav' }), dur: D,
      ana: { pc: 0, minor: false, bpm, bpb: 4, beats, downbeats, chords, v: 3, at: Date.now() } });
  });
  await melete.free('F', ['audio']);
  await melete.click('[data-x="mlplay"][data-id="r1"]'); await page.waitForTimeout(1000);
  await melete.click('[data-x="mlopen"]'); await page.waitForTimeout(600);
  await melete.click('[data-x="apv"][data-v="chords"]'); await page.waitForTimeout(600);
  await expect(page.locator('#chn')).toHaveText('C');
  await expect(page.locator('#chdeg')).toHaveText('1');
  await expect(page.locator('#chdg svg.chdia')).toHaveCount(1);
  await expect(page.locator('#chx')).toHaveText('G');
  expect(await page.locator('.chb').count()).toBeGreaterThan(10);
  await expect(page.locator('.chb[data-bar="5"] .chps i')).toHaveText('G7');
  await expect(page.locator('.chb[data-bar="5"] .chps i')).toHaveClass(/fn-d/);
  // касание 4-го такта — перемотка туда: сейчас F, ступень 4, такт подсвечен
  await page.locator('.chb[data-bar="3"]').click(); await page.waitForTimeout(600);
  await expect(page.locator('#chn')).toHaveText('F');
  await expect(page.locator('#chdeg')).toHaveText('4');
  await expect(page.locator('.chb.on')).toHaveAttribute('data-bar', '3');
  // касание аккорда открывает шторку правки: F → Dm; правка помечена, исходное помнится, видно в такте и в файле
  await expect(page.locator('#sheetLayer .cesh')).toHaveCount(0); // касание только переходит
  await page.locator('.chb[data-bar="3"] .chps i').dispatchEvent('pointerdown', { button: 0, clientX: 100, clientY: 100 }); await page.waitForTimeout(700);
  await page.locator('.chb[data-bar="3"] .chps i').dispatchEvent('pointerup');
  await expect(page.locator('#sheetLayer .cesh')).toBeVisible(); // удержание — правка
  await page.locator('#sheetLayer [data-ce="root"][data-v="2"]').click();
  await page.locator('#sheetLayer [data-ce="q"][data-v="min"]').click(); await page.waitForTimeout(400);
  await expect(page.locator('#sheetLayer .cebig b')).toHaveText('Dm');
  await expect(page.locator('.chb[data-bar="3"] .chps i')).toHaveText('Dm');
  await page.locator('#sheetLayer [data-ce="none"]').click(); await page.waitForTimeout(300);
  await expect(page.locator('#sheetLayer .cebig b')).toHaveText('нет аккорда');
  await page.locator('#sheetLayer [data-ce="auto"]').click(); await page.waitForTimeout(300); // «Как посчитано»
  await expect(page.locator('#sheetLayer .cebig b')).toHaveText('F');
  await page.locator('#sheetLayer [data-ce="root"][data-v="7"]').click(); await page.waitForTimeout(1200); // сохранение отложено на 0,7 с
  const got = await page.evaluate(async () => { const { createFiles } = await import('/src/core/files.js'); const f = createFiles(); await f.ready; const a = f.get('r1').ana; return { c: a.chords[3].c, edit: !!a.cedit, auto: !!a.cauto }; });
  expect(got).toEqual({ c: 'G', edit: true, auto: true }); // новая правка после возврата снова запоминает посчитанное
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  // части песни: видны в сетке и чипами, касание — перейти, удержание — повторять отрезок до следующей метки
  await expect(page.locator('.chmk').first()).toHaveText('Вступление');
  const chip = page.locator('.amk[data-i="1"]');
  await chip.click(); await page.waitForTimeout(400);
  await expect(page.locator('.chb.on')).toHaveAttribute('data-bar', '4');
  await chip.dispatchEvent('pointerdown', { button: 0, clientX: 50, clientY: 50 }); await page.waitForTimeout(700); await chip.dispatchEvent('pointerup');
  await expect(chip).toHaveClass(/loop/);
  expect(errors).toEqual([]);
});