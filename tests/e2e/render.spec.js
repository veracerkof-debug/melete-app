// Сведение «на бумаге»: проект считается быстрее реального времени тем же кодом; ноты на своих местах, все виды
// дорожек звучат, стем — только своя дорожка; из студии — файл в медиатеке
import { test, expect } from './melete.js';

const seed = () => (async () => {
  const { newProject, newTrack, newClip, newData } = await import('/src/music/project.js');
  const pr = newProject({ name: 'R', bpm: 120 }); // доля — 0,5 с
  pr.tracks = [newTrack('notes', 0, { name: 'Keys', inst: 'fmep' }), newTrack('notes', 1, { name: 'Bass', inst: 'gm', gm: 33 }), newTrack('drums', 2, { name: 'Dr' })];
  pr.clips = [];
  const d = newData('notes', 2); d.notes.push({ t: 4, d: 1, m: 69, v: 0.9 }); pr.clips.push(newClip(pr, pr.tracks[0], 0, 8, d));
  const b = newData('notes', 2); b.notes.push({ t: 0, d: 2, m: 40, v: 0.9 }); pr.clips.push(newClip(pr, pr.tracks[1], 0, 8, b));
  const dr = newData('drums', 2); dr.steps = { kick: [16] }; pr.clips.push(newClip(pr, pr.tracks[2], 0, 8, dr)); // удар на доле 4 (2 с)
  return pr;
})();

test('на бумаге: быстрее реального времени, места нот и стем', async ({ page, melete, errors }) => {
  await melete.open();
  const r = await page.evaluate(async (seedSrc) => {
    const pr = await (0, eval)(seedSrc);
    const { renderProject } = await import('/src/audio/render.js');
    let buf0; try { buf0 = await renderProject(pr); } catch (e) { return { err: e.stack }; }
    const t0 = performance.now(), buf = buf0, ms = performance.now() - t0, d = buf.getChannelData(0), sr = buf.sampleRate;
    const rms = (a, b) => { let s = 0; for (let i = Math.floor(a * sr); i < Math.min(d.length, b * sr); i++) s += d[i] * d[i]; return Math.sqrt(s / ((b - a) * sr)); };
    const solo = JSON.parse(JSON.stringify(pr)); solo.tracks.forEach((t) => { t.solo = t.name === 'Keys'; });
    const sb = await renderProject(solo), sd = sb.getChannelData(0);
    const srms = (a, b) => { let s = 0; for (let i = Math.floor(a * sr); i < b * sr; i++) s += sd[i] * sd[i]; return Math.sqrt(s / ((b - a) * sr)); };
    return { dur: buf.duration, ms, bass: rms(0.1, 0.9), keys: rms(2.06, 2.4), soloBefore: srms(0.1, 1.9), soloKeys: srms(2.06, 2.4) };
  }, seed.toString().replace(/^\(\) => /, ''));
  expect(r.err).toBeUndefined();
  expect(r.dur).toBeGreaterThan(4); // 8 долей (4 с) + хвост
  expect(r.ms, 'быстрее реального времени').toBeLessThan(r.dur * 1000);
  expect(r.bass, JSON.stringify(r)).toBeGreaterThan(0.005);
  expect(r.keys).toBeGreaterThan(0.005);
  expect(r.soloBefore, 'стем: чужие дорожки молчат').toBeLessThan(0.002);
  expect(r.soloKeys).toBeGreaterThan(0.005);
  expect(errors).toEqual([]);
});

test('студия: «Свести в WAV» — на бумаге, файл в медиатеке', async ({ page, melete, errors }) => {
  await melete.open({ settings: { feat: { studio: true } } });
  await page.evaluate(async (seedSrc) => {
    const pr = await (0, eval)(seedSrc);
    const s = JSON.parse(localStorage.getItem('practice.v1')); s.projects = [pr]; localStorage.setItem('practice.v1', JSON.stringify(s));
  }, seed.toString().replace(/^\(\) => /, ''));
  await page.reload(); await page.waitForTimeout(1200);
  await melete.tab('studio');
  await melete.click('[data-open]'); await page.waitForTimeout(700);
  await melete.click('[data-x="settings"]'); await page.waitForTimeout(500);
  await melete.click('[data-x2="export"]'); await page.waitForTimeout(700);
  const t0 = Date.now();
  await page.getByText('Свести в WAV').click();
  const f = await page.evaluate(async () => {
    const { createFiles } = await import('/src/core/files.js');
    for (let i = 0; i < 150; i++) { const x = createFiles(); await x.ready; const r = x.list('audio').find((q) => /R — /.test(q.name)); if (r) return { dur: r.dur, name: r.name }; await new Promise((ok) => setTimeout(ok, 100)); }
    return { dur: 0 };
  });
  const took = Date.now() - t0;
  expect(f.dur).toBeGreaterThan(4);
  expect(took, 'быстрее, чем звучит песня с хвостом').toBeLessThan(f.dur * 1000 + 1500);
  expect(errors).toEqual([]);
});
