package app.practice.beta;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInstaller;

// Итог установки обновления через PackageInstaller (UpdatePlugin.installQuiet): система присылает сюда статус.
// «Нужно подтверждение» (первая установка этим способом, Android до 12) — показываем окно системы; остальное — запись для страницы и журнала
public class InstallResultReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context ctx, Intent intent) {
        int st = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE);
        String msg = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE);
        if (st == PackageInstaller.STATUS_PENDING_USER_ACTION) {
            Intent confirm = intent.getParcelableExtra(Intent.EXTRA_INTENT);
            if (confirm != null) {
                confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                try { ctx.startActivity(confirm); } catch (Exception e) { UpdateBg.prefs(ctx).edit().putString("instResult", "blocked").apply(); }
            }
            return;
        }
        // 0 — успех (процесс сейчас заменят), остальное — причина сбоя; apk остаётся для повтора кнопкой
        UpdateBg.prefs(ctx).edit().putString("instResult", st == PackageInstaller.STATUS_SUCCESS ? "ok" : "fail:" + st + ":" + (msg == null ? "" : msg)).apply();
    }
}
