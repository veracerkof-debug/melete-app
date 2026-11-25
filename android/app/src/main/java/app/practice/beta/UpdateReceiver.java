package app.practice.beta;

import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

// Системный загрузчик закончил скачивание: если это наше обновление — проверить файл и показать «Новая версия скачана» (UpdateBg.finishDownload)
public class UpdateReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(final Context context, Intent intent) {
        if (intent == null || !DownloadManager.ACTION_DOWNLOAD_COMPLETE.equals(intent.getAction())) return;
        final long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
        if (id < 0 || id != UpdateBg.prefs(context).getLong("dlId", -2)) return;
        final PendingResult pr = goAsync();
        new Thread(() -> {
            try { UpdateBg.finishDownload(context.getApplicationContext(), id); } catch (Exception ignored) { } finally { pr.finish(); }
        }).start();
    }
}
