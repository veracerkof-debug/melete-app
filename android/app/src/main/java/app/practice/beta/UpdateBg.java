package app.practice.beta;

import android.app.DownloadManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.pm.PackageInfoCompat;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.json.JSONArray;
import org.json.JSONObject;

// Фоновое обновление (слово автора 25.11.2026; src/core/update.js): пока приложение закрыто, раз в 30 минут (UpdateWorker) спросить GitHub
// о сборке канала; режим «автоматически» — скачать системным загрузчиком (только Wi-Fi, ждёт его сам), по окончании (UpdateReceiver) проверить файл
// и показать уведомление «Новая версия скачана — нажмите, чтобы установить»; режим «по кнопке» — уведомить, что версия есть. Касание → melete://update
// → приложение само запускает установку. Настройки сюда кладёт JS (UpdatePlugin.configure), потому что при закрытом приложении страницы нет.
// Запрос к GitHub условный (ETag): ответ «не менялось» в лимит (60 запросов в час на адрес) не идёт.
final class UpdateBg {
    static final String PREFS = "melete.upd", NAME = "melete-update.apk", CHANNEL = "melete-update", REPO = "https://github.com/veracerkof-debug/";
    static final int NOTICE_ID = 7100;
    static volatile boolean foreground = false; // приложение на экране: уведомлять не нужно, там карточка

    private UpdateBg() { }

    static SharedPreferences prefs(Context c) { return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE); }
    static File apk(Context c) { return new File(c.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), NAME); }
    static DownloadManager dm(Context c) { return (DownloadManager) c.getSystemService(Context.DOWNLOAD_SERVICE); }

    // Номер установленной сборки (versionCode = номер сборки GitHub Actions)
    static long installed(Context c) {
        try { return PackageInfoCompat.getLongVersionCode(c.getPackageManager().getPackageInfo(c.getPackageName(), 0)); } catch (Exception e) { return 0; }
    }

    // Файл — наш APK нужной сборки (пакет тот же, номер совпал): иначе ставить его нельзя
    static boolean apkOk(Context c, long build) {
        File f = apk(c);
        if (!f.exists() || f.length() < 1000000) return false;
        try {
            PackageInfo pi = c.getPackageManager().getPackageArchiveInfo(f.getAbsolutePath(), 0);
            return pi != null && c.getPackageName().equals(pi.packageName) && PackageInfoCompat.getLongVersionCode(pi) == build;
        } catch (Exception e) { return false; }
    }

    static void clearReady(Context c) {
        prefs(c).edit().remove("readyBuild").remove("noticeKind").remove("noticeBuild").apply();
        hideNotice(c);
    }

    // Состояние для страницы: готово (build), скачивается (id, build) или ничего. Заодно убирает устаревшее (уже установлено)
    static String[] pending(Context c) {
        SharedPreferences p = prefs(c);
        long cur = installed(c), ready = p.getLong("readyBuild", 0);
        if (ready > 0) {
            if (ready <= cur || !apkOk(c, ready)) clearReady(c);
            else return new String[] { "ready", String.valueOf(ready), "-1" };
        }
        long id = p.getLong("dlId", -1), b = p.getLong("dlBuild", 0);
        if (id >= 0) {
            int st = downloadStatus(c, id);
            if (st == DownloadManager.STATUS_RUNNING || st == DownloadManager.STATUS_PENDING || st == DownloadManager.STATUS_PAUSED) return new String[] { "down", String.valueOf(b), String.valueOf(id) };
            if (st == DownloadManager.STATUS_SUCCESSFUL) { finishDownload(c, id); return pending(c); }
            p.edit().remove("dlId").remove("dlBuild").apply();
        }
        return new String[] { "none", "0", "-1" };
    }

    static int downloadStatus(Context c, long id) {
        try (Cursor q = dm(c).query(new DownloadManager.Query().setFilterById(id))) {
            if (q != null && q.moveToFirst()) return q.getInt(q.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
        } catch (Exception ignored) { }
        return -1;
    }

    // Скачивание кончилось (приёмник или проверка): файл настоящий — «готово» и уведомление
    static void finishDownload(Context c, long id) {
        SharedPreferences p = prefs(c);
        long build = p.getLong("dlBuild", 0);
        if (p.getLong("dlId", -1) != id) return;
        p.edit().remove("dlId").remove("dlBuild").apply();
        if (build > installed(c) && downloadStatus(c, id) == DownloadManager.STATUS_SUCCESSFUL && apkOk(c, build)) {
            p.edit().putLong("readyBuild", build).apply();
            notice(c, "ready", build);
        }
    }

    // Убрать прежние незавершённые скачивания обновления из системного загрузчика
    static void dropQueued(Context c) {
        try (Cursor q = dm(c).query(new DownloadManager.Query())) {
            if (q == null) return;
            while (q.moveToNext()) {
                String uri = q.getString(q.getColumnIndexOrThrow(DownloadManager.COLUMN_LOCAL_URI));
                int st = q.getInt(q.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
                if (uri != null && uri.endsWith(NAME) && st != DownloadManager.STATUS_SUCCESSFUL) dm(c).remove(q.getLong(q.getColumnIndexOrThrow(DownloadManager.COLUMN_ID)));
            }
        } catch (Exception ignored) { }
    }

    // Скачать по Wi-Fi (загрузчик ждёт его сам); запомнить номер — приёмник и страница узнают своё скачивание
    static long startDownload(Context c, String url, long build) {
        dropQueued(c);
        File f = apk(c);
        if (f.exists()) f.delete();
        DownloadManager.Request r = new DownloadManager.Request(Uri.parse(url));
        r.setTitle("Melete");
        r.setMimeType("application/vnd.android.package-archive");
        r.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE);
        r.setDestinationInExternalFilesDir(c, Environment.DIRECTORY_DOWNLOADS, NAME);
        r.setAllowedNetworkTypes(DownloadManager.Request.NETWORK_WIFI);
        long id = dm(c).enqueue(r);
        prefs(c).edit().putLong("dlId", id).putLong("dlBuild", build).apply();
        return id;
    }

    // Одна проверка из фона: что делать с релизом канала
    static void check(Context c) throws Exception {
        SharedPreferences p = prefs(c);
        String channel = p.getString("channel", ""), apkName = p.getString("apkName", "");
        if (channel.isEmpty() || apkName.isEmpty() || p.getInt("build", 0) <= 0) return; // собрано у себя — не обновляется
        if (UpdatePlugin.ownBusy()) return; // идёт своё скачивание по мобильной сети — не мешать
        String[] st = pending(c);
        if (!"none".equals(st[0])) {
            if ("ready".equals(st[0])) notice(c, "ready", Long.parseLong(st[1]));
            return;
        }
        long cur = installed(c);
        String rel = fetchRelease(c, channel);
        if (rel == null) return;
        JSONArray assets = new JSONObject(rel).optJSONArray("assets");
        if (assets == null) return;
        Pattern re = Pattern.compile("^android-(\\d+)\\.ver$");
        long build = 0;
        String url = null;
        for (int i = 0; i < assets.length(); i++) {
            JSONObject a = assets.getJSONObject(i);
            if (!"uploaded".equals(a.optString("state"))) continue;
            Matcher m = re.matcher(a.optString("name"));
            if (m.matches()) build = Math.max(build, Long.parseLong(m.group(1)));
            if (apkName.equals(a.optString("name"))) url = a.optString("browser_download_url");
        }
        if (build <= cur || url == null || !url.startsWith(REPO)) return; // метка и файл загружены полностью — иначе «обновления нет»
        if (p.getBoolean("auto", true)) startDownload(c, url, build);
        else notice(c, "avail", build);
    }

    // Релиз канала (JSON) или null; запрос условный — «не менялось» берёт сохранённое
    private static String fetchRelease(Context c, String channel) throws Exception {
        SharedPreferences p = prefs(c);
        HttpURLConnection h = (HttpURLConnection) new URL("https://api.github.com/repos/veracerkof-debug/melete-app/releases/tags/" + channel).openConnection();
        try {
            h.setConnectTimeout(15000); h.setReadTimeout(20000);
            h.setRequestProperty("Accept", "application/vnd.github+json");
            h.setRequestProperty("User-Agent", "Melete");
            String etag = p.getString("etag", null), body = p.getString("rel", null);
            if (etag != null && body != null) h.setRequestProperty("If-None-Match", etag);
            int code = h.getResponseCode();
            if (code == 304 && body != null) return body;
            if (code != 200) return null; // лимит GitHub (403/429) или сбой — до следующего раза
            try (InputStream in = h.getInputStream(); ByteArrayOutputStream o = new ByteArrayOutputStream()) {
                byte[] buf = new byte[8192]; int n;
                while ((n = in.read(buf)) > 0) o.write(buf, 0, n);
                String s = o.toString("UTF-8"), e = h.getHeaderField("ETag");
                if (e != null) p.edit().putString("etag", e).putString("rel", s).apply();
                return s;
            }
        } finally { h.disconnect(); }
    }

    // Уведомление (один раз на сборку и вид). kind: ready | avail. Приложение на экране — не нужно: там карточка
    static void notice(Context c, String kind, long build) {
        if (foreground) return;
        SharedPreferences p = prefs(c);
        if (kind.equals(p.getString("noticeKind", "")) && build == p.getLong("noticeBuild", 0)) return;
        try {
            NotificationManagerCompat nm = NotificationManagerCompat.from(c);
            if (!nm.areNotificationsEnabled()) return;
            if (Build.VERSION.SDK_INT >= 26) {
                NotificationChannel ch = new NotificationChannel(CHANNEL, p.getString("chName", "Melete · updates"), NotificationManager.IMPORTANCE_DEFAULT);
                c.getSystemService(NotificationManager.class).createNotificationChannel(ch);
            }
            boolean ready = "ready".equals(kind);
            String title = p.getString(ready ? "txtReadyT" : "txtAvailT", ready ? "New version downloaded · build {n}" : "New version available · build {n}").replace("{n}", String.valueOf(build));
            String body = p.getString(ready ? "txtReadyB" : "txtAvailB", ready ? "Tap to install. Your data stays in place." : "Open Melete and tap Update.");
            Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse("melete://update")).setPackage(c.getPackageName()).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            PendingIntent pi = PendingIntent.getActivity(c, 0, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
            NotificationCompat.Builder b = new NotificationCompat.Builder(c, CHANNEL)
                .setSmallIcon(R.drawable.ic_stat_melete).setContentTitle(title).setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body)).setContentIntent(pi).setAutoCancel(true).setColor(0xFF9C7242);
            nm.notify(NOTICE_ID, b.build());
            p.edit().putString("noticeKind", kind).putLong("noticeBuild", build).apply();
        } catch (SecurityException ignored) { }
    }

    static void hideNotice(Context c) {
        try { NotificationManagerCompat.from(c).cancel(NOTICE_ID); } catch (Exception ignored) { }
    }
}
