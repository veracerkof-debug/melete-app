// Плеер медиатеки: запись звучит через движок, ступени скорости — касание ставит, касание значения — следующая,
// удержание — шторка с правкой, по умолчанию — возврат
import { test, expect } from './melete.js';

test('скорость записи: убавить, следующая ступень, прибавить', async ({ page, melete, errors }) => {
  await melete.open({ settings: { autoStems: 'off', autoAna: false } });
  await page.evaluate(async () => {
    const { createFiles } = await import('/src/core/files.js'); const { encodeWav } = await import('/src/audio/voicefx.js');
    const f = createFiles(); await f.ready;
    const SR = 44100, N = SR * 6, x = new Float32Array(N); for (let i = 0; i < N; i++) x[i] = 0.3 * Math.sin((2 * Math.PI * 220 * i) / SR);
    await f.add({ id: 'r1', name: 'tone.wav', size: 1, type: 'audio/wav', kind: 'audio', songs: [], created: Date.now(), blob: new Blob([encodeWav([x, x], SR)], { type: 'audio/wav' }), dur: 6 });
  });
  await melete.free('F', ['audio']);
  await melete.click('[data-x="mlplay"][data-id="r1"]'); await page.waitForTimeout(1500);
  await melete.click('[data-x="mlopen"]'); await page.waitForTimeout(800);
  // скорость одним рядом (3374c37: без отдельных кнопок-ступеней): «−» убавляет, касание значения — следующая ступень по кругу, «+» прибавляет
  expect(await melete.count('.rpre')).toBe(0);
  const v0 = await melete.text('#ratev');
  await melete.click('[data-step="arate"][data-d="-1"]'); await page.waitForTimeout(300);
  const v1 = await melete.text('#ratev'); expect(v1).not.toBe(v0); expect(v1).toMatch(/0[,.]9|9\d/);
  await melete.click('#ratev'); await page.waitForTimeout(300);
  expect(await melete.text('#ratev')).not.toBe(v1);
  await melete.click('[data-step="arate"][data-d="1"]'); await page.waitForTimeout(300);
  expect(await melete.text('#ratev')).toBeTruthy();
  expect(errors).toEqual([]);
});

// Меню записи: «Поделиться» — файл уходит как есть (в браузере — системный выбор или скачивание)
test('поделиться записью', async ({ page, melete, errors }) => {
  await melete.open({ settings: { autoStems: 'off', autoAna: false } });
  await page.evaluate(async () => {
    const { createFiles } = await import('/src/core/files.js'); const { encodeWav } = await import('/src/audio/voicefx.js');
    const f = createFiles(); await f.ready;
    await f.add({ id: 'r2', name: 'take.wav', size: 1, type: 'audio/wav', kind: 'audio', songs: [], created: Date.now(), blob: new Blob([encodeWav([new Float32Array(4410)], 44100)], { type: 'audio/wav' }), dur: 0.1 });
  });
  await melete.free('F', ['audio']);
  await melete.click('[data-x="mlmenu"][data-id="r2"]'); await page.waitForTimeout(500);
  const dl = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
  await melete.click('.sheet [data-m="send"]');
  const d = await dl;
  expect(d && d.suggestedFilename()).toBe('take.wav');
  expect(errors).toEqual([]);
});
