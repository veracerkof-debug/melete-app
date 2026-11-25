// Касание уведомления открывает то, что человек поставил (слово автора 22.11.2026): занятие по плану, песню (с инструментом,
// на котором открывали её в прошлый раз), инструмент, Библию на месте остановки, календарь. Цель кладётся в extra уведомления
// (reminders.js: goOf). Разбор цели — чистая функция (проверяется тестом); исполнение — initNotifyTap (только Android).
import { Capacitor } from '@capacitor/core';
import { log } from './log.js';

// extra уведомления + то, что известно о песне → действие | null
export function resolveTarget(extra, songById, moduleOk = () => true) {
  const e = extra && typeof extra === 'object' ? extra : null;
  if (!e || !e.go) return null;
  switch (e.go) {
    case 'routine': return e.routine ? { do: 'routine', routine: String(e.routine) } : null;
    case 'song': { const s = e.songId && songById(e.songId); return s ? { do: 'song', songId: s.id, tool: s.lastTool && moduleOk(s.lastTool) ? s.lastTool : null } : { do: 'home' }; }
    case 'tool': return e.tool && moduleOk(e.tool) ? { do: 'tool', tool: String(e.tool) } : { do: 'home' };
    case 'bible': return { do: 'bible' };
    case 'calendar': return { do: 'calendar' };
    case 'together': return { do: 'together' };
    default: return { do: 'home' };
  }
}

export function openTarget(app, tg) {
  if (!tg) return;
  try {
    if (tg.do === 'routine') app.startSession('free', null, null, { routine: tg.routine });
    else if (tg.do === 'song') {
      app.startSession('song', tg.songId);
      if (tg.tool) openLater(app, tg.tool);
    } else if (tg.do === 'tool') app.startSession('tool', null, tg.tool);
    else if (tg.do === 'bible') (app.go ? app.go('bible') : app.openTool && app.openTool('bible'));
    else if (tg.do === 'calendar') app.go && app.go('calendar');
    else if (tg.do === 'together') (app.openTool ? app.openTool('together') : app.go && app.go('tools'));
  } catch (e) { log('remind', 'касание уведомления: ' + (e && e.message), 'w'); }
}
// Экран занятия собирается не сразу — инструмент открываем, когда он готов
function openLater(app, tool, tries = 12) {
  if (app.active && app.openTool) { try { app.openTool(tool); return; } catch { /* ещё не готов */ } }
  if (tries > 0) setTimeout(() => openLater(app, tool, tries - 1), 250);
}

export async function initNotifyTap(app) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.addListener('localNotificationActionPerformed', (ev) => {
      const extra = ev && ev.notification && ev.notification.extra;
      openTarget(app, resolveTarget(extra, (id) => app.store.songById(id), (id) => !!(app.moduleOk ? app.moduleOk(id) : true)));
    });
  } catch (e) { log('remind', 'касание уведомления не подключено: ' + (e && e.message), 'w'); }
}
