// Студия: запись → другая скорость или высота офлайн (src/audio/stretchrender.js) — длительность и частота тона
import { test, expect } from '@playwright/test';
test('офлайн-растяжение: высота и длительность', async ({ page }) => {
  await page.goto('/');
  const r = await page.evaluate(async () => {
    const { stretchRender } = await import('/src/audio/stretchrender.js');
    const sr = 44100, n = sr * 2, b = new AudioBuffer({ numberOfChannels: 2, length: n, sampleRate: sr });
    const d = new Float32Array(n); for (let i = 0; i < n; i++) d[i] = 0.5 * Math.sin(2 * Math.PI * 440 * i / sr);
    b.copyToChannel(d, 0); b.copyToChannel(d, 1);
    const freq = (x) => { // нули по середине
      let z = 0, a = Math.floor(x.length * 0.3), e = Math.floor(x.length * 0.7);
      for (let i = a + 1; i < e; i++) if (x[i - 1] <= 0 && x[i] > 0) z++;
      return z / ((e - a) / sr);
    };
    const t0 = performance.now();
    const o1 = await stretchRender(b, { rate: 0.5, semi: 0 }), o2 = await stretchRender(b, { rate: 1, semi: 12 });
    return { d1: o1.duration, f1: freq(o1.getChannelData(0)), d2: o2.duration, f2: freq(o2.getChannelData(0)), ms: performance.now() - t0, peak: Math.max(...o2.getChannelData(0).slice(20000, 40000).map(Math.abs)) };
  });
  expect(r.d1).toBeCloseTo(4, 1);
  expect(Math.abs(r.f1 - 440)).toBeLessThan(10);
  expect(r.d2).toBeCloseTo(2, 1);
  expect(Math.abs(r.f2 - 880)).toBeLessThan(15);
});
