// Хозяин микрофона (слово автора 22.11.2026): идёт запись диктофона — другой инструмент микрофон не получает, показывается
// большая надпись, а запись продолжается; вторая запись поверх — только с вопросом.
import { test, expect } from './melete.js';

test('запись диктофона не прерывается: тюнер получает «занято», надпись; вторая запись спрашивает', async ({ page, melete, errors }) => {
  await melete.open({ tools: { voice: { autoSave: false } } });
  await melete.tab('tools');
  await melete.click('[data-open-tool="voice"]');
  await page.waitForSelector('.voice .vc-bot', { timeout: 10_000 });
  await melete.click('.voice .vc-bot [data-x="rec"]');
  await page.waitForSelector('.voice [data-x="stop"]', { timeout: 8_000 });
  // другой инструмент пробует открыть микрофон
  const r = await page.evaluate(async () => {
    const { openMic } = await import('/src/audio/mic.js');
    try { await openMic('music'); return 'opened'; } catch (e) { return e.reason + ':' + e.by; }
  });
  expect(r).toBe('busy:voice');
  await expect(page.locator('.ask .alert')).toContainText('Диктофон'); // большая надпись: идёт запись в «Диктофон»
  await page.click('.ask [data-k="ok"]');
  await page.waitForTimeout(1500);
  await expect(page.locator('.voice [data-x="stop"]')).toHaveCount(1); // запись идёт
  // вторая запись (студия) поверх — только по вопросу; «нет» — диктофон пишет дальше
  const ans = await page.evaluate(async () => {
    const M = await import('/src/audio/micowner.js');
    const q = M.recBeginAsk('studio', async () => false);
    await new Promise((res) => setTimeout(res, 100));
    document.querySelector('.ask'); // ask подменён: вопрос не показывался
    return (await q).ok + ':' + M.recBy().who;
  });
  expect(ans).toBe('false:voice');
  await melete.click('.voice [data-x="stop"]');
  await page.waitForSelector('.voice #vc-wave', { timeout: 8_000 });
  const free = await page.evaluate(async () => (await import('/src/audio/micowner.js')).recBy());
  expect(free).toBe(null); // после остановки микрофон свободен
  void errors;
});

// Звонок/чужое приложение: вход замолчал — запись не останавливается, метка и предупреждение; звук вернулся — метка и снятие
test('диктофон: вход замолчал — запись идёт, метки «замолчал» и «вернулся»', async ({ page, melete, errors }) => {
  await page.addInitScript(() => {
    const g = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (c) => { const s = await g(c); (window.__streams = window.__streams || []).push(s); return s; };
  });
  await melete.open({ tools: { voice: { autoSave: false } } });
  await melete.tab('tools');
  await melete.click('[data-open-tool="voice"]');
  await page.waitForSelector('.voice .vc-bot', { timeout: 10_000 });
  await melete.click('.voice .vc-bot [data-x="rec"]');
  await page.waitForSelector('.voice [data-x="stop"]', { timeout: 8_000 });
  await page.waitForTimeout(800);
  const setOn = (on) => page.evaluate((on) => window.__streams.forEach((s) => s.getAudioTracks().forEach((t) => { t.enabled = on; })), on);
  await setOn(false);
  await expect(page.locator('.voice')).toContainText('Вход молчит', { timeout: 9_000 });
  await expect(page.locator('.voice [data-x="stop"]')).toHaveCount(1); // запись идёт
  await setOn(true);
  await page.waitForTimeout(1500);
  const marks = await page.evaluate(() => JSON.parse(localStorage.getItem('practice.v1.tools')).voice.liveMarks.marks.map((m) => m.name));
  expect(marks).toEqual(['Вход замолчал', 'Звук вернулся']);
  await melete.click('.voice [data-x="stop"]');
  await page.waitForSelector('.voice #vc-wave', { timeout: 8_000 });
  void errors;
});
