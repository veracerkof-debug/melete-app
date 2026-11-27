// Самодиагностика для нейросети и для отчёта (слово автора 27.11.2026): то же, что видит разработчик в «Отчёте о проблеме» —
// находки по устройству за 7 дней, замеры запросов к модели, итог последней проверки связи и строки журнала [ai].
// Модель получает это по запросу {"q":"diag"} (категория «Журнал»); человек — кнопкой «Отправить отчёт» в окне диагностики.
import { state as dState, flushDiag } from '../diag.js';
import { diagnose, weekly, machine } from '../diagnose.js';
import { entries, logText } from '../log.js';
import { t } from '../../i18n/index.js';
import { summarize, statLine } from './netdiag.js';

export function aiSection(stats, last) {
  const L = ['— Нейросеть —'], S = summarize(stats);
  L.push(S.n ? 'Запросов в памяти: ' + S.n + ' (удачных ' + S.ok + ', отказов ' + S.fail + (S.fail ? ': ' + Object.entries(S.by).map(([k, v]) => k + ' ' + v).join(', ') : '') + '); среднее ' + (S.avg / 1000).toFixed(1) + ' с, дольше всего ' + (S.max / 1000).toFixed(1) + ' с, ≈' + S.tokAvg + ' токенов в запросе' : 'Запросов к модели ещё не было.');
  (stats || []).slice(-8).forEach((s) => L.push('  ' + new Date(s.t).toLocaleTimeString('ru-RU') + ' ' + statLine(s)));
  if (last) L.push('Последняя проверка связи (' + new Date(last.t).toLocaleTimeString('ru-RU') + '): ' + (last.ok ? 'в порядке' : 'не прошла — ' + (last.kind || '?')) + (last.steps || []).filter((s) => s.st !== 'ok').map((s) => '\n  ' + (s.st === 'warn' ? '! ' : '✗ ') + t('ai.dg.' + s.info, s.vars || {})).join(''));
  return L.join('\n');
}
// Полная сводка для модели
export function selfDiagText(app, stats, last) {
  const L = [aiSection(stats, last), ''];
  try {
    flushDiag();
    const S = dState(), env = { audio: app.audio && app.audio.state ? app.audio.state() : null, open: [...(app.openNow || new Map()).keys()] };
    const found = diagnose(S, env), w = weekly(S);
    L.push('— Диагностика устройства за 7 дней (дней с данными: ' + w.days + ') —');
    L.push(found.length ? found.map((f) => (f.sev === 'bad' ? '✗ ' : f.sev === 'warn' ? '! ' : 'i ') + t('diag.f.' + f.id, f.vars) + ' — ' + t('diag.h.' + (f.hint || f.id), f.vars)).join('\n') : 'находок нет');
    L.push('', 'Сводка: ' + JSON.stringify(machine(S, env)));
  } catch (e) { L.push('Диагностика устройства недоступна: ' + (e && e.message)); }
  const ai = entries().filter((e) => e[2] === 'ai' || e[1] === 'e').slice(-25);
  if (ai.length) L.push('', '— Журнал (нейросеть и ошибки, последние) —', logText(ai));
  return L.join('\n');
}
