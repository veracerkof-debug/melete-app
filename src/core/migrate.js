// Миграции формата данных (practice.v1): один список шагов вместо разрозненных вызовов при запуске.
//
// Правила:
// - `version: 1` не трогается никогда: по нему старые версии Melete и прототип узнают свои данные и копии
//   (store.js: isBackup). Номер формата — отдельное поле `schema` = число шагов, которые знает этот код.
// - Шаг — функция (state) → true, если что-то поменяла. Шаг обязан быть идемпотентным: шаги идут не только при
//   запуске, но и после загрузки копии и синхронизации (данные со старого устройства приходят в старом виде).
// - Шаг не удаляет поле, которое ещё читают старые версии или старые копии; новое поле — необязательное.
// - Данные новее кода (`schema` больше нашего: откат на прежнюю сборку) — шаги всё равно идут (они идемпотентны),
//   `schema` не понижается, в журнал — предупреждение. Незнакомые поля не трогаются.
// - Новый шаг — в конец списка, с датой; совместимость — слепком в tests/fixtures (tests/compat.test.js).
import { tabsMigrate, trainSplit, calmMigrate } from './settings.js';

export const STEPS = [
  // «Библия» из конца вкладок — после «Песен» (10.2026)
  { id: 'tabsBibleMid', run: (s) => tabsMigrate(s.settings) },
  // «Слух и ритм» → снова «Слух» и «Ритм» (11.11.2026)
  { id: 'trainSplit', run: (s) => trainSplit(s.settings) },
  // прежние яркие цвета меток и событий — спокойнее (11.2026)
  { id: 'calmColors', run: (s) => calmMigrate(s) },
];
export const SCHEMA = STEPS.length;

// → { changed, from, newer, bumped }: changed — шаг поменял данные (настройки — к сохранению со сменой updatedAt);
// bumped — поднят только номер формата; newer — данные записаны более новой версией (schema больше нашего)
export function migrate(state, steps = STEPS, log = () => {}) {
  if (!state || typeof state !== 'object') return { changed: false, from: 0, newer: false, bumped: false };
  state.settings ||= {};
  const from = Number.isFinite(state.schema) ? state.schema : 0, top = steps.length;
  let changed = false;
  for (const st of steps) {
    try { if (st.run(state)) changed = true; } catch (e) { log('шаг ' + st.id + ' не прошёл: ' + (e && e.message), 'e'); }
  }
  const newer = from > top, bumped = from < top;
  if (newer) log('данные записаны более новой версией Melete (формат ' + from + ', здесь ' + top + ') — незнакомое не трогается', 'w');
  if (bumped) state.schema = top;
  return { changed, from, newer, bumped };
}
