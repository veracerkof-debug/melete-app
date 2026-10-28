// Студия: пауза запоминает место, старт продолжает оттуда, «в начало» сбрасывает; выключение в «Модулях» убирает вкладку
import { test, expect } from './melete.js';

const pos = (page) => page.evaluate(() => document.querySelector('#stpos')?.textContent);

test('пауза и продолжение', async ({ page, melete, errors }) => {
  await melete.open({ settings: { feat: { studio: true } } });
  // проект: одна дорожка пианино, клип на 16 долей
  await page.evaluate(async () => {
    const { newProject, newTrack, newClip, newData } = await import('/src/music/project.js');
    const pr = newProject({ name: 'P', bpm: 120 }); pr.tracks = [newTrack('notes', 0, { name: 'A', inst: 'piano' })]; pr.clips = [];
    const d = newData('notes', 4); for (let i = 0; i < 16; i++) d.notes.push({ t: i, d: 0.5, m: 60 + (i % 5), v: 0.8 });
    pr.clips.push(newClip(pr, pr.tracks[0], 0, 16, d));
    const s = JSON.parse(localStorage.getItem('practice.v1')); s.projects = [pr]; localStorage.setItem('practice.v1', JSON.stringify(s));
  });
  await page.reload(); await page.waitForTimeout(1200);
  await melete.tab('studio');
  await melete.click('[data-open]'); await page.waitForTimeout(600);
  await page.evaluate(() => document.querySelector('.toast')?.remove());
  await melete.click('[data-x="play"]'); await page.waitForTimeout(2600);
  const p1 = await pos(page);
  expect(p1).not.toBe('1.1');
  await melete.click('[data-x="play"]'); await page.waitForTimeout(400);
  expect(await pos(page), 'на паузе — место остановки').toBe(p1);
  await melete.click('[data-x="play"]'); await page.waitForTimeout(300);
  expect(await pos(page), 'старт — с того же места').toBe(p1);
  await page.waitForTimeout(1500);
  expect(await pos(page)).not.toBe(p1);
  await melete.click('[data-x="rewind"]'); await page.waitForTimeout(300);
  expect(await pos(page)).toBe('1.1');
  await melete.click('[data-x="play"]');
  expect(errors).toEqual([]);
});

test('студия выключается в «Модулях и функциях»', async ({ page, melete, errors }) => {
  await melete.open();
  const tabs0 = await page.evaluate(() => [...document.querySelectorAll('.tabbar .tab')].map((x) => x.dataset.tab));
  expect(tabs0).toContain('studio');
  await melete.click('[data-act="panel"]'); await page.waitForTimeout(400);
  await melete.click('[data-pp="feat"]'); await page.waitForTimeout(500);
  await page.evaluate(() => { const c = document.querySelector('[data-feat="studio"]'); c.checked = false; c.dispatchEvent(new Event('change', { bubbles: true })); }); await page.waitForTimeout(500);
  expect(await page.evaluate(() => [...document.querySelectorAll('.tabbar .tab')].map((x) => x.dataset.tab))).not.toContain('studio');
  await page.evaluate(() => { const c = document.querySelector('[data-feat="studio"]'); c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })); }); await page.waitForTimeout(500);
  expect(await page.evaluate(() => [...document.querySelectorAll('.tabbar .tab')].map((x) => x.dataset.tab))).toContain('studio');
  expect(errors).toEqual([]);
});

// Жесты плейлиста (переделка 28.10.2026): касание — выделить, двойное касание — разрезать, пустое — «+», «+» — новая
// партия и редактор, удержание клипа — его шторка, удержать пустое и вести — рамка
test('плейлист: выделение, разрезать, «+», шторка клипа, рамка', async ({ page, melete, errors }) => {
  await melete.open({ settings: { feat: { studio: true } } });
  await page.evaluate(async () => {
    const { newProject, newTrack, newClip, newData } = await import('/src/music/project.js');
    const pr = newProject({ name: 'G', bpm: 120 }); pr.tracks = [newTrack('notes', 0, { name: 'A' }), newTrack('notes', 1, { name: 'B' })]; pr.clips = [];
    const d = newData('notes', 2); d.notes.push({ t: 0, d: 1, m: 60, v: 0.8 }, { t: 5, d: 1, m: 62, v: 0.8 });
    pr.clips.push(newClip(pr, pr.tracks[0], 0, 8, d), newClip(pr, pr.tracks[1], 0, 8, JSON.parse(JSON.stringify(d))));
    const s = JSON.parse(localStorage.getItem('practice.v1')); s.projects = [pr]; localStorage.setItem('practice.v1', JSON.stringify(s));
  });
  await page.reload(); await page.waitForTimeout(1200);
  await melete.tab('studio');
  await melete.click('[data-open]'); await page.waitForTimeout(700);
  await page.evaluate(() => document.querySelector('.toast')?.remove());
  const box = await page.locator('#stpl canvas').boundingBox();
  const pxb = await page.evaluate(() => { const w = document.querySelector('#stpl').getBoundingClientRect().width; return Math.max(10, Math.min(48, (w - 56) / 32)); });
  const at = (beat, row) => ({ x: box.x + 56 + beat * pxb, y: box.y + 30 + row * 64 + 32 });
  const clips = () => page.evaluate(() => JSON.parse(localStorage.getItem('practice.v1')).projects[0].clips.map((c) => [c.tr === JSON.parse(localStorage.getItem('practice.v1')).projects[0].tracks[0].id ? 0 : 1, c.at, c.len, c.start || 0]));
  // касание клипа — выделен, полоса с одним
  let q = at(2, 0); await page.mouse.click(q.x, q.y); await page.waitForTimeout(400);
  expect(await page.evaluate(() => document.querySelector('#stsel:not([hidden]) .stseln')?.textContent)).toBe('1');
  // двойное касание — разрезать в этом месте (сетка — доля)
  q = at(3, 0); await page.mouse.click(q.x, q.y); await page.waitForTimeout(80); await page.mouse.click(q.x, q.y); await page.waitForTimeout(500);
  const cs = (await clips()).filter((c) => c[0] === 0).sort((a, b) => a[1] - b[1]);
  expect(cs.length).toBe(2);
  expect(cs[1][3], 'вторая часть — с того же места куска').toBe(cs[1][1]);
  // пустое место — «+», касание «+» — новая партия и редактор
  q = at(12, 1); await page.mouse.click(q.x, q.y); await page.waitForTimeout(450); await page.mouse.click(q.x, q.y); await page.waitForTimeout(700);
  expect(await page.evaluate(() => !!document.querySelector('.sthead'))).toBe(true);
  await melete.click('[data-x="toSong"]'); await page.waitForTimeout(600);
  // удержание клипа — шторка клипа (по кругу / сплошная)
  q = at(1, 1); await page.mouse.move(q.x, q.y); await page.mouse.down(); await page.waitForTimeout(700); await page.mouse.up(); await page.waitForTimeout(500);
  expect(await page.evaluate(() => !!document.querySelector('[data-seg="celoop"]'))).toBe(true);
  await page.screenshot({ path: process.env.SHOT_SHEET || 'test-results/studio-sheet.png' });
  await page.locator('[data-close]').last().click(); await page.waitForTimeout(600);
  // удержать пустое и вести — рамка выделяет клипы обеих дорожек (от пустого места второй дорожки — к началу первой)
  const a = at(10, 1), b = at(0.5, 0);
  await page.mouse.move(a.x, a.y + 20); await page.mouse.down(); await page.waitForTimeout(650); await page.mouse.move(b.x, b.y - 20, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(400);
  const n = +(await page.evaluate(() => document.querySelector('#stsel:not([hidden]) .stseln')?.textContent || '0'));
  expect(n).toBeGreaterThanOrEqual(3);
  await page.screenshot({ path: process.env.SHOT_SEL || 'test-results/studio-sel.png' });
  expect(errors).toEqual([]);
});

// Аккордовая панель (переделка 28.10.2026): ● — отсчёт и один проход куска; касания плиток ложатся аккордами по долям;
// в конце прохода запись выключается сама
test('аккордовая панель: запись прохода игрой', async ({ page, melete, errors }) => {
  await melete.open({ settings: { feat: { studio: true } } });
  await page.evaluate(async () => {
    const { newProject, newTrack, newClip, newData } = await import('/src/music/project.js');
    const pr = newProject({ name: 'C', bpm: 240 }); pr.tracks = [newTrack('chords', 0, { name: 'Пэд' })]; pr.clips = [];
    pr.clips.push(newClip(pr, pr.tracks[0], 0, 16, newData('chords', 4)));
    const s = JSON.parse(localStorage.getItem('practice.v1')); s.projects = [pr]; localStorage.setItem('practice.v1', JSON.stringify(s));
  });
  await page.reload(); await page.waitForTimeout(1200);
  await melete.tab('studio');
  await melete.click('[data-open]'); await page.waitForTimeout(700);
  await page.evaluate(() => document.querySelector('.toast')?.remove());
  const box = await page.locator('#stpl canvas').boundingBox();
  // удержание клипа — шторка, «Править» — редактор аккордов с панелью
  await page.mouse.move(box.x + 70, box.y + 62); await page.mouse.down(); await page.waitForTimeout(700); await page.mouse.up(); await page.waitForTimeout(500);
  await page.locator('[data-ce="edit"]').click(); await page.waitForTimeout(800);
  expect(await page.locator('.cptile').count()).toBe(9);
  await page.locator('[data-seg="cpbars"] [data-v="4"]').click(); await page.waitForTimeout(400);
  await page.locator('[data-x="live"]').click(); // отсчёт такта (1 с при 240) и проход 4 тактов (4 с)
  await page.waitForTimeout(1150);
  await page.locator('.cptile[data-cp="0"]').click(); await page.waitForTimeout(1000);
  await page.locator('.cptile[data-cp="4"]').click(); await page.waitForTimeout(1000);
  await page.locator('.cptile[data-cp="5"]').click();
  await page.screenshot({ path: process.env.SHOT_PAD || 'test-results/studio-pad.png' });
  await page.waitForTimeout(2600);
  const ch = await page.evaluate(() => JSON.parse(localStorage.getItem('practice.v1')).projects[0].clips[0].data.chords.map((c) => [c.t, c.d, c.pc, c.type]));
  expect(ch.length, JSON.stringify(ch)).toBeGreaterThanOrEqual(3);
  expect(ch.at(-1)[0] + ch.at(-1)[1], 'последний тянется до конца прохода').toBe(16);
  expect(await page.evaluate(() => document.querySelector('[data-x="live"]').classList.contains('on')), 'запись выключилась сама').toBe(false);
  await melete.click('[data-x="play"]');
  expect(errors).toEqual([]);
});

test('запись по петле: предпрокрутка, дубли, punch-in, смена дубля', async ({ page, melete, errors }) => {
  await melete.open({ settings: { feat: { studio: true }, countIn: 0 } });
  await page.evaluate(async () => {
    const { newProject, newTrack, newClip, newData } = await import('/src/music/project.js');
    const pr = newProject({ name: 'L', bpm: 240 }); pr.tracks = [newTrack('notes', 0, { name: 'A', inst: 'piano' }), newTrack('audio', 1, { name: 'Rec' })]; pr.clips = [];
    const d = newData('notes', 4); for (let i = 0; i < 16; i++) d.notes.push({ t: i, d: 0.5, m: 60 + (i % 5), v: 0.8 });
    pr.clips.push(newClip(pr, pr.tracks[0], 0, 16, d));
    pr.region = { a: 4, b: 8 }; // петля в 1 с (при 240)
    const s = JSON.parse(localStorage.getItem('practice.v1')); s.projects = [pr]; s.settings.rec = { src: 'app', mon: false }; localStorage.setItem('practice.v1', JSON.stringify(s));
  });
  await page.reload(); await page.waitForTimeout(1200);
  await melete.tab('studio');
  await melete.click('[data-open]'); await page.waitForTimeout(700);
  await page.evaluate(() => document.querySelector('.toast')?.remove());
  await melete.click('[data-x="rec"]'); await page.waitForTimeout(500);
  await page.locator('[data-go]').click();
  await page.waitForTimeout(1150 + 3300); // такт предпрокрутки, потом три круга с лишним
  await melete.click('[data-x="rec"]'); await page.waitForTimeout(1500);
  const cl = await page.evaluate(() => { const p = JSON.parse(localStorage.getItem('practice.v1')).projects[0]; return p.clips.filter((c) => c.tr === p.tracks[1].id).map((c) => ({ at: c.at, len: c.len, takes: c.data.takes, take: c.data.take, off: c.data.off, loop: c.loop })); });
  expect(cl.length, JSON.stringify(cl)).toBe(1);
  expect(cl[0].at).toBe(4); expect(cl[0].len).toBe(4); expect(cl[0].loop).toBe(false);
  expect(cl[0].takes.length, JSON.stringify(cl)).toBeGreaterThanOrEqual(2);
  expect(cl[0].take).toBe(cl[0].takes.length - 1);
  // второй заход в ту же петлю — прежний клип уступает место (punch-in), один клип
  await page.evaluate(() => document.querySelector('.toast')?.remove());
  await melete.click('[data-x="rec"]'); await page.waitForTimeout(500);
  await page.locator('[data-go]').click();
  await page.waitForTimeout(1150 + 1400);
  await melete.click('[data-x="rec"]'); await page.waitForTimeout(1500);
  const n = await page.evaluate(() => { const p = JSON.parse(localStorage.getItem('practice.v1')).projects[0]; return p.clips.filter((c) => c.tr === p.tracks[1].id && c.at < 8 && c.at + c.len > 4).length; });
  expect(n).toBe(1);
  expect(errors).toEqual([]);
});

test('партия из записи игры: MIDI из медиатеки → клип нот', async ({ page, melete, errors }) => {
  await melete.open({ settings: { feat: { studio: true } } });
  await page.evaluate(async () => {
    const { createFiles } = await import('/src/core/files.js'); const { writeMidi } = await import('/src/music/midi.js');
    const f = createFiles(); await f.ready;
    const ev = [{ t: 0.3, k: 'on', id: 'a', m: 60, v: 0.8 }, { t: 0.8, k: 'off', id: 'a' }, { t: 1.3, k: 'on', id: 'b', m: 64.4, v: 0.8 }, { t: 2.1, k: 'off', id: 'b' }];
    const u8 = writeMidi(ev, { name: 'G' });
    await f.add({ id: 'm1', name: 'Глайдер.mid', size: u8.length, type: 'audio/midi', kind: 'midi', tool: 'glider', songs: [], created: Date.now(), blob: new Blob([u8], { type: 'audio/midi' }), take: { v: 1, ev }, dur: 2.1 });
    const { newProject, newTrack } = await import('/src/music/project.js');
    const pr = newProject({ name: 'T', bpm: 120 }); pr.tracks = [newTrack('notes', 0, { name: 'A', inst: 'piano' })]; pr.clips = [];
    const s = JSON.parse(localStorage.getItem('practice.v1')); s.projects = [pr]; localStorage.setItem('practice.v1', JSON.stringify(s));
  });
  await page.reload(); await page.waitForTimeout(1200);
  await melete.tab('studio');
  await melete.click('[data-open]'); await page.waitForTimeout(700);
  await page.evaluate(() => document.querySelector('.toast')?.remove());
  const box = await page.locator('#stpl canvas').boundingBox();
  await page.mouse.move(box.x + 200, box.y + 62); await page.mouse.down(); await page.waitForTimeout(800); await page.mouse.up(); await page.waitForTimeout(500);
  await page.getByText('Из записи игры').click(); await page.waitForTimeout(500);
  await page.locator('[data-take="m1"]').click(); await page.waitForTimeout(700);
  const cl = await page.evaluate(() => JSON.parse(localStorage.getItem('practice.v1')).projects[0].clips.map((c) => c.data.notes.map((n) => [n.t, n.m])));
  expect(cl).toEqual([[[0, 60], [2, 64]]]);
  expect(errors).toEqual([]);
});

test('свой инструмент в студии: пианино под роллом, игра пишется в клип', async ({ page, melete, errors }) => {
  await melete.open({ settings: { feat: { studio: true }, countIn: 0 } });
  await page.evaluate(async () => {
    const { newProject, newTrack, newClip, newData } = await import('/src/music/project.js');
    const pr = newProject({ name: 'P', bpm: 120 }); pr.tracks = [newTrack('notes', 0, { name: 'A', inst: 'piano' })]; pr.clips = [];
    pr.clips.push(newClip(pr, pr.tracks[0], 0, 8, newData('notes', 2)));
    const s = JSON.parse(localStorage.getItem('practice.v1')); s.projects = [pr]; s.settings.help = { piano: 1 }; localStorage.setItem('practice.v1', JSON.stringify(s));
  });
  await page.reload(); await page.waitForTimeout(1200);
  await melete.tab('studio');
  await melete.click('[data-open]'); await page.waitForTimeout(700);
  await page.evaluate(() => document.querySelector('.toast')?.remove());
  const box = await page.locator('#stpl canvas').boundingBox();
  await page.mouse.move(box.x + 70, box.y + 62); await page.mouse.down(); await page.waitForTimeout(700); await page.mouse.up(); await page.waitForTimeout(500);
  await page.locator('[data-ce="edit"]').click(); await page.waitForTimeout(800);
  await page.locator('[data-x="tool"]').click(); await page.waitForTimeout(400);
  await page.getByText('Пианино', { exact: true }).click(); await page.waitForTimeout(1500);
  await page.evaluate(() => document.querySelectorAll('.helpcard, .fhelp, .sheet').forEach((x) => x.querySelector('[data-close], .snav button')?.click()));
  expect(await melete.count('.sttool .kb [data-m]')).toBeGreaterThan(5);
  await page.locator('[data-x="live"]').click(); await page.waitForTimeout(2300); // запись: отсчёт такта, потом клип по кругу
  const key = page.locator('.sttool .kb [data-m="60"]');
  for (let i = 0; i < 3; i++) { await key.dispatchEvent('pointerdown', { pointerId: 7, bubbles: true }); await page.waitForTimeout(250); await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 7 }))); await page.waitForTimeout(250); }
  const n = await page.evaluate(() => JSON.parse(localStorage.getItem('practice.v1')).projects[0].clips[0].data.notes.length);
  expect(n).toBeGreaterThanOrEqual(2);
  await page.locator('[data-x="toSong"]').click(); await page.waitForTimeout(400);
  expect(await melete.count('.sttool')).toBe(0);
  await melete.click('[data-x="play"]');
  expect(errors).toEqual([]);
});
