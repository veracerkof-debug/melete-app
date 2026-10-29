// Волна громкости (тремоло, автор 29.10.2026): ровный сигнал через цепочку эффектов «на бумаге» — громкость
// проседает столько раз в секунду, сколько задано: свободно в Гц или в такт метронома (120 ударов, восьмые — 4 Гц)
import { test, expect } from './melete.js';

test('тремоло: сила, форма, частота свободно и в такт', async ({ page, melete, errors }) => {
  await melete.open();
  const res = await page.evaluate(async () => {
    const fx = await import('/src/audio/fx.js');
    fx.setFxTempo(() => 120);
    const dips = async (patch) => {
      const sr = 8000, c = new OfflineAudioContext(1, sr * 2, sr);
      const src = c.createConstantSource(), ch = fx.createFxChain(c, { ...fx.FX_DEF(), trem: 1, ...patch }, { space: () => null });
      src.connect(ch.input); ch.output.connect(c.destination); src.start();
      const d = (await c.startRendering()).getChannelData(0).slice(sr / 2); // первые 0,5 с — разгон
      let n = 0, lo = false, min = 1, max = 0;
      for (let i = 0; i < d.length; i++) { const v = d[i]; min = Math.min(min, v); max = Math.max(max, v); if (!lo && v < 0.3) { lo = true; n++; } else if (lo && v > 0.7) lo = false; }
      return { n, min: Math.round(min * 100) / 100, max: Math.round(max * 100) / 100 };
    };
    return { free3: await dips({ tremRate: 3 }), sync8: await dips({ tremDiv: '8' }), pulse: await dips({ tremRate: 2, tremShape: 'pulse' }), half: await dips({ trem: 0.4, tremRate: 3 }) };
  });
  expect(res.free3.n).toBeGreaterThanOrEqual(4); // 1,5 с × 3 Гц ≈ 4–5 провалов
  expect(res.free3.n).toBeLessThanOrEqual(5);
  expect(res.sync8.n).toBeGreaterThanOrEqual(5); // 120 ударов, восьмые — 4 Гц: ≈ 6
  expect(res.sync8.n).toBeLessThanOrEqual(7);
  expect(res.pulse.n).toBeGreaterThanOrEqual(2);
  expect(res.half.min).toBeGreaterThan(0.5); // сила 40 % — громкость не падает ниже 60 %
  expect(res.free3.max).toBeLessThanOrEqual(1.01); // волна не поднимает громкость выше исходной
  expect(errors).toEqual([]);
});
