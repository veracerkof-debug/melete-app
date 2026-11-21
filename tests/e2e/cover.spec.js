// Обложка из тегов файла: MP3 с картинкой в ID3 → в медиатеке плитка с обложкой (src/music/cover.js, modules/audio)
import { test, expect } from './melete.js';

const be32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const sync = (n) => [(n >>> 21) & 127, (n >>> 14) & 127, (n >>> 7) & 127, n & 127];

test('обложка: MP3 с картинкой — плитка с обложкой, без картинки — прежняя', async ({ page, melete, errors }) => {
  await melete.open();
  const jpg = await page.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64;
    const g = c.getContext('2d'); g.fillStyle = '#c33'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#39c'; g.fillRect(16, 16, 32, 32);
    const b = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.9));
    return [...new Uint8Array(await b.arrayBuffer())];
  });
  const apic = [0, ...'image/jpeg'.split('').map((x) => x.charCodeAt(0)), 0, 3, 0, ...jpg];
  const frame = [...'APIC'.split('').map((x) => x.charCodeAt(0)), ...be32(apic.length), 0, 0, ...apic];
  const mp3 = Buffer.from([...'ID3'.split('').map((x) => x.charCodeAt(0)), 3, 0, 0, ...sync(frame.length), ...frame, ...new Array(400).fill(0)]);
  await melete.free('F', ['audio']); await page.waitForTimeout(800);
  await page.locator('input[type=file][multiple]').first().setInputFiles([
    { name: 'Cover Song.mp3', mimeType: 'audio/mpeg', buffer: mp3 },
    { name: 'No Cover.mp3', mimeType: 'audio/mpeg', buffer: Buffer.from([...'ID3'.split('').map((x) => x.charCodeAt(0)), 3, 0, 0, 0, 0, 0, 0, ...new Array(300).fill(0)]) },
  ]);
  await expect.poll(() => page.evaluate(() => document.querySelectorAll('.mlart.cov').length), { timeout: 15000 }).toBeGreaterThan(0);
  const rec = await page.evaluate(() => window.__melete.files.list('audio').map((t) => [t.name, typeof t.cover, (t.cover || '').slice(0, 23)]));
  expect(rec.find((r) => r[0] === 'Cover Song')[2]).toBe('data:image/jpeg;base64,');
  expect(rec.find((r) => r[0] === 'No Cover')[1]).toBe('string'); // '' — искали, обложки нет
  expect(errors).toEqual([]);
});
