// Вокал на «живом» голосе (DECISIONS «Вокал» 14.11.2026): браузер слушает WAV с напетой дорийской гаммой от C вместо
// микрофона — лад «Авто» находится сам, проверка диапазона проходит три шага и даёт рабочий не шире физического.
// Отдельный файл: свой запуск браузера (файл вместо микрофона) Playwright задаёт только на весь файл.
import { test, expect } from './melete.js';
import { writeVoiceWav } from './voicewav.js';
import { mkdirSync } from 'node:fs';

const dir = 'test-results/vocal-voice';
mkdirSync(dir, { recursive: true });
const wav = writeVoiceWav(dir + '/dorian.wav', [48, 50, 51, 53, 55, 57, 58, 60, 58, 57, 55, 53, 51, 50, 48, 55, 57, 58, 60, 62, 60, 58, 57, 55]);
test.use({ launchOptions: { executablePath: process.env.PW_CHROMIUM || undefined, args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required', '--use-file-for-fake-audio-capture=' + wav] } });
test('лад «Авто» — дорийский; проверка диапазона — рабочий и физический', async ({ page, melete, errors }) => {
  await melete.open({ settings: { vocal: { range: { lo: 48, hi: 64, plo: 45, phi: 67 } } } });
  await melete.free('F', ['vocal']);
  await page.locator('[data-seg="vcsec"] [data-v="improv"]').click(); await page.waitForTimeout(300);
  await page.locator('[data-x="imgo"]').click();
  await expect(page.locator('#vcims b')).toContainText('Дорийский', { timeout: 25_000 });
  await page.locator('[data-x="imgo"]').click(); await page.waitForTimeout(300);
  await page.locator('[data-seg="vcsec"] [data-v="voice"]').click();
  await page.locator('[data-x="test"]').click(); await page.waitForTimeout(6000);
  await page.locator('[data-x="tnext"]').click(); await page.waitForTimeout(5000);
  await page.locator('[data-x="tnext"]').click(); await page.waitForTimeout(7000);
  await page.locator('[data-x="tnext"]').click(); await page.waitForTimeout(400);
  await expect(page.locator('.vcrt')).toContainText('Рабочий');
  await page.locator('[data-x="tsave"]').click(); await page.waitForTimeout(400);
  const r = await page.evaluate(() => JSON.parse(localStorage.getItem('practice.v1')).settings.vocal.range);
  expect(r.plo).toBeLessThanOrEqual(r.lo); expect(r.phi).toBeGreaterThanOrEqual(r.hi);
  expect(r.lo).toBeGreaterThanOrEqual(47); expect(r.hi).toBeLessThanOrEqual(63);
});

// «Петь» (DECISIONS «Вокал: прогресс и «Петь»»): песня с отделённым вокалом — мелодия снимается сама, дубль под «голос»
// из файла даёт счёт, фразы и запись в прогресс «Вокала»; распевка — тоже в прогресс
test('«Петь»: мелодия по вокалу, дубль, счёт и фразы; прогресс дня в «Вокале»', async ({ page, melete, errors }) => {
  await melete.open({ settings: { vocal: { range: { lo: 48, hi: 64, plo: 45, phi: 67 } } } });
  await page.waitForFunction(() => window.__melete && window.__melete.files);
  await page.evaluate(async () => {
    const app = window.__melete, sr = 22050, notes = [48, 50, 51, 53, 55, 57, 58, 60, 58, 57, 55, 53, 51, 50, 48, 55], nd = 0.7, gap = 0.1, n = Math.round(notes.length * (nd + gap) * sr);
    const wav = (fn) => { const b = new ArrayBuffer(44 + n * 2), v = new DataView(b), w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
      w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
      for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, fn(i / sr) * 9000, true); return new Blob([b], { type: 'audio/wav' }); };
    const mel = (t) => { const k = Math.floor(t / (nd + gap)), u = t - k * (nd + gap); if (k >= notes.length || u > nd) return 0; const f = 440 * Math.pow(2, (notes[k] - 69) / 12), ph = 2 * Math.PI * f * t; return Math.sin(ph) + 0.5 * Math.sin(2 * ph); };
    await app.files.ready;
    await app.files.add({ id: 'sgsong', name: 'Гамма.wav', type: 'audio/wav', kind: 'audio', blob: wav((t) => 0.5 * mel(t) + 0.3 * Math.sin(2 * Math.PI * 65.4 * t)), dur: n / sr, created: Date.now() });
    await app.files.add({ id: 'sgv', name: 'v.wav', type: 'audio/wav', kind: 'audio', blob: wav(mel), dur: n / sr, stem: { src: 'sgsong', part: 'vocals', mode: '2' } });
    await app.files.add({ id: 'sgi', name: 'i.wav', type: 'audio/wav', kind: 'audio', blob: wav((t) => Math.sin(2 * Math.PI * 65.4 * t)), dur: n / sr, stem: { src: 'sgsong', part: 'inst', mode: '2' } });
  });
  await melete.tools({ audio: { pview: 'sing' } });
  await melete.free('F', ['audio']);
  await page.evaluate(() => document.querySelector('[data-x="mlplay"][data-id="sgsong"]')?.click());
  await page.waitForTimeout(500);
  await page.evaluate(() => { const p = document.querySelector('[data-x="mlplay"][data-id="sgsong"]'); if (p) p.click(); document.querySelector('[data-x="mlopen"]')?.click(); });
  await expect(page.locator('#sgcv')).toHaveCount(1, { timeout: 20_000 }); // мелодия снята — полоса на месте
  const mel = await page.evaluate(() => window.__melete.files.get('sgsong').mel);
  expect(mel.p.filter((v) => v > 0).length).toBeGreaterThan(100);
  await page.locator('[data-x="sgmin"]').click(); await page.waitForTimeout(300); // минус — вокал в ноль
  await expect(page.locator('[data-x="sgmin"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-x="sggo"]').click(); await page.waitForTimeout(7000);
  await page.locator('[data-x="sggo"]').click(); await page.waitForTimeout(600);
  await expect(page.locator('#sgscore')).toHaveText(/^\d+$/);
  expect(await page.locator('.sgp').count()).toBeGreaterThan(0);
  const log = await page.evaluate(() => JSON.parse(localStorage.getItem('practice.v1')).settings.vocal.log);
  expect(log.length).toBe(1);
  expect(log[0].takes.some((x) => x.k === 'song' && x.id === 'sgsong')).toBe(true);
  // прогресс в «Вокале»: карточка с неделей и графиком
  await melete.tools({ vocal: { sec: 'voice' } });
  await melete.free('F', ['vocal']);
  await expect(page.locator('.vcprog .vcweek')).toBeVisible();
  await expect(page.locator('.vcprog .vcchart')).toBeVisible();
});
