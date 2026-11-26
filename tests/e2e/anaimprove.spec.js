// «Улучшить разбор» (слово автора 26.11.2026): кнопка «ИИ» в виде «Аккорды», сжатая сводка по тактам, правки по номерам тактов,
// пометки «от ИИ» у аккордов и частей, гипотезы отдельно, откат возвращает как было
import { test, expect } from './melete.js';

const seed = async (page, melete) => {
  await melete.open({ settings: { autoStems: 'off', autoAna: false } });
  await page.evaluate(async () => {
    const { createFiles } = await import('/src/core/files.js'); const { encodeWav } = await import('/src/audio/voicefx.js');
    const f = createFiles(); await f.ready;
    const SR = 44100, D = 40, N = SR * D, x = new Float32Array(N); for (let i = 0; i < N; i++) x[i] = 0.2 * Math.sin((2 * Math.PI * 220 * i) / SR);
    const bpm = 96, b = 60 / bpm, beats = [], downbeats = []; for (let t = 0.2; t < D; t += b) { beats.push(+t.toFixed(3)); if (beats.length % 4 === 1) downbeats.push(+t.toFixed(3)); }
    const prog = ['C', 'G', 'A:min', 'F', 'D:min7', 'G:7', 'C', 'C:maj7', 'A:min7', 'E:7'];
    const chords = []; for (let i = 0; i * 4 < beats.length; i++) { const t0 = beats[i * 4], t1 = beats[i * 4 + 4] ?? D; chords.push({ t: t0, d: +(t1 - t0).toFixed(2), c: prog[i % prog.length] }); }
    await f.add({ id: 'r1', name: 'Song - Official Video.wav', size: 1, type: 'audio/wav', kind: 'audio', songs: [], marks: [{ t: 0.2, name: 'Вступление' }], created: Date.now(), blob: new Blob([encodeWav([x], SR)], { type: 'audio/wav' }),
      ana: { pc: 0, minor: false, bpm, bpb: 4, beats, downbeats, chords, v: 3, at: Date.now() } });
  });
  await melete.free('F', ['audio']);
  await melete.click('[data-x="mlplay"][data-id="r1"]'); await page.waitForTimeout(1000);
  await melete.click('[data-x="mlopen"]'); await page.waitForTimeout(600);
  await melete.click('[data-x="apv"][data-v="chords"]'); await page.waitForTimeout(600);
};
const rec = (page) => page.evaluate(async () => { const { createFiles } = await import('/src/core/files.js'); const f = createFiles(); await f.ready; const r = f.get('r1'); return JSON.parse(JSON.stringify({ ana: r.ana, marks: r.marks, ai: r.ai || null })); });

const REPLY = 'Привёл в порядок.\n```melete-rec\n' + JSON.stringify([
  { op: 'barchords', ref: 'r1', items: [{ bar: 1, c: 'Cmaj7' }, { bar: 2, c: 'G6 G' }] },
  { op: 'parts', ref: 'r1', items: [{ bar: 1, name: 'Вступление' }, { bar: 5, name: 'Куплет' }, { bar: 9, name: 'Припев' }] },
  { op: 'meta', ref: 'r1', title: 'Song', artist: 'Артист', instruments: ['гитара', 'бас', 'ударные'], note: 'по названию, проверьте' },
  { op: 'check', ref: 'r1', tempo: 'ok', key: 'C', confidence: 0.8 },
]) + '\n```';

test('«Улучшить разбор»: сводка по тактам, правки по тактам, пометки «от ИИ», откат', async ({ page, melete, errors }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  await seed(page, melete);
  await expect(page.locator('.aitag')).toHaveCount(0); // пока ИИ ничего не правил — пометок нет
  const before = await rec(page);
  await page.locator('[data-x="aimprove"]').click(); await page.waitForTimeout(500);
  await expect(page.locator('.alert, .ask').first()).toContainText('разбор записи');
  await page.getByRole('button', { name: 'Разрешить' }).click(); await page.waitForTimeout(700);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('melete.ai')).access.media)).toBe('write');
  await expect(page.locator('[data-ai="chip"]')).toHaveCount(5);
  if (process.env.SHOTDIR) await page.screenshot({ path: process.env.SHOTDIR + '/ana-chat.png' });
  await page.locator('[data-ai="chip"]').first().click();
  await expect(page.locator('[data-aiin]')).toHaveValue(/barchords/);
  // запрос для копирования: сводка по тактам вместо секунд, без звука и текстов
  await page.locator('[data-ai="copyprompt"]').click(); await page.waitForTimeout(400);
  const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
  if (clip) { expect(clip).toContain('ИЗМЕРЕНО программой'); expect(clip).toContain('АККОРДЫ ПО ТАКТАМ'); expect(clip).toContain('такт 1:'); expect(clip).toContain('barchords'); expect(clip).not.toContain('sk-'); }
  // вставка ответа → карточка → применить
  await page.locator('[data-ai="paste"]').click(); await page.waitForTimeout(300);
  await page.locator('[data-pta]').fill(REPLY); await page.locator('[data-pgo]').click(); await page.waitForTimeout(500);
  const card = page.locator('.aip.pend'); await expect(card).toContainText('от ИИ'); await expect(card).toContainText('гипотеза ИИ');
  await page.locator('[data-ai="apply"]').click(); await page.waitForTimeout(1500);
  const r = await rec(page);
  expect(r.ana.cai).toBeTruthy(); expect(r.ana.cauto.length).toBe(before.ana.chords.length); expect(r.ana.chords[0].c).toBe('C:maj7');
  expect(r.marks.find((m) => m.name === 'Куплет')).toMatchObject({ ai: true }); expect(r.marks.find((m) => m.name === 'Вступление').ai).toBe(true);
  expect(r.ai).toMatchObject({ by: 'ai', title: 'Song', instruments: ['гитара', 'бас', 'ударные'] }); expect(r.ana.bpm).toBe(before.ana.bpm);
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  // пометки видны: у аккордов, гипотеза под видом аккордов
  if (process.env.SHOTDIR) await page.screenshot({ path: process.env.SHOTDIR + '/ana-view.png' });
  await expect(page.locator('.chtools .aitag')).toHaveCount(1); await expect(page.locator('.ainote')).toContainText('гитара');
  // откат из чата возвращает всё как было
  await page.locator('[data-x="aimprove"]').click(); await page.waitForTimeout(700);
  await page.locator('[data-ai="undo"]').click(); await page.waitForTimeout(1200);
  const u = await rec(page);
  expect(u.ana.cai).toBeUndefined(); expect(u.ai).toBeNull(); expect(u.marks).toEqual(before.marks); expect(u.ana.chords).toEqual(before.ana.chords);
  expect(errors).toEqual([]);
});
