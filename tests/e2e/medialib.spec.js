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
// «Отправить» нескольких (отчёт автора 08.11: не реагировала): все файлы одним разом — в браузере без «Поделиться» скачиваются
test('медиатека: «Отправить» нескольких — все файлы разом', async ({ page, melete, errors }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open({ settings: { upOk: 2 } });
  await page.addInitScript(() => { try { Object.defineProperty(navigator, 'canShare', { value: () => false }); } catch { /* */ } });
  await page.evaluate(() => { try { Object.defineProperty(navigator, 'canShare', { value: () => false, configurable: true }); } catch { /* */ } });
  await melete.free('F', ['audio']); await page.waitForTimeout(1200);
  const fc = page.waitForEvent('filechooser'); await page.locator('.session [data-x="aadd"]').first().click(); await (await fc).setFiles(wav());
  await page.waitForTimeout(1500);
  const names = [];
  page.on('download', (d) => names.push(d.suggestedFilename()));
  await page.locator('[data-x="mlsend"]').click();
  await expect.poll(() => names.length, { timeout: 8000 }).toBe(2);
  expect(names.sort()).toEqual(['a.wav', 'b.wav']);
  expect(errors).toEqual([]);
});
// Форматы (слово автора 08.11): сконвертированный файл — не отдельная строка, а формат своей записи; удалить формат —
// запись остаётся; удалить исходный — его место занимает сделанный
test('медиатека: форматы записи — одна строка, удалить формат', async ({ page, melete, errors }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await melete.open({ settings: { upOk: 2 } });
  await melete.free('F', ['audio']); await page.waitForTimeout(1200);
  const fc = page.waitForEvent('filechooser'); await page.locator('.session [data-x="aadd"]').first().click(); await (await fc).setFiles(wav().slice(0, 1));
  await page.waitForTimeout(1500);
  await page.evaluate(async () => {
    const F = window.__melete.files, src = F.list('audio')[0];
    await F.add({ id: 'cvtest1', name: 'a.flac', size: 10, type: 'audio/flac', kind: 'audio', created: Date.now(), blob: new Blob([new Uint8Array(10)], { type: 'audio/flac' }), conv: { src: [src.id], fmt: 'flac' } });
  });
  await melete.free('F', ['audio']); await page.waitForTimeout(1200);
  await expect(page.locator('.mlist .mlrow')).toHaveCount(1);
  await expect(page.locator('.mlist .mlrow small')).toContainText(' + FLAC');
  await page.locator('.mlist [data-x="mlmenu"]').click(); await page.waitForTimeout(500);
  await expect(page.locator('.sheet [data-m="fdel"]')).toHaveCount(2);
  page.once('dialog', (d) => d.accept());
  await page.locator('.sheet [data-m="fdel"][data-f="cvtest1"]').click();
  await page.locator('.confirm [data-ok], .sheet [data-ok], .cfm .ok, button:has-text("Удалить")').last().click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => !!window.__melete.files.get('cvtest1'))).toBe(false);
  expect(await page.evaluate(() => window.__melete.files.list('audio').length)).toBe(1);
  expect(errors).toEqual([]);
});
