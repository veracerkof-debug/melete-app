package app.elachiston;

import android.service.notification.NotificationListenerService;

// Пустой слушатель уведомлений: его включение человеком (доступ к уведомлениям) открывает активные медиасессии
// других приложений — что играет и пауза (LauncherPlugin.mediaState). Сами уведомления не читаются.
// Сейчас не объявлен в AndroidManifest.xml (Play Защита блокирует такие APK не из Play Маркета) — вернуть перед релизом.
public class LauncherMedia extends NotificationListenerService {
}
