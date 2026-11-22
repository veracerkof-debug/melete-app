// Звук инструмента одним жестом (слово автора 22.11.2026): развести два пальца — окно настроек звука инструмента: эффекты его шины
// (эквалайзер, пространство, компрессия…); громкость шины — рядом, в микшере. Какая шина у какого инструмента — здесь.
import { openFx } from './screens/fx.js';

export const BUS_OF = { metro: 'metro', piano: 'piano', glider: 'glider', theremin: 'glider', drone: 'drone', audio: 'media', show: 'media', studio: 'media',
  looper: 'looper', notes: 'notes', theory: 'theory', ear: 'theory', beat: 'theory', book: 'theory', vocal: 'vocal', voice: 'vocal' };

// → true, если окно открылось; у инструмента без звука (тюнер, спектр, таймер…) — подсказка
export function soundSettings(app, modId, toast, t) {
  const bus = BUS_OF[modId];
  if (!bus) { if (toast) toast(t('snd.noBus')); return false; }
  openFx(app, bus);
  return true;
}
