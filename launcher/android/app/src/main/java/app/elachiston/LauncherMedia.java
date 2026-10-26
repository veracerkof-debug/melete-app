package app.elachiston;

import android.service.notification.NotificationListenerService;

// Пустой слушатель уведомлений: его включение человеком (доступ к уведомлениям) открывает активные медиасессии
// других приложений — что играет и пауза (LauncherPlugin.mediaState). Сами уведомления не читаются.
public class LauncherMedia extends NotificationListenerService {
}
