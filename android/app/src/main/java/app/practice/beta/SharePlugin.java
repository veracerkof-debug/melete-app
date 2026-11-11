package app.practice.beta;

import android.content.ClipData;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.util.Base64;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;

// Обмен с командой (src/core/share.js): файл .melete уходит через системное «Поделиться» — человек сам выбирает
// приложение и получателя; файл, открытый в Melete (из Telegram, почты, файлового менеджера), передаётся в приложение
// событием "file". Приложение само ничего не отправляет и не скачивает.
@CapacitorPlugin(name = "Share")
public class SharePlugin extends Plugin {

    private static final int MAX = 120 * 1024 * 1024;

    @Override
    public void load() {
        Intent i = getActivity().getIntent();
        if (i != null) take(i);
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        take(intent);
    }

    // Файл из намерения (открыть / поделиться) → событие "file" { name, data (base64) }; хранится, пока его не примут
    private void take(Intent intent) {
        String a = intent.getAction();
        Uri uri = null;
        if (Intent.ACTION_VIEW.equals(a)) uri = intent.getData();
        else if (Intent.ACTION_SEND.equals(a)) uri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
        if (uri == null) return;
        // одно и то же намерение не обрабатывается дважды (поворот экрана, возврат в приложение)
        intent.setAction(null);
        final Uri u = uri;
        new Thread(() -> {
            try (InputStream in = getContext().getContentResolver().openInputStream(u)) {
                if (in == null) return;
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                byte[] buf = new byte[65536];
                int n, total = 0;
                while ((n = in.read(buf)) > 0) {
                    total += n;
                    if (total > MAX) return;
                    out.write(buf, 0, n);
                }
                JSObject ret = new JSObject();
                ret.put("name", nameOf(u));
                ret.put("data", Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP));
                notifyListeners("file", ret, true);
            } catch (Exception e) {
                // не прочитался — ничего не делаем
            }
        }).start();
    }

    private String nameOf(Uri uri) {
        try (Cursor c = getContext().getContentResolver().query(uri, null, null, null, null)) {
            if (c != null && c.moveToFirst()) {
                int i = c.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (i >= 0) return c.getString(i);
            }
        } catch (Exception e) {
            // без имени
        }
        String p = uri.getLastPathSegment();
        return p == null ? "file" : p;
    }

    // Большой файл — частями до отправки: { name, data (base64), append } — первая часть очищает папку
    @PluginMethod
    public void put(PluginCall call) {
        String name = call.getString("name", "file").replaceAll("[\\\\/:*?\"<>|]", "_");
        boolean append = Boolean.TRUE.equals(call.getBoolean("append", false));
        boolean keep = Boolean.TRUE.equals(call.getBoolean("keep", false)); // несколько файлов: следующий не стирает прежние
        try {
            File dir = new File(getContext().getCacheDir(), "share");
            if (!dir.exists()) dir.mkdirs();
            if (!append && !keep) { File[] old = dir.listFiles(); if (old != null) for (File f : old) f.delete(); }
            try (FileOutputStream out = new FileOutputStream(new File(dir, name), append)) {
                out.write(Base64.decode(call.getString("data", ""), Base64.DEFAULT));
            }
            call.resolve();
        } catch (Exception e) { call.reject(e.getMessage()); }
    }

    // Отправить файл: { name, data (base64), title } → системный выбор приложения; ready — файл уже собран put
    @PluginMethod
    public void send(PluginCall call) {
        String name = call.getString("name", "songs.melete").replaceAll("[\\\\/:*?\"<>|]", "_");
        boolean ready = Boolean.TRUE.equals(call.getBoolean("ready", false));
        String data = call.getString("data", "");
        String title = call.getString("title", "Melete");
        String text = call.getString("text", "");
        String mime = call.getString("mime", "application/octet-stream");
        try {
            File dir = new File(getContext().getCacheDir(), "share");
            if (!dir.exists()) dir.mkdirs();
            File f = new File(dir, name);
            if (!ready) {
                File[] old = dir.listFiles();
                if (old != null) for (File o : old) o.delete();
                try (FileOutputStream out = new FileOutputStream(f)) {
                    out.write(Base64.decode(data, Base64.DEFAULT));
                }
            }
            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", f);
            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType(mime);
            send.putExtra(Intent.EXTRA_STREAM, uri);
            if (!text.isEmpty()) send.putExtra(Intent.EXTRA_TEXT, text);
            send.putExtra(Intent.EXTRA_SUBJECT, title);
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

    // Отправить несколько файлов одним выбором приложения: { names (уже собраны put), title, mime } — ACTION_SEND_MULTIPLE.
    // Раньше медиатека отправляла по одному: каждый следующий файл стирал папку, пока предыдущий ещё не ушёл
    @PluginMethod
    public void sendMany(PluginCall call) {
        String title = call.getString("title", "Melete");
        String mime = call.getString("mime", "*/*");
        try {
            com.getcapacitor.JSArray arr = call.getArray("names");
            java.util.List<String> names = arr == null ? new java.util.ArrayList<>() : arr.toList();
            File dir = new File(getContext().getCacheDir(), "share");
            java.util.ArrayList<Uri> uris = new java.util.ArrayList<>();
            ClipData clip = null;
            for (String n : names) {
                File f = new File(dir, n.replaceAll("[\\\\/:*?\"<>|]", "_"));
                if (!f.isFile()) continue;
                Uri u = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", f);
                uris.add(u);
                if (clip == null) clip = ClipData.newRawUri(n, u); else clip.addItem(new ClipData.Item(u));
            }
            if (uris.isEmpty()) { call.reject("nofile"); return; }
            Intent send = new Intent(uris.size() == 1 ? Intent.ACTION_SEND : Intent.ACTION_SEND_MULTIPLE);
            send.setType(mime);
            if (uris.size() == 1) send.putExtra(Intent.EXTRA_STREAM, uris.get(0)); else send.putParcelableArrayListExtra(Intent.EXTRA_STREAM, uris);
            send.putExtra(Intent.EXTRA_SUBJECT, title);
            send.setClipData(clip);
            send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            Intent chooser = Intent.createChooser(send, title);
            chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().startActivity(chooser);
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    // Отправить текст (стихи Библии с ссылкой): { text, title } → системный выбор приложения
    @PluginMethod
    public void text(PluginCall call) {
        try {
            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType("text/plain");
            send.putExtra(Intent.EXTRA_TEXT, call.getString("text", ""));
            Intent chooser = Intent.createChooser(send, call.getString("title", "Melete"));
            getActivity().startActivity(chooser);
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }
}
