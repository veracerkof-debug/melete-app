// Диктофон: один экран (вход, лампочка, спектр, пресеты, полоса кнопок); пресеты — готовые, правка («изменён»),
// «Сохранить как» → свой, возврат; запись с поддельного микрофона кусками в IndexedDB, метки по касанию, дубль,
// обработка и сохранение в медиатеку с метками; исходник остаётся в «Записях в памяти» (кнопка «Ещё»).
import { test, expect } from './melete.js';

const open = async (page, melete) => {
  await melete.open();
  await melete.tab('tools');
  await melete.click('[data-open-tool="voice"]');
  await page.waitForSelector('.voice .vc-bot', { timeout: 10_000 });
};
const vs = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('practice.v1.tools') || '{}').voice);

test('экран: вход и лампочка, пресеты; шторки входа, пресета, цифр', async ({ page, melete, errors }) => {
  await open(page, melete);
  // вход и выход — две плашки рядом (07.11.2026), обе ведут в свои шторки
  await expect(page.locator('.voice .vc-inrow [data-x="insheet"]')).toHaveCount(1);
  await expect(page.locator('.voice .vc-inrow [data-x="outsheet"]')).toHaveCount(1);
  await expect(page.locator('.voice #vc-lamp')).toHaveCount(1);
  await expect(page.locator('.voice [data-preset="music"].on')).toHaveCount(1); // новичку — «Музыка», своих нет
  expect((await vs(page)).presets).toEqual([]);
  // на экране нет цифр, эквалайзера и ряда «Пауза/Шип/Сжатие/Лимит»
  await expect(page.locator('.voice .fxcv, .voice #vc-gr, .voice [data-vp]')).toHaveCount(0);
  await melete.click('.voice [data-x="insheet"]');
  await expect(page.locator('.sheet [data-in]').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await melete.click('.voice [data-x="outsheet"]');
  await expect(page.locator('.sheet [data-out=""][aria-pressed="true"]')).toHaveCount(1); // «как в системе»
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  await melete.click('.voice .vc-stage');
  await expect(page.locator('.sheet #vcd-pk')).toBeVisible();
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
});

test('пресеты: выбор, правка — «изменён», «Сохранить как» — свой, другой и обратно — звук своего', async ({ page, melete, errors }) => {
  await open(page, melete);
  await melete.click('.voice [data-preset="radio"]');
  expect((await vs(page)).cur).toBe('radio');
  expect((await vs(page)).voice.mode).toBe('radio');
  await melete.click('.voice [data-preset="radio"]'); // касание выбранного — настройка
  await page.waitForSelector('.sheet [data-vp="compRatio"]');
  await page.locator('.sheet input[data-vp="compRatio"]').fill('8');
  await page.waitForTimeout(200);
  await expect(page.locator('.voice [data-preset="radio"].dirty')).toHaveCount(1);
  await melete.click('.sheet [data-pa="new"]');
  await page.locator('.sheet [data-pname]').fill('Подкаст');
  await melete.click('.sheet [data-pa="new"]');
  await page.waitForTimeout(200);
  let s = await vs(page);
  expect(s.presets.map((p) => p.name)).toEqual(['Подкаст']);
  expect(s.cur).toBe(s.presets[0].id);
  // эффекты — вкладкой в той же шторке (общая панель приложения)
  await melete.click('.sheet [data-seg="ptab"] [data-v="fx"]');
  await expect(page.locator('.sheet canvas[data-eq]')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await melete.click('.voice [data-preset="speech"]');
  expect((await vs(page)).voice.p.compRatio).not.toBe(8);
  await melete.click('.voice [data-preset="' + s.presets[0].id + '"]');
  s = await vs(page);
  expect(s.voice.p.compRatio).toBe(8);
  expect(errors).toEqual([]);
});

test('запись → метки → дубль → в медиатеку с метками; исходник в памяти', async ({ page, melete, errors }) => {
  await open(page, melete);
  await melete.click('.voice [data-preset="speech"]');
  await melete.click('.voice .vc-bot [data-x="rec"]');
  await page.waitForSelector('.voice [data-x="stop"]', { timeout: 8_000 });
  await page.waitForTimeout(900);
  await melete.click('.voice [data-x="mark"]');
  await page.waitForTimeout(1800); // больше двух секунд — хотя бы один кусок ушёл в IndexedDB
  await melete.click('.voice [data-x="mark"]');
  await expect(page.locator('.voice [data-x="mark"] .vc-mn')).toHaveText('2');
  expect((await vs(page)).liveMarks.marks).toHaveLength(2); // метки сохраняются сразу — сбой их не теряет
  const chunks = await page.evaluate(() => new Promise((res) => { const r = indexedDB.open('melete-voice'); r.onsuccess = () => { const q = r.result.transaction('chunks').objectStore('chunks').count(); q.onsuccess = () => res(q.result); }; r.onerror = () => res(-1); }));
  expect(chunks).toBeGreaterThan(0);
  await melete.click('.voice [data-x="stop"]');
  await page.waitForSelector('.voice #vc-wave', { timeout: 8_000 });
  await melete.click('.voice .vc-bot [data-x="save"]');
  await expect(page.locator('.voice .vc-bot [data-x="save"].done')).toHaveCount(1, { timeout: 15_000 });
  // в медиатеке — запись с двумя метками, и в самом WAV — блок cue
  const rec = await page.evaluate(async () => {
    const r = await new Promise((res) => { const o = indexedDB.open('practice-audio'); o.onsuccess = () => res(o.result); o.onerror = () => res(null); });
    if (!r) return null;
    const names = [...r.objectStoreNames];
    for (const n of names) {
      const all = await new Promise((res) => { const q = r.transaction(n).objectStore(n).getAll(); q.onsuccess = () => res(q.result); q.onerror = () => res([]); });
      const f = all.find((x) => x && String(x.id || '').startsWith('vc') && x.marks);
      if (f) { const u8 = new Uint8Array(await f.blob.arrayBuffer()); let cue = false; for (let i = 44; i < u8.length - 4; i++) if (u8[i] === 99 && u8[i + 1] === 117 && u8[i + 2] === 101 && u8[i + 3] === 32) { cue = true; break; } return { n: f.marks.length, cue }; }
    }
    return null;
  });
  expect(rec).toEqual({ n: 2, cue: true });
  // новая запись → дубль уходит, исходник сохранённого — в «Записях в памяти» (кнопка «Ещё»)
  await melete.click('.voice .vc-bot [data-x="rec"]');
  await page.waitForSelector('.voice [data-x="stop"]', { timeout: 8_000 });
  await page.waitForTimeout(600);
  await melete.click('.voice [data-x="stop"]');
  await page.waitForSelector('.voice #vc-wave', { timeout: 8_000 });
  await melete.click('.voice [data-x="more"]');
  await melete.click('.sheet [data-m="drop"]');
  await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector('.ask [data-ok], .ask .act.danger, .ask button:last-child')?.click());
  await page.waitForSelector('.voice [data-x="insheet"]', { timeout: 8_000 });
  await melete.click('.voice [data-x="more"]');
  await expect(page.locator('.sheet [data-kopen]')).toHaveCount(1);
  expect(errors).toEqual([]);
});

// Выходы (автор 07.11.2026): плашка на главном экране диктофона, все выходы, несколько сразу — звук во все
test('выходы: плашка, несколько сразу, «как в системе» — снять всё', async ({ page, melete, errors }) => {
  await open(page, melete);
  await melete.click('.voice .vc-inrow [data-x="outsheet"]');
  const outs = page.locator('.sheet [data-out]:not([data-out=""])');
  expect(await outs.count()).toBeGreaterThan(1);
  await outs.nth(0).click(); await outs.nth(1).click();
  await page.waitForTimeout(200);
  expect((await vs(page)).outs.length).toBe(2);
  await expect(page.locator('.voice .vc-inrow [data-x="outsheet"] .vc-n')).toHaveText('2');
  await page.locator('.sheet [data-out=""]').click(); await page.waitForTimeout(200);
  expect((await vs(page)).outs).toEqual([]);
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
});
