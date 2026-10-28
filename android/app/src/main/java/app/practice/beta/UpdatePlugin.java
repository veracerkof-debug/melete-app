package app.practice.beta;

import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

// Обновление из GitHub (src/core/update.js): по Wi-Fi APK скачивает системный загрузчик (ход — в уведомлении,
// переживает сворачивание); по мобильной сети — само приложение (системный держит большие файлы до Wi-Fi), ставит системный установщик — одно касание «Установить» (молча ставить себя вне Play
// Android не даёт). Тот же пакет и тот же ключ подписи — данные приложения остаются
@CapacitorPlugin(name = "Update")
public class UpdatePlugin extends Plugin {
    private static final String NAME = "melete-update.apk";

    private File apk() { return new File(getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), NAME); }
    private DownloadManager dm() { return (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE); }

    // Своё скачивание — для мобильной сети: системный загрузчик держит большой файл (~330 МБ) в очереди «до Wi-Fi»
    // (предел размера по мобильной сети), и ход стоит на 0 %. id = -1. Живёт, пока жив процесс приложения
    private static volatile long ownGot = 0, ownTotal = -1;
    private static volatile int ownState = 0; // 0 — нет, 1 — идёт, 2 — готово, 3 — сбой
    private static volatile boolean ownStop = false;
    private static Thread ownThread = null;

    private void ownDownload(String url) {
        ownStop = true;
        if (ownThread != null) { try { ownThread.join(2000); } catch (InterruptedException ignored) { } }
        ownStop = false; ownGot = 0; ownTotal = -1; ownState = 1;
        final File f = apk(), part = new File(f.getPath() + ".part");
        ownThread = new Thread(() -> {
            HttpURLConnection h = null;
            try {
                if (f.exists()) f.delete();
                String u = url;
                for (int i = 0; i < 6; i++) { // GitHub отдаёт файл переадресацией на другой адрес
                    h = (HttpURLConnection) new URL(u).openConnection();
                    h.setInstanceFollowRedirects(false);
                    h.setConnectTimeout(20000); h.setReadTimeout(30000);
                    int code = h.getResponseCode();
                    if (code >= 300 && code < 400 && h.getHeaderField("Location") != null) { u = h.getHeaderField("Location"); h.disconnect(); h = null; continue; }
                    if (code != 200) throw new Exception("HTTP " + code);
                    break;
                }
                if (h == null) throw new Exception("redirects");
                ownTotal = h.getContentLengthLong();
                byte[] buf = new byte[1 << 16];
                try (InputStream in = h.getInputStream(); FileOutputStream out = new FileOutputStream(part)) {
                    int n;
                    while ((n = in.read(buf)) > 0) {
                        if (ownStop) throw new Exception("cancel");
                        out.write(buf, 0, n); ownGot += n;
                    }
                }
                if (ownTotal > 0 && ownGot != ownTotal) throw new Exception("short");
                if (!part.renameTo(f)) throw new Exception("rename");
                ownState = 2;
            } catch (Exception e) {
                part.delete();
                ownState = 3;
            } finally { if (h != null) h.disconnect(); }
        });
        ownThread.start();
    }

    // Убрать из системного загрузчика прежние скачивания обновления (например, «только Wi-Fi» со вчера)
    private void dropQueued() {
        try (Cursor c = dm().query(new DownloadManager.Query())) {
            if (c == null) return;
            while (c.moveToNext()) {
                String uri = c.getString(c.getColumnIndexOrThrow(DownloadManager.COLUMN_LOCAL_URI));
                int st = c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
                if (uri != null && uri.endsWith(NAME) && st != DownloadManager.STATUS_SUCCESSFUL) dm().remove(c.getLong(c.getColumnIndexOrThrow(DownloadManager.COLUMN_ID)));
            }
        } catch (Exception ignored) { }
    }

    // { url, wifi } → { id }: только Wi-Fi — системный загрузчик (ждёт Wi-Fi сам, ход в уведомлении); любая сеть — своё
    @PluginMethod
    public void download(PluginCall call) {
        String url = call.getString("url", "");
        if (!url.startsWith("https://github.com/veracerkof-debug/")) { call.reject("url"); return; }
        boolean wifi = !Boolean.FALSE.equals(call.getBoolean("wifi", true));
        try {
            dropQueued();
            if (!wifi) {
                ownDownload(url);
                JSObject o = new JSObject();
                o.put("id", -1);
                call.resolve(o);
                return;
            }
            ownStop = true;
            File f = apk();
            if (f.exists()) f.delete();
            DownloadManager.Request r = new DownloadManager.Request(Uri.parse(url));
            r.setTitle("Melete");
            r.setMimeType("application/vnd.android.package-archive");
            r.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE);
            r.setDestinationInExternalFilesDir(getContext(), Environment.DIRECTORY_DOWNLOADS, NAME);
            r.setAllowedNetworkTypes(DownloadManager.Request.NETWORK_WIFI);
            long id = dm().enqueue(r);
            JSObject o = new JSObject();
            o.put("id", id);
            call.resolve(o);
        } catch (Exception e) { call.reject(String.valueOf(e.getMessage())); }
    }

    // { id } → { status: run | wait | done | fail, got, total, reason }
    @PluginMethod
    public void status(PluginCall call) {
        Object v = call.getData().opt("id"); // номер приходит из JS как Integer или Long — getLong принял бы только Long
        long id = v instanceof Number ? ((Number) v).longValue() : -1L;
        JSObject o = new JSObject();
        if (id < 0) { // своё скачивание
            o.put("got", ownGot); o.put("total", ownTotal); o.put("reason", 0);
            o.put("status", ownState == 2 ? (apk().exists() ? "done" : "fail") : ownState == 3 || ownState == 0 ? "fail" : "run");
            call.resolve(o);
            return;
        }
        try (Cursor c = dm().query(new DownloadManager.Query().setFilterById(id))) {
            if (c == null || !c.moveToFirst()) { o.put("status", "fail"); o.put("reason", "gone"); call.resolve(o); return; }
            int st = c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
            int reason = c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_REASON));
            o.put("got", c.getLong(c.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR)));
            o.put("total", c.getLong(c.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES)));
            o.put("reason", reason);
            if (st == DownloadManager.STATUS_SUCCESSFUL) o.put("status", apk().exists() ? "done" : "fail");
            else if (st == DownloadManager.STATUS_FAILED) o.put("status", "fail");
            else if (st == DownloadManager.STATUS_PAUSED) o.put("status", "wait"); // ждёт Wi-Fi или сеть
            else o.put("status", "run");
            call.resolve(o);
        } catch (Exception e) { call.reject(String.valueOf(e.getMessage())); }
    }

    // { id } — отменить скачивание (потом — заново, по другой сети)
    @PluginMethod
    public void cancel(PluginCall call) {
        Object v = call.getData().opt("id");
        if (v instanceof Number && ((Number) v).longValue() < 0) ownStop = true;
        else if (v instanceof Number) { try { dm().remove(((Number) v).longValue()); } catch (Exception e) { /* уже нет */ } }
        call.resolve();
    }

    // Можно ли этому приложению ставить пакеты (Android 8+: разрешение «Установка неизвестных приложений»)
    @PluginMethod
    public void canInstall(PluginCall call) {
        JSObject o = new JSObject();
        o.put("ok", Build.VERSION.SDK_INT < 26 || getContext().getPackageManager().canRequestPackageInstalls());
        call.resolve(o);
    }

    // Открыть настройку разрешения для Melete — один раз
    @PluginMethod
    public void allowInstall(PluginCall call) {
        try {
            Intent i = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            call.resolve();
        } catch (Exception e) { call.reject(String.valueOf(e.getMessage())); }
    }

    // Системный установщик со скачанным APK
    @PluginMethod
    public void install(PluginCall call) {
        File f = apk();
        if (!f.exists()) { call.reject("no file"); return; }
        try {
            Uri u = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", f);
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setDataAndType(u, "application/vnd.android.package-archive");
            i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            call.resolve();
        } catch (Exception e) { call.reject(String.valueOf(e.getMessage())); }
    }
}
