// Звуки General MIDI (банк SONiVOX): банк разбирается, голос звучит (офлайн), дорожка студии играет без ошибок
import { test, expect } from './melete.js';

test('GM: банк, голос, ударные, отпускание', async ({ page, melete, errors }) => {
  await melete.open();
  const r = await page.evaluate(async () => {
    const { loadGM, createGM, programName, kitName, DRUM_NOTES } = await import('/src/audio/gm.js');
    await loadGM();
    const c = new OfflineAudioContext(1, 44100 * 2, 44100), gm = createGM();
    gm.on(c, 33 + 12, 'a', { program: 33, out: c.destination, vel: 0.9, at: 0.05, dur: 0.6 }); // бас
    gm.on(c, DRUM_NOTES.snare, 'b', { drums: 0, out: c.destination, vel: 0.9, at: 1.0 });
    const buf = await c.startRendering(), d = buf.getChannelData(0);
    const rms = (a, b) => { let s = 0; for (let i = Math.floor(a * 44100); i < b * 44100; i++) s += d[i] * d[i]; return Math.sqrt(s / ((b - a) * 44100)); };
    return { names: [programName(0), programName(33), kitName(0)], bass: rms(0.1, 0.5), tail: rms(0.85, 0.98), snare: rms(1.0, 1.15) };
  });
  expect(r.names[0]).toBeTruthy();
  expect(r.bass, JSON.stringify(r)).toBeGreaterThan(0.01);
  expect(r.tail, 'отпущено вовремя').toBeLessThan(r.bass / 4);
  expect(r.snare).toBeGreaterThan(0.01);
  expect(errors).toEqual([]);
});

test('GM: дорожка студии с инструментом GM и набором ударных играет', async ({ page, melete, errors }) => {
  await melete.open({ settings: { feat: { studio: true } } });
  await page.evaluate(async () => {
    const { newProject, newTrack, newClip, newData } = await import('/src/music/project.js');
    const pr = newProject({ name: 'G', bpm: 140 }); pr.tracks = [newTrack('notes', 0, { name: 'Bass', inst: 'gm', gm: 33 }), newTrack('drums', 1, { name: 'Dr', gmKit: 0 })]; pr.clips = [];
    const d = newData('notes', 2); for (let i = 0; i < 8; i++) d.notes.push({ t: i, d: 0.5, m: 40 + (i % 3), v: 0.8 });
    pr.clips.push(newClip(pr, pr.tracks[0], 0, 8, d));
    const dr = newData('drums', 1); dr.steps = { kick: [0, 8], snare: [4, 12] }; pr.clips.push(newClip(pr, pr.tracks[1], 0, 8, dr));
    const s = JSON.parse(localStorage.getItem('practice.v1')); s.projects = [pr]; localStorage.setItem('practice.v1', JSON.stringify(s));
  });
  await page.reload(); await page.waitForTimeout(1200);
  await melete.tab('studio');
  await melete.click('[data-open]'); await page.waitForTimeout(700);
  await melete.click('[data-x="play"]'); await page.waitForTimeout(3000);
  expect(await page.evaluate(() => document.querySelector('#stpos')?.textContent)).not.toBe('1.1');
  await melete.click('[data-x="play"]');
  expect(errors).toEqual([]);
});
