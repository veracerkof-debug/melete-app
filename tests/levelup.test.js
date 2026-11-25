import { describe, it, expect } from 'vitest';
import { levelUpOffer } from '../src/core/profile.js';

const base = (level, prior, extra = {}) => ({ configured: true, profile: { level, instruments: [], priorHours: prior }, ...extra });
describe('levelUpOffer', () => {
  it('нет предложения, пока часов мало', () => { expect(levelUpOffer(base('beginner', 0), [])).toBe(null); });
  it('нет профиля или регистрации — нет предложения', () => { expect(levelUpOffer({}, [])).toBe(null); });
  it('спрашивали про этот уровень — не повторяем', () => {
    const s = base('beginner', 0, { levelAsk: 'amateur' });
    s.profile.priorHours = 0;
    expect(levelUpOffer(s, [])).toBe(null);
  });
});
