import { describe, it, expect } from 'vitest';
import { autoScale, uiScale, SCALE_MIN, SCALE_MAX, SCALE_STEP, layoutWidth } from '../src/core/settings.js';

describe('масштаб интерфейса', () => {
  it('авто — на 10 % мельче прежнего: телефоны 90 %, малые 80 %, планшеты 100 %', () => {
    expect(autoScale(300)).toBe(0.8); expect(autoScale(390)).toBe(0.9); expect(autoScale(599)).toBe(0.9); expect(autoScale(800)).toBe(1);
    expect(uiScale({}, 390)).toBe(0.9); expect(uiScale({ uiScale: null }, 390)).toBe(0.9);
  });
  it('вручную от 70 до 140 % шагом 5 %; выбранное человеком авто не трогает', () => {
    expect(SCALE_MIN).toBe(0.7); expect(SCALE_MAX).toBe(1.4); expect(SCALE_STEP).toBe(0.05);
    expect(uiScale({ uiScale: 1.2 }, 390)).toBe(1.2); expect(uiScale({ uiScale: 0.7 }, 390)).toBe(0.7); expect(uiScale({ uiScale: 1.4 }, 390)).toBe(1.4);
    expect(uiScale({ uiScale: 0.5 }, 390)).toBe(0.9); expect(uiScale({ uiScale: 2 }, 390)).toBe(0.9); // вне диапазона — авто
  });
  it('на экране 390 точек раскладка шире: больше помещается', () => {
    expect(layoutWidth(390, 0.9)).toBe(433); expect(layoutWidth(390, 1)).toBe(390);
  });
});
