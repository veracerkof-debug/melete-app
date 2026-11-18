// Компьютер в фоне (Melete DEV, слово автора 18.11.2026): человек работает в другой программе, а телефон-пульт рулит
// звуками. Значок в области уведомлений (tray) со статусом, «Показать окно» / «Закрыть пульт» и сворачивание крестиком в
// tray вместо выхода. Включает веб-часть (src/core/deskbg.js, настройка «Работа в фоне», по умолчанию выключена).
// ВАЖНО: окно здесь выводится вперёд ТОЛЬКО по явному выбору человека в меню значка — команды пульта (sync.rs, netctl.js)
// ни show, ни set_focus не вызывают. Правило: новый код, показывающий окно, — только из `show_window` и только по клику.
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;

use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager, State, WindowEvent};

const TRAY: &str = "melete-bg";

#[derive(Default)]
pub struct Bg {
    // «закрытие крестиком сворачивает в tray»: только пока значок реально создан (без значка окно было бы не вернуть)
    hide_on_close: AtomicBool,
    status: Mutex<Option<MenuItem<tauri::Wry>>>,
}

// Чистое решение для закрытия окна: сворачиваем, только если режим включён и значок есть
pub fn hide_on_close(on: bool, tray_ok: bool) -> bool { on && tray_ok }

// Явный выбор человека (меню значка, щелчок по нему): вернуть окно на экран
fn show_window(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

// Закрытие окна: в режиме «Пульт в фоне» — спрятать в tray, программа и звук продолжают работать
pub fn on_window_event(w: &tauri::Window, e: &WindowEvent) {
    if let WindowEvent::CloseRequested { api, .. } = e {
        let bg = w.state::<Bg>();
        if bg.hide_on_close.load(Ordering::Relaxed) {
            api.prevent_close();
            let _ = w.hide();
        }
    }
}

// Включить или выключить значок. tip — статус («Melete: пульт активен, 2 устройства»), show/quit — подписи пунктов меню
// (язык — у окна, строки в i18n). → true, если режим включён (значок создан); false — значка нет (нет трея в системе),
// тогда окно по крестику закрывается как обычно
#[tauri::command]
pub fn bg_set(app: AppHandle, bg: State<'_, Bg>, on: bool, tip: String, show: String, quit: String) -> Result<bool, String> {
    if !on {
        bg.hide_on_close.store(false, Ordering::Relaxed);
        let _ = app.remove_tray_by_id(TRAY);
        if let Ok(mut s) = bg.status.lock() { *s = None; }
        // окно было спрятано в tray, а режим выключили — вернуть его, иначе программа останется невидимой
        if let Some(w) = app.get_webview_window("main") { if !w.is_visible().unwrap_or(true) { show_window(&app); } }
        return Ok(false);
    }
    if app.tray_by_id(TRAY).is_some() {
        set_tip(&app, &bg, &tip);
        bg.hide_on_close.store(hide_on_close(true, true), Ordering::Relaxed);
        return Ok(true);
    }
    let status = MenuItem::with_id(&app, "status", &tip, false, None::<&str>).map_err(|e| e.to_string())?;
    let item_show = MenuItem::with_id(&app, "show", &show, true, None::<&str>).map_err(|e| e.to_string())?;
    let item_quit = MenuItem::with_id(&app, "quit", &quit, true, None::<&str>).map_err(|e| e.to_string())?;
    let menu = Menu::with_items(&app, &[&status, &item_show, &item_quit]).map_err(|e| e.to_string())?;
    let mut b = TrayIconBuilder::with_id(TRAY).tooltip(&tip).menu(&menu).show_menu_on_left_click(false)
        .on_menu_event(|app, ev| match ev.id().as_ref() {
            "show" => show_window(app),
            "quit" => {
                // выйти по-настоящему: режим снят, окно закрывается обычным путём (Destroyed → обновление «при выходе»)
                app.state::<Bg>().hide_on_close.store(false, Ordering::Relaxed);
                match app.get_webview_window("main") { Some(w) => { let _ = w.close(); } None => app.exit(0) }
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, ev| {
            if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = ev { show_window(tray.app_handle()); }
        });
    if let Some(ic) = app.default_window_icon() { b = b.icon(ic.clone()); }
    b.build(&app).map_err(|e| e.to_string())?;
    if let Ok(mut s) = bg.status.lock() { *s = Some(status); }
    bg.hide_on_close.store(hide_on_close(true, true), Ordering::Relaxed);
    Ok(true)
}

fn set_tip(app: &AppHandle, bg: &Bg, tip: &str) {
    if let Some(t) = app.tray_by_id(TRAY) { let _ = t.set_tooltip(Some(tip)); }
    if let Ok(s) = bg.status.lock() { if let Some(i) = s.as_ref() { let _ = i.set_text(tip); } }
}

// Обновить статус: подсказка значка и верхний (неактивный) пункт меню
#[tauri::command]
pub fn bg_tip(app: AppHandle, bg: State<'_, Bg>, tip: String) {
    set_tip(&app, &bg, &tip);
}

#[cfg(test)]
mod tests {
    use super::hide_on_close;
    #[test]
    fn close_hides_only_with_mode_and_tray() {
        assert!(hide_on_close(true, true));
        assert!(!hide_on_close(true, false)); // нет значка — окно не вернуть, закрываем как обычно
        assert!(!hide_on_close(false, true));
        assert!(!hide_on_close(false, false));
    }
}
