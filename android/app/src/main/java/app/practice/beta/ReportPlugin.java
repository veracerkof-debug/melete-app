package app.practice.beta;

import android.app.ActivityManager;
import android.app.ApplicationExitInfo;
import android.content.ClipData;
import android.content.Context;
import android.os.Build;
import java.util.List;
import android.content.Intent;
import android.net.Uri;
import androidx.core.content.FileProvider;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;

// Отчёт о проблеме (src/core/report.js): текст сохраняется файлом во временную папку приложения и открывается
// системный выбор «Поделиться» — человек сам выбирает Telegram, почту или другое приложение и получателя.
// Приложение само ничего не отправляет.
@CapacitorPlugin(name = "Report")
public class ReportPlugin extends Plugin {

    // Почему закрылся прошлый запуск (Android 11+): crash — падение или «не отвечает»; other — закрыл человек
    // (смахнул из недавних, «Остановить»), система освободила память и т. п.; null — неизвестно (Android до 11).
    // На старых — падение кода Java в CrashLog. { reason, java }
    @PluginMethod
    public void lastExit(PluginCall call) {
        com.getcapacitor.JSObject r = new com.getcapacitor.JSObject();
        String reason = null;
        if (Build.VERSION.SDK_INT >= 30) {
            try {
                ActivityManager am = (ActivityManager) getContext().getSystemService(Context.ACTIVITY_SERVICE);
                List<ApplicationExitInfo> l = am.getHistoricalProcessExitReasons(getContext().getPackageName(), 0, 1);
                if (l != null && !l.isEmpty()) {
                    ApplicationExitInfo e = l.get(0);
                    int x = e.getReason();
                    reason = x == ApplicationExitInfo.REASON_CRASH || x == ApplicationExitInfo.REASON_CRASH_NATIVE || x == ApplicationExitInfo.REASON_ANR ? "crash" : "other";
                    // подробности — чтобы отличать падение от нехватки памяти и закрытия человеком (отчёты 05.11.2026)
                    String kind;
                    switch (x) {
                        case ApplicationExitInfo.REASON_CRASH: kind = "crash"; break;
                        case ApplicationExitInfo.REASON_CRASH_NATIVE: kind = "native"; break;
                        case ApplicationExitInfo.REASON_ANR: kind = "anr"; break;
                        case ApplicationExitInfo.REASON_LOW_MEMORY: kind = "lowmem"; break;
                        case ApplicationExitInfo.REASON_SIGNALED: kind = "signal"; break;
                        case ApplicationExitInfo.REASON_USER_REQUESTED: kind = "user"; break;
                        case ApplicationExitInfo.REASON_USER_STOPPED: kind = "stopped"; break;
                        case ApplicationExitInfo.REASON_EXIT_SELF: kind = "self"; break;
                        case ApplicationExitInfo.REASON_EXCESSIVE_RESOURCE_USAGE: kind = "excess"; break;
                        case ApplicationExitInfo.REASON_DEPENDENCY_DIED: kind = "dependency"; break;
                        case ApplicationExitInfo.REASON_PERMISSION_CHANGE: kind = "permission"; break;
                        case ApplicationExitInfo.REASON_INITIALIZATION_FAILURE: kind = "init"; break;
                        default: kind = "other";
                    }
                    r.put("kind", kind);
                    r.put("code", x);
                    r.put("desc", e.getDescription() == null ? "" : e.getDescription());
                    r.put("importance", e.getImportance()); // 100 — на экране, 125 — служба на переднем плане, выше — фон
                    r.put("pss", e.getPss()); // КБ
                    r.put("rss", e.getRss());
                    r.put("at", e.getTimestamp());
                }
            } catch (Exception ignored) { }
        }
        r.put("reason", reason);
        r.put("java", !CrashLog.read(getContext(), false).isEmpty());
        call.resolve(r);
    }

    // Последнее падение приложения (CrashLog): { text } — пусто, если не падало; clear — стереть после чтения
    @PluginMethod
    public void lastCrash(PluginCall call) {
        com.getcapacitor.JSObject r = new com.getcapacitor.JSObject();
        r.put("text", CrashLog.read(getContext(), call.getBoolean("clear", false)));
        call.resolve(r);
    }

    @PluginMethod
    public void file(PluginCall call) {
        String name = call.getString("name", "melete-report.txt").replaceAll("[^A-Za-z0-9._-]", "_");
        String text = call.getString("text", "");
        String title = call.getString("title", "Melete");
        String body = call.getString("body", "");
        String email = call.getString("email", null);
        try {
            File dir = new File(getContext().getCacheDir(), "reports");
            if (!dir.exists()) dir.mkdirs();
            // старые отчёты не копятся
            File[] old = dir.listFiles();
            if (old != null) for (File f : old) f.delete();
            File f = new File(dir, name);
            try (FileOutputStream out = new FileOutputStream(f)) {
                out.write(text.getBytes(StandardCharsets.UTF_8));
            }
            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", f);
            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType("text/plain");
            send.putExtra(Intent.EXTRA_STREAM, uri);
            send.putExtra(Intent.EXTRA_TEXT, body);
            send.putExtra(Intent.EXTRA_SUBJECT, title);
            if (email != null) send.putExtra(Intent.EXTRA_EMAIL, new String[] { email });
            send.setClipData(ClipData.newRawUri(name, uri));
            send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            Intent chooser = Intent.createChooser(send, title);
            chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().startActivity(chooser);
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }
}
