package app.elachiston;

import android.app.ActivityManager;
import android.app.ApplicationExitInfo;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.os.Build;
import java.io.File;
import java.io.FileOutputStream;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Locale;

// Журнал главного экрана на телефоне (DECISIONS 2026-11-01): запуски и возвращения, уход в фон, нехватка памяти,
// падения (со стеком), почему система закрывала приложение в прошлый раз (ApplicationExitInfo), ошибки и подвисания
// страницы. Только технические строки: ни приложений, ни заметок, ни кошелька. Файл — в памяти приложения,
// ~300 КБ (старое отрезается); наружу — только когда человек сам нажмёт «Отправить отчёт».
final class Diag {
    private static final long MAX = 300_000;
    private static File file;
    private static final SimpleDateFormat TS = new SimpleDateFormat("MM-dd HH:mm:ss.SSS", Locale.US);

    private Diag() { }

    static synchronized void init(Context c) {
        if (file == null) file = new File(c.getFilesDir(), "diag.log");
    }

    static synchronized void log(String tag, String msg) {
        if (file == null) return;
        String line = TS.format(new Date()) + " " + tag + " " + msg.replace('\n', ' ') + "\n";
        try (FileOutputStream o = new FileOutputStream(file, true)) {
            o.write(line.getBytes(StandardCharsets.UTF_8));
        } catch (Exception ignored) { }
        if (file.length() > MAX) trim();
    }

    // оставить вторую половину (по границе строки)
    private static void trim() {
        try {
            byte[] all = bytes();
            int from = all.length / 2;
            while (from < all.length && all[from] != '\n') from++;
            try (FileOutputStream o = new FileOutputStream(file, false)) { o.write(all, Math.min(from + 1, all.length), all.length - Math.min(from + 1, all.length)); }
        } catch (Exception ignored) { }
    }

    private static byte[] bytes() throws java.io.IOException {
        try (java.io.FileInputStream in = new java.io.FileInputStream(file)) {
            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            byte[] buf = new byte[16384];
            for (int n; (n = in.read(buf)) > 0; ) out.write(buf, 0, n);
            return out.toByteArray();
        }
    }

    static synchronized String read() {
        try { return file == null || !file.exists() ? "" : new String(bytes(), StandardCharsets.UTF_8); }
        catch (Exception e) { return ""; }
    }

    static synchronized void clear() {
        if (file != null) file.delete();
    }

    // Падение — стек в журнал до того, как процесс умрёт; дальше — как обычно (система покажет своё)
    static void catchCrashes() {
        final Thread.UncaughtExceptionHandler prev = Thread.getDefaultUncaughtExceptionHandler();
        Thread.setDefaultUncaughtExceptionHandler((t, e) -> {
            StringWriter w = new StringWriter();
            e.printStackTrace(new PrintWriter(w));
            String s = w.toString();
            log("CRASH", "thread=" + t.getName() + " " + (s.length() > 3000 ? s.substring(0, 3000) : s).replace("\n", " | "));
            if (prev != null) prev.uncaughtException(t, e);
        });
    }

    // Почему процесс закрывался с прошлого раза: нехватка памяти, падение, «не отвечает», пользователь, обновление…
    static void exitReasons(Context c) {
        if (Build.VERSION.SDK_INT < 30) return;
        try {
            ActivityManager am = (ActivityManager) c.getSystemService(Context.ACTIVITY_SERVICE);
            SharedPreferences p = c.getSharedPreferences("diag", Context.MODE_PRIVATE);
            long seen = p.getLong("exitSeen", 0), newest = seen;
            List<ApplicationExitInfo> list = am.getHistoricalProcessExitReasons(c.getPackageName(), 0, 8);
            for (int i = list.size() - 1; i >= 0; i--) {
                ApplicationExitInfo x = list.get(i);
                if (x.getTimestamp() <= seen) continue;
                newest = Math.max(newest, x.getTimestamp());
                log("EXIT", TS.format(new Date(x.getTimestamp())) + " reason=" + reason(x.getReason()) + " importance=" + x.getImportance()
                    + " pss=" + (x.getPss() / 1024) + "MB rss=" + (x.getRss() / 1024) + "MB" + (x.getDescription() != null ? " desc=" + x.getDescription() : ""));
            }
            p.edit().putLong("exitSeen", newest).apply();
        } catch (Exception e) { log("diag", "exitReasons failed: " + e); }
    }

    private static String reason(int r) {
        switch (r) {
            case 1: return "exit-self"; case 2: return "signaled"; case 3: return "LOW-MEMORY"; case 4: return "CRASH";
            case 5: return "CRASH-NATIVE"; case 6: return "ANR"; case 7: return "init-failure"; case 8: return "permission-change";
            case 9: return "excessive-resource"; case 10: return "user-requested"; case 11: return "user-stopped";
            case 12: return "dependency-died"; case 13: return "other"; case 14: return "freezer"; case 15: return "package-state";
            case 16: return "package-updated"; default: return "unknown(" + r + ")";
        }
    }

    // Шапка отчёта: сборка, телефон, Android, WebView, память
    static String header(Context c) {
        StringBuilder b = new StringBuilder();
        try {
            PackageInfo pi = c.getPackageManager().getPackageInfo(c.getPackageName(), 0);
            b.append("app ").append(c.getPackageName()).append(' ').append(pi.versionName).append(" (").append(pi.versionCode).append(")\n");
        } catch (Exception ignored) { }
        b.append("device ").append(Build.MANUFACTURER).append(' ').append(Build.MODEL).append(" · Android ").append(Build.VERSION.RELEASE)
            .append(" (SDK ").append(Build.VERSION.SDK_INT).append(")\n");
        if (Build.VERSION.SDK_INT >= 26) {
            PackageInfo wv = android.webkit.WebView.getCurrentWebViewPackage();
            if (wv != null) b.append("webview ").append(wv.packageName).append(' ').append(wv.versionName).append('\n');
        }
        try {
            ActivityManager am = (ActivityManager) c.getSystemService(Context.ACTIVITY_SERVICE);
            ActivityManager.MemoryInfo mi = new ActivityManager.MemoryInfo();
            am.getMemoryInfo(mi);
            b.append("memory total=").append(mi.totalMem >> 20).append("MB avail=").append(mi.availMem >> 20).append("MB low=").append(mi.lowMemory)
                .append(" class=").append(am.getMemoryClass()).append("MB\n");
        } catch (Exception ignored) { }
        b.append("now ").append(TS.format(new Date())).append('\n');
        return b.toString();
    }
}
