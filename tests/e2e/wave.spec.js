// Волна плеера медиатеки: по средней громкости в дБ (не по пикам — длинная запись была «стеной»), считается из того же
// раскодированного звука, что идёт в движок; паузы и тихие места видны.
import { test, expect } from './melete.js';

test('волна: тихое видно, не стена; приходит вместе с воспроизведением', async ({ page, melete, errors }) => {
  test.setTimeout(120_000);
  await melete.open({ settings: { autoStems: 'off', autoAna: false } });
  await page.evaluate(async () => {
    const { createFiles } = await import('/src/core/files.js'); const { encodeWav } = await import('/src/audio/voicefx.js');
    const f = createFiles(); await f.ready;
    // 4 мин: фразы с паузами и редкими громкими щелчками, в середине — 30 с почти тишины
    const SR = 16000, N = SR * 240, x = new Float32Array(N);
    for (let i = 0; i < N; i++) { const t = i / SR, on = (t % 3) < 2, amp = t > 100 && t < 130 ? 0.003 : 0.25; x[i] = (on ? amp * Math.sin(2 * Math.PI * 200 * t) : 0.001 * Math.sin(i)) + (i % 7919 === 0 ? 0.95 : 0); }
    await f.add({ id: 'w1', name: 'talk.wav', size: 1, type: 'audio/wav', kind: 'audio', songs: [], created: Date.now(), blob: new Blob([encodeWav([x, x], SR)], { type: 'audio/wav' }), dur: 240 });
  });
  await melete.free('F', ['audio']);
  await melete.click('[data-x="mlplay"][data-id="w1"]');
  await melete.click('[data-x="mlopen"]');
  await page.waitForSelector('#wform:not(.wait)', { timeout: 60_000 });
  const pk = await page.evaluate(() => new Promise((res) => { const r = indexedDB.open('practice-audio'); r.onsuccess = () => { const q = r.result.transaction('tracks').objectStore('tracks').get('w1'); q.onsuccess = () => res({ pk: q.result.peaks, v: q.result.pkv }); }; }));
  expect(pk.v).toBe(2);
  const quiet = pk.pk.slice(Math.round(480 * 105 / 240), Math.round(480 * 125 / 240)), loud = pk.pk.slice(0, 160);
  expect(Math.max(...quiet)).toBeLessThan(0.5); // тихое место — низкое, хотя щелчки там есть
  expect(Math.max(...loud)).toBeGreaterThan(0.85);
  expect(errors).toEqual([]);
});
