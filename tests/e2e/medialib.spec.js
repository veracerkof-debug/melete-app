import { test, expect } from './melete.js';
import fs from 'fs'; import os from 'os'; import path from 'path';
function wav() { const sr = 8000, n = sr, b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40); for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.sin(i / 3) * 9000), 44 + i * 2); const d = fs.mkdtempSync(path.join(os.tmpdir(), 'ml-')); const ps = ['a.wav', 'b.wav'].map((f) => { const p = path.join(d, f); fs.writeFileSync(p, b); return p; }); return ps; }
// Медиатека (06.11.2026): несколько файлов — выбор, полоса «В песни · Отправить · Конвертировать · Удалить»; конвертер — шторкой
test('медиатека: выбор нескольких → конвертер шторкой', async ({ page, melete, errors }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open({ settings: { upOk: 2 } });
  await melete.free('F', ['audio']); await page.waitForTimeout(1200);
  const fc = page.waitForEvent('filechooser'); await page.locator('.session [data-x="aadd"]').first().click(); await (await fc).setFiles(wav());
  await page.waitForTimeout(1500);
  await page.locator('[data-x="mlconv"]').click(); await page.waitForTimeout(1500);
  await expect(page.locator('.sheet .mlconv .cvc')).toHaveCount(2);
  expect(errors).toEqual([]);
});
