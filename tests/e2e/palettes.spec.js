// Система цветов в любой палитре (слово автора 21.11.2026): семьи инструментов красятся палитрой, залитая кнопка «Начать занятие» читается (контраст ≥ 4.5) во всех
import { test, expect } from './melete.js';

test.use({ viewport: { width: 390, height: 844 } });
const PALS = ['classic', 'bright', 'pastel', 'neon', 'jewel', 'lunar', 'own'];

const ratio = () => {
  const lum = (c) => { const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map((v) => { v = +v / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const b = document.querySelector('.elgo'), cs = getComputedStyle(b);
  const [a, c] = [lum(cs.backgroundColor), lum(cs.color)].sort((x, y) => y - x);
  return { r: (a + 0.05) / (c + 0.05), bg: cs.backgroundColor, fg: cs.color };
};

for (const pal of PALS) {
  test('палитра ' + pal + ': семьи красятся, кнопка занятия читается', async ({ page, melete, errors }) => {
    await melete.open({ settings: { palette: pal, ownMain: '#B0304A' } });
    await melete.free('F', ['ear']);
    await page.waitForSelector('.elgo');
    const x = await page.evaluate(ratio);
    expect(x.r, pal + ' ' + x.bg + ' / ' + x.fg).toBeGreaterThanOrEqual(4.5);
    // плитка «Тренажёр» и «Теория» — соседние оттенки одной семьи, «Метроном» — другой
    await melete.tab('tools');
    const col = await page.evaluate(() => Object.fromEntries(['metro', 'ear', 'theory', 'tuner', 'drone'].map((id) => [id, getComputedStyle(document.querySelector('.tgrid [data-open-tool="' + id + '"]')).getPropertyValue('--c').trim()])));
    expect(col.tuner).toBe(col.drone); // семья «Звук и высота» — один оттенок
    if (pal !== 'lunar') expect(col.metro).not.toBe(col.ear);
    expect(errors).toEqual([]);
  });
}
