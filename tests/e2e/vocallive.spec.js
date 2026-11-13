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
