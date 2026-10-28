// Крест — единственное украшение главного экрана (DECISIONS 2026-10-28), только в церковном режиме.
// Рисунки свои, тонкой линией (viewBox 24×32, цвет — currentColor). Место — prefs.crossAt (home.js).
export const CROSSES = {
  // латинский: тонкий, перекладина выше середины — главный
  latin: '<path d="M12 2.5v27M5.5 10h13"/>',
  // греческий: равноконечный
  greek: '<path d="M12 6v20M2 16h20"/>',
  // восьмиконечный: титло, перекладина, наклонное подножие (конец по правую руку Распятого — слева на экране — вверх)
  orthodox: '<path d="M12 2.5v27M9 6h6M5.5 11h13M8 20.5l8 3"/>',
  // равноконечный в тонком круге
  circle: '<circle cx="12" cy="16" r="9.5"/><path d="M12 6.5v19M2.5 16h19"/>',
};
export const CROSS_IDS = Object.keys(CROSSES);
export const CROSS_PLACES = ['center', 'top', 'date', 'bottom', 'back'];

export const crossSVG = (id, width = 1.2) =>
  `<svg viewBox="0 0 24 32" fill="none" stroke="currentColor" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${CROSSES[id] || CROSSES.latin}</svg>`;
