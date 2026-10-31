// Лупер, вид «Партии» (30.10.2026): партия ударных в петле, правка в шторке, петля по тактам, вкл/выкл с начала такта
import { test, expect } from './melete.js';

test('партии: ударные в петле, правка, вкл/выкл с такта', async ({ page, melete, errors }) => {
  await melete.open({ tools: { looper: { metro: false, view: 'parts', bars: 4 } } });
  await melete.free('F', ['looper']);
  await expect(page.locator('.lpwrap.parts')).toHaveCount(1);
  await melete.click('[data-x="padd"]'); await page.waitForTimeout(500);
  await page.locator('.hmenu button').first().click(); await page.waitForTimeout(1500);
  await expect(page.locator('.lpped .stwrap')).toHaveCount(1); // редактор ударных в шторке
  await page.locator('.lpped .rack [data-step], .lpped .rack button').first().click().catch(() => {});
  await page.keyboard.press('Escape'); await page.waitForTimeout(600);
  await expect(page.locator('.lprow[data-tr]')).toHaveCount(1);
  await melete.click('[data-x="main"]'); await page.waitForTimeout(800); // петля играет, партия — в такт
  const playing = await page.evaluate(() => document.querySelector('[data-x="main"]')?.getAttribute('aria-label'));
  expect(playing).toBeTruthy();
  await page.locator('.lprow[data-tr] .lprn').click(); await page.waitForTimeout(200);
  await expect(page.locator('.lprow[data-tr].pend')).toHaveCount(1); // выключится с начала такта
  await page.waitForTimeout(3200);
  await expect(page.locator('.lprow[data-tr].off')).toHaveCount(1);
  await melete.click('[data-x="stop"]');
  expect(errors).toEqual([]);
});

test('партии: игра на MIDI-клавиатуре — новая партия', async ({ page, melete, errors }) => {
  await melete.open({ tools: { looper: { metro: false, view: 'parts', bars: 4 } } });
  await melete.free('F', ['looper']);
  await melete.click('[data-x="main"]'); await page.waitForTimeout(500); // петля 4 такта (90 bpm ≈ 10,7 с)
  await melete.click('[data-x="padd"]'); await page.waitForTimeout(400);
  await page.locator('.hmenu button').nth(3).click(); await page.waitForTimeout(300);
  await expect(page.locator('.lpcap')).toHaveCount(1);
  // ждём начала круга и играем три ноты через MIDI-вход лупера
  await page.waitForFunction(() => !document.querySelector('.lpcap.wait'), null, { timeout: 15000 });
  await page.evaluate(async () => {
    const m = (await import('/src/modules/looper/index.js')).default;
    for (const [i, n] of [60, 64, 67].entries()) { m.midiIn({ k: 'on', id: 'k' + i, m: n, v: 0.8 }); await new Promise((r) => setTimeout(r, 300)); m.midiIn({ k: 'off', id: 'k' + i }); }
  });
  await melete.click('[data-x="capstop"]'); await page.waitForTimeout(400);
  await expect(page.locator('.lprow[data-tr]')).toHaveCount(1);
  await melete.click('[data-x="stop"]');
  expect(errors).toEqual([]);
});

test('партии: запись с микрофона по кругам — дубли, листать и удалить', async ({ page, melete, errors }) => {
  await melete.open({ settings: { metro: { bpm: 240, num: 4, den: 4, sub: 1 } }, tools: { looper: { metro: false, view: 'parts', bars: 4 } } });
  await melete.free('F', ['looper']);
  await melete.click('[data-x="main"]'); await page.waitForTimeout(600); // петля 4 такта по 240 — 4 с
  await melete.click('[data-x="main"]'); await page.waitForTimeout(9000); // три круга записи
  await melete.click('[data-x="main"]'); await page.waitForTimeout(500);
  const tk = await page.locator('.lptkb').textContent().catch(() => '');
  test.info().annotations.push({ type: 'takes', description: tk });
  expect(tk).toMatch(/^\d\/[2-9]$/);
  const n = +tk.split('/')[1];
  await page.locator('.lptkb').click(); await page.waitForTimeout(200); // следующий по кругу: последний → первый
  expect(await page.locator('.lptkb').textContent()).toBe('1/' + n);
  await melete.hold('.lprow.layer'); await page.waitForTimeout(300);
  await page.locator('.hmenu button').first().click(); await page.waitForTimeout(300);
  const after = await page.locator('.lptkb').textContent({ timeout: 1000 }).catch(() => '');
  expect(n === 2 ? after === '' : after.endsWith('/' + (n - 1))).toBe(true);
  await melete.click('[data-x="stop"]');
  expect(errors).toEqual([]);
});

test('«В лупер»: проект — партиями, дорожки записи — слоями, в свободную петлю', async ({ page, melete, errors }) => {
  await melete.open({ tools: { looper: { metro: false, view: 'ring', inbox: { kind: 'proj', pid: 'pjin', temp: true } } } });
  await page.evaluate(async () => {
    const { newProject, newTrack, newClip, newData } = await import('/src/music/project.js');
    const pr = newProject({ name: 'Из MIDI', bpm: 100 }); pr.id = 'pjin'; pr.tracks = [newTrack('notes', 0), newTrack('drums', 1)]; pr.clips = [];
    const d = newData('notes', 2); d.notes.push({ t: 0, d: 1, m: 60, v: 0.8 }); pr.clips.push(newClip(pr, pr.tracks[0], 0, 8, d));
    const dr = newData('drums', 1); dr.steps = { kick: [0, 8] }; pr.clips.push(newClip(pr, pr.tracks[1], 0, 4, dr));
    const s = JSON.parse(localStorage.getItem('practice.v1')); s.projects = [pr]; localStorage.setItem('practice.v1', JSON.stringify(s));
    // запись для «дорожек»: 3 с синуса в медиатеке
    const sr = 44100, n = sr * 3, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf), w = (o, x) => [...x].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.round(Math.sin(i / sr * 2 * Math.PI * 220) * 8000), true);
    const { createFiles } = await import('/src/core/files.js'); const F = createFiles(); await F.ready;
    await F.add({ id: 'stemA', name: 'Вокал.wav', kind: 'audio', type: 'audio/wav', size: buf.byteLength, created: Date.now(), dur: 3, blob: new Blob([buf], { type: 'audio/wav' }) });
  });
  await page.reload(); await page.waitForTimeout(1200);
  await melete.free('F', ['looper']); await page.waitForTimeout(800);
  await expect(page.locator('.lpwrap.parts')).toHaveCount(1); // присланное открывает «Партии»
  await expect(page.locator('.lprow[data-tr]')).toHaveCount(2);
  const left = await page.evaluate(() => JSON.parse(localStorage.getItem('practice.v1')).projects.filter((p) => !p.deleted).map((p) => p.id + ':' + !!p.looper));
  expect(left.some((x) => x === 'pjin:true')).toBe(false); // присланный — временный, в лупере — своя копия
  // дорожки — в следующую свободную петлю
  await page.evaluate(async () => { const m = (await import('/src/modules/looper/index.js')).default; void m; });
  await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('practice.v1.tools')); d.looper.inbox = { kind: 'stems', ids: ['stemA'], bpm: 120, off: 0 }; localStorage.setItem('practice.v1.tools', JSON.stringify(d)); });
  await page.reload(); await page.waitForTimeout(1200);
  await page.evaluate(() => document.querySelector('[data-act="free"]')?.click()); await page.waitForTimeout(2500);
  await expect(page.locator('.lprow.layer')).toHaveCount(1);
  await expect(page.locator('.lpslot.on')).toHaveText('2'); // в первой — партии (сохранены), дорожки — во вторую
  expect(errors).toEqual([]);
});
