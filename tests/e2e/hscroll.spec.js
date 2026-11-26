// Ни один экран не двигается вбок (слово автора 26.11.2026: медиатека «ехала» влево-вправо): вкладки и все инструменты на узком телефоне —
// ничего не выходит за правый край окна и страница не шире экрана
import { test, expect } from './melete.js';

const scan = (page) => page.evaluate(() => {
  const W = innerWidth, out = [];
  const seen = new Set();
  for (const e of document.querySelectorAll('body *')) {
    const r = e.getBoundingClientRect();
    if (!r.width || !r.height || r.right <= W + 1 || r.left >= W) continue; // не видно или целиком вне экрана (шторки и карусели ждут за краем сознательно)
    const cs = getComputedStyle(e);
    if (cs.visibility === 'hidden' || cs.display === 'none' || cs.position === 'fixed') continue;
    // внутри прокручиваемой полосы (hscroll и т. п.) выход за край нормален
    let p = e.parentElement, inScroll = false;
    while (p && p !== document.body) { const o = getComputedStyle(p).overflowX; if ((o === 'auto' || o === 'scroll' || o === 'hidden') && p.getBoundingClientRect().right <= W + 1) { inScroll = true; break; } p = p.parentElement; }
    if (inScroll) continue;
    const k = (e.className && String(e.className).split(' ')[0]) || e.tagName;
    if (!seen.has(k)) { seen.add(k); out.push(k + ' +' + Math.round(r.right - W)); }
  }
  return { sw: document.documentElement.scrollWidth - W, out: out.slice(0, 5) };
});

for (const w of [360, 413]) {
  test('ничего не выходит за правый край: вкладки и инструменты, ' + w + ' px', async ({ page, melete }) => {
    test.setTimeout(420_000);
    await page.setViewportSize({ width: w, height: 844 });
    const long = 'Очень-длинное-название-песни-которое-не-помещается-в-строку-на-телефоне-ZXR41S';
    await melete.open({ songs: [1, 2, 3].map((i) => ({ id: 's' + i, title: long + i, artist: 'Исполнитель с длинным именем ' + i, currentBpm: 90 + i, targetBpm: 140, key: 'F#', createdAt: Date.now() - i, updatedAt: Date.now(), history: [], tags: [] })) });
    // записи в медиатеке с длинными именами и обложками (экран медиатеки «ехал» вбок именно с файлами)
    await page.evaluate(async (nm) => {
      const { createFiles } = await import('/src/core/files.js'); const { encodeWav } = await import('/src/audio/voicefx.js');
      const f = createFiles(); await f.ready;
      for (let i = 0; i < 4; i++) { const x = new Float32Array(44100 * 2); await f.add({ id: 'h' + i, name: nm + i + '.wav', size: 1, type: 'audio/wav', kind: 'audio', songs: [], created: Date.now() - i, blob: new Blob([encodeWav([x], 44100)], { type: 'audio/wav' }), dur: 2, ana: { pc: 6, bpm: 141, minor: false } }); }
    }, long);
    await page.reload(); await page.waitForTimeout(1200);
    const bad = [];
    const run = async (where) => { await page.waitForTimeout(500); const r = await scan(page); if (r.sw > 1 || r.out.length) bad.push(where + ': ' + (r.sw > 1 ? 'страница шире на ' + r.sw + '; ' : '') + r.out.join(', ')); };
    for (const tab of ['home', 'songs', 'tools']) { await melete.tab(tab); await run(tab); }
    for (const id of await melete.modules()) { await melete.free('F', [id]); await run(id); }
    expect(bad).toEqual([]);
  });
}
