// Компьютер в фоне (Melete DEV, слово автора 18.11.2026): человек делает слайды, окно Melete свёрнуто или спрятано, а
// телефон рулит звуками. Здесь — веб-часть: настройка «Работа в фоне» (settings.deskBg, по умолчанию выключена) и связь с
// Rust (src-tauri/src/bg.rs): значок в области уведомлений со статусом «пульт активен, N устройств», пункты «Показать окно»
// и «Закрыть пульт», закрытие крестиком — в tray, а не выход. Окно команды пульта вперёд не выводят (docs/tech/connect.md).
// Только компьютер и только DEV; без значка в системе (нет трея) режим сам выключается — окно закрывается как обычно.
import { t } from '../i18n/index.js';
import { log } from './log.js';
import { isDesktop } from './desktop.js';
import { DEV } from './variants.js';

// Текст статуса для значка: связь выключена / пульт активен / пульт активен, N устройств
export const tipText = (tr, on, n) => (!on ? tr('bg.tipOff') : n > 0 ? tr('bg.tip', { n }) : tr('bg.tip0'));

export function createDeskBg(app, { invoke: inv } = {}) {
  const avail = DEV && isDesktop();
  const S = () => app.store.state.settings;
  let active = false, err = '', timer = 0, lastTip = '';
  const core = async () => inv || (await import('@tauri-apps/api/core')).invoke;
  const on = () => avail && S().deskBg === true;
  const tip = () => { const s = app.syncSrv; return tipText(t, !!(s && s.state.on), s && s.active ? s.active() : 0); };

  async function push() {
    const invoke = await core(), want = on();
    try {
      active = await invoke('bg_set', { on: want, tip: tip(), show: t('bg.show'), quit: t('bg.quit') });
      err = want && !active ? 'tray' : '';
      lastTip = tip();
    } catch (e) { active = false; err = 'tray'; log('sync', 'работа в фоне: значок не создан — ' + String((e && e.message) || e).slice(0, 120), 'w'); }
    if (want && !active && S().deskBg) { S().deskBg = false; app.store.settingsChanged(); } // значка нет — режим не включаем (окно не вернуть)
    if (active && !timer) timer = setInterval(refresh, 10000); else if (!active && timer) { clearInterval(timer); timer = 0; }
    return active;
  }
  // подсказка значка следует за числом устройств (раз в 10 с и при изменении связи)
  async function refresh() {
    if (!active) return;
    const s = tip();
    if (s === lastTip) return;
    lastTip = s;
    try { await (await core())('bg_tip', { tip: s }); } catch { /* значок исчез — обновится при следующем включении */ }
  }
  if (avail && app.syncSrv && app.syncSrv.subscribe) app.syncSrv.subscribe(() => { refresh(); });
  return {
    avail,
    get active() { return active; },
    get err() { return err; },
    apply: push,
    refresh,
  };
}
