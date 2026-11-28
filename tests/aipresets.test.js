import { describe, it, expect } from 'vitest';
import { PRESETS, presetOf } from '../src/core/ai/presets.js';
import { checkUrl, FORMATS } from '../src/core/ai/config.js';
describe('готовые подключения', () => {
  it('адреса проходят проверку, форматы известны', () => {
    for (const p of PRESETS) { expect(checkUrl(p.url).ok).toBe(true); expect(FORMATS).toContain(p.format); }
  });
  it('поставщик определяется по адресу', () => {
    expect(presetOf({ url: 'https://api.anthropic.com/' }).id).toBe('claude');
    expect(presetOf({ url: 'https://my.host/v1' })).toBe(null);
  });
});
