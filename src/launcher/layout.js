// Раскладка (DECISIONS 2026-10-26): порядок, видимость и размер каждого блока главного экрана, место значков
// (внизу, вверху, слева, справа) и вид «Всех приложений» (место папок и поиска, размер названий).
// По умолчанию — как было: prefs.layout пуст, пока раскладку не меняли.
import { prefs, save } from './data.js';

export const BLOCKS = ['status', 'clock', 'date', 'balance', 'subline', 'apps', 'space', 'tracker', 'player', 'dock'];
const DEFAULT = {
  order: BLOCKS,
  hide: {},          // id → true
  scale: {},         // id → % (60–160), умножается на общий размер часов или остального
  dock: 'bottom',    // bottom | top | left | right
  rail: 'right',     // папки во «Всех приложениях»: right | left | bottom | top
  search: 'top',     // поиск во «Всех приложениях»: top | bottom
  drawerScale: 100,  // названия во «Всех приложениях», %
};

export function layout() {
  const l = { ...DEFAULT, ...(prefs.layout || {}) };
  const order = (l.order || []).filter((id) => BLOCKS.includes(id));
  // новый блок в сохранённой раскладке — на своё место по умолчанию (после соседа слева)
  BLOCKS.forEach((id, i) => { if (!order.includes(id)) { const prev = BLOCKS.slice(0, i).reverse().find((x) => order.includes(x)); order.splice(prev ? order.indexOf(prev) + 1 : 0, 0, id); } });
  return { ...l, order, hide: { ...l.hide }, scale: { ...l.scale } };
}

// порядок для показа: значки сбоку — вне колонки (вверху и внизу — это место в порядке, settings.js)
export function homeOrder() {
  const l = layout();
  let o = l.order.filter((id) => !l.hide[id]);
  if (l.dock === 'left' || l.dock === 'right') o = o.filter((id) => id !== 'dock');
  return o;
}

export function setLayout(patch) {
  prefs.layout = { ...layout(), ...patch };
  save();
}
export const resetLayout = () => { prefs.layout = null; save(); };
export const blockScale = (id) => (layout().scale[id] || 100) / 100;
