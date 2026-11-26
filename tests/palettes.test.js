import { describe, it, expect } from 'vitest';
import { PALETTES, HUES, TOOL_HUE, TOOL_FAMILY, registerTools, paintTools, accentVars, onColor } from '../src/core/palettes.js';

describe('палитры', () => {
  it('в каждой палитре есть все оттенки', () => {
    Object.values(PALETTES).forEach((p) => HUES.forEach((h) => expect(p[h]).toMatch(/^#[0-9A-F]{6}$/i)));
  });
  it('родственные инструменты — один оттенок или соседние (система цветов)', () => {
    // семейство → допустимые оттенки: основной и соседний
    const OK = { time: ['orange'], pitch: ['teal', 'cyan'], play: ['indigo', 'purple'], learn: ['green', 'mint'], record: ['red', 'pink'], media: ['pink'], paper: ['brown'], util: ['graphite'] };
    expect(Object.keys(TOOL_FAMILY).sort()).toEqual(Object.keys(TOOL_HUE).sort());
    Object.entries(TOOL_FAMILY).forEach(([id, f]) => expect(OK[f], id + ' ' + f).toContain(TOOL_HUE[id]));
    expect(TOOL_HUE.metro).toBe(TOOL_HUE.timer);
    expect(TOOL_HUE.ear).toBe(TOOL_HUE.beat);
    expect(TOOL_HUE.glider).toBe(TOOL_HUE.piano);
  });
  it('инструменты перекрашиваются, личные модули — со своим цветом', () => {
    const list = [{ id: 'metro', color: '#111111' }, { id: 'mine', color: '#222222', local: true }];
    registerTools(list);
    paintTools({ palette: 'neon' });
    expect(list[0].color).toBe(PALETTES.neon.orange);
    expect(list[1].color).toBe('#222222');
    paintTools({ palette: 'classic' });
    expect(list[0].color).toBe(PALETTES.classic.orange);
  });
  it('классическая палитра с охрой — цвета темы как есть', () => {
    expect(accentVars({})).toBe(null);
    expect(accentVars({ palette: 'neon' })['--tint']).toBe(PALETTES.neon.orange);
    expect(accentVars({ palette: 'pastel', accent: 'blue' })['--on-tint']).toBe('#1c1c1e');
    expect(accentVars({ palette: 'pastel' })['--tint']).toContain('color-mix');
  });
  it('значок на светлом — тёмный', () => {
    expect(onColor('#FFEA00')).toBe('#1c1c1e');
    expect(onColor('#1F3F9F')).toBe('#ffffff');
  });
});

describe('свои цвета', () => {
  it('свой цвет: все оттенки из одного, акцент — сам цвет', async () => {
    const { ownPalette, hueColor, accentVars } = await import('../src/core/palettes.js');
    const P = ownPalette('#C0392B');
    HUES.forEach((h) => expect(P[h]).toMatch(/^#[0-9A-F]{6}$/));
    expect(P.orange).toBe('#C0392B');
    expect(new Set(Object.values(P)).size).toBe(HUES.length);
    expect(hueColor({ palette: 'own', ownMain: '#C0392B' }, 'orange')).toBe('#C0392B');
    expect(accentVars({ palette: 'own', ownMain: '#C0392B', accent: 'blue' })['--tint']).toBe('#C0392B');
  });
  it('свой фон: тёмный — тёмная схема и светлый текст', async () => {
    const { bgVars } = await import('../src/core/palettes.js');
    expect(bgVars('nope')).toBe(null);
    const d = bgVars('#2A0A3A'), l = bgVars('#FFD0E0');
    expect(d.dark).toBe(true); expect(l.dark).toBe(false);
    expect(onColor(d.vars['--ink'])).toBe('#1c1c1e'); // светлый текст на тёмном
    expect(onColor(l.vars['--ink'])).toBe('#ffffff');
  });
});

describe('контраст текста акцентом (слово автора 26.11.2026)', () => {
  it('--tint-text читается на фоне и ячейках в каждой палитре, акценте и теме (≥ 4,5:1)', async () => {
    const { contrast, SURFACES, ACCENT_HUE } = await import('../src/core/palettes.js');
    for (const palette of ['bright', 'pastel', 'neon', 'jewel', 'lunar', 'own']) {
      for (const accent of Object.keys(ACCENT_HUE)) {
        for (const theme of ['light', 'paper', 'dark', 'oled']) {
          const v = accentVars({ palette, accent, ownMain: '#2EC4B6' }, { dark: theme === 'dark' || theme === 'oled', surfaces: SURFACES[theme] });
          if (!v) continue;
          SURFACES[theme].forEach((bg) => expect(contrast(v['--tint-text'], bg), palette + '/' + accent + '/' + theme).toBeGreaterThanOrEqual(4.5));
        }
      }
    }
  });
  it('значок на цвете: выбор по контрасту', async () => {
    const { contrast } = await import('../src/core/palettes.js');
    ['#5EC4BD', '#00C7BE', '#7CC7D8', '#30B0C7'].forEach((c) => { const t = onColor(c); expect(contrast(c, t)).toBeGreaterThanOrEqual(3.5); });
  });
});
