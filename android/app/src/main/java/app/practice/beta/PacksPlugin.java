package app.practice.beta;

import android.content.Context;
import android.net.ConnectivityManager;
import android.os.StatFs;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.Map;
import org.json.JSONArray;

// Пакеты моделей (src/core/packs.js, build/packs.mjs; DECISIONS 2026-10-28): полный рояль и вокал телефона не лежат
// в APK, а скачиваются по кнопке из релиза packs. Пакет — .tar; скачивание докачивает после обрыва (Range), каждый файл
// при распаковке сверяется по sha256 из описи (опись приходит из сборки приложения, не из сети). Готовый пакет —
// files/packs/<id>/<путь>, рядом метка .ok с версией описи. Страница читает файлы по Capacitor.convertFileSrc,
// нативный код (StemsPlugin) — по пути.
@CapacitorPlugin(name = "Packs")
public class PacksPlugin extends Plugin {
    private static final Map<String, Job> jobs = new HashMap<>();

    private static final class Job { volatile boolean stop = false; }

    public static File root(Context ctx) { return new File(ctx.getFilesDir(), "packs"); }

    // Файл пакета на устройстве или null — для нативного кода (модель вокала)
    public static File file(Context ctx, String id, String rel) {
        File d = new File(root(ctx), id), f = new File(d, rel);
        return new File(d, ".ok").isFile() && f.isFile() ? f : null;
    }

    private static String read(File f) {
        try (InputStream in = new FileInputStream(f)) {
            byte[] b = new byte[(int) Math.min(f.length(), 256)];
            int n = in.read(b);
            return n > 0 ? new String(b, 0, n, StandardCharsets.UTF_8).trim() : "";
        } catch (Exception e) { return ""; }
    }

    // → { dir, have: { id: версия }, metered, free }
    @PluginMethod
    public void list(PluginCall call) {
        File r = root(getContext());
        JSObject have = new JSObject();
        File[] kids = r.listFiles();
        if (kids != null) for (File k : kids) {
            File ok = new File(k, ".ok");
            if (k.isDirectory() && ok.isFile()) have.put(k.getName(), read(ok));
        }
        JSObject o = new JSObject();
        o.put("dir", r.getAbsolutePath());
        o.put("have", have);
        boolean metered = false;
        try { ConnectivityManager cm = (ConnectivityManager) getContext().getSystemService(Context.CONNECTIVITY_SERVICE); metered = cm != null && cm.isActiveNetworkMetered(); } catch (Exception ignored) { }
        o.put("metered", metered);
        try { o.put("free", new StatFs(getContext().getFilesDir().getPath()).getAvailableBytes()); } catch (Exception ignored) { }
        call.resolve(o);
    }

    // { id, url, bytes, v, files: [[путь, sha256, размер], …] } → сразу; ход — событие progress { id, stage, got, total, err }
    @PluginMethod
    public void download(PluginCall call) {
        final String id = call.getString("id", ""), url = call.getString("url", ""), v = call.getString("v", "");
        final long bytes = call.getData().optLong("bytes", -1);
        if (!id.matches("[a-z0-9-]+") || !url.startsWith("https://github.com/veracerkof-debug/")) { call.reject("args"); return; }
        final Map<String, String[]> want = new HashMap<>();
        try {
            JSONArray fs = call.getArray("files", new JSArray());
            for (int i = 0; i < fs.length(); i++) { JSONArray f = fs.getJSONArray(i); want.put(f.getString(0), new String[] { f.getString(1), String.valueOf(f.getLong(2)) }); }
        } catch (Exception e) { call.reject("files"); return; }
        if (want.isEmpty()) { call.reject("files"); return; }
        final Job job = new Job();
        synchronized (jobs) {
            if (jobs.containsKey(id)) { call.resolve(); return; } // уже идёт
            jobs.put(id, job);
        }
        call.resolve();
        new Thread(() -> {
            File r = root(getContext()), dl = new File(r, ".dl"), tar = new File(dl, id + ".tar"), part = new File(dl, id + ".tar.part");
            try {
                if (!dl.isDirectory() && !dl.mkdirs()) throw new Exception("mkdir");
                long free = new StatFs(getContext().getFilesDir().getPath()).getAvailableBytes();
                long have = part.isFile() ? part.length() : 0;
                if (bytes > 0 && free < (bytes - have) + bytes + (32L << 20)) throw new Exception("space");
                if (!tar.isFile() || (bytes > 0 && tar.length() != bytes)) { tar.delete(); fetch(url, part, bytes, job, id); if (!part.renameTo(tar)) throw new Exception("rename"); }
                emit(id, "check", 0, bytes, null);
                unpack(tar, new File(r, id + ".new"), want, job, id, bytes);
                File dst = new File(r, id);
                wipe(dst);
                if (!new File(r, id + ".new").renameTo(dst)) throw new Exception("rename");
                try (OutputStream o = new FileOutputStream(new File(dst, ".ok"))) { o.write(v.getBytes(StandardCharsets.UTF_8)); }
                tar.delete();
                emit(id, "done", bytes, bytes, null);
            } catch (Exception e) {
                String m = e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
                if (m.startsWith("sha") || m.startsWith("tar")) { tar.delete(); part.delete(); } // испорченный файл — заново
                wipe(new File(r, id + ".new"));
                emit(id, job.stop ? "cancel" : "fail", 0, bytes, m);
            } finally { synchronized (jobs) { jobs.remove(id); } }
        }, "packs-" + id).start();
    }

    private void emit(String id, String stage, long got, long total, String err) {
        JSObject p = new JSObject();
        p.put("id", id); p.put("stage", stage); p.put("got", got); p.put("total", total);
        if (err != null) p.put("err", err);
        notifyListeners("progress", p);
    }

    // Скачать с докачкой: есть .part — просим остаток (Range); GitHub отдаёт файл переадресацией — заголовок на каждом шаге
    private void fetch(String url, File part, long bytes, Job job, String id) throws Exception {
        long have = part.isFile() ? part.length() : 0;
        if (bytes > 0 && have >= bytes) { if (have == bytes) return; part.delete(); have = 0; }
        HttpURLConnection h = null;
        String u = url;
        int code = 0;
        for (int i = 0; i < 8; i++) {
            h = (HttpURLConnection) new URL(u).openConnection();
            h.setInstanceFollowRedirects(false);
            h.setConnectTimeout(20000); h.setReadTimeout(30000);
            if (have > 0) h.setRequestProperty("Range", "bytes=" + have + "-");
            code = h.getResponseCode();
            if (code >= 300 && code < 400 && h.getHeaderField("Location") != null) { u = h.getHeaderField("Location"); h.disconnect(); h = null; continue; }
            break;
        }
        if (h == null) throw new Exception("redirects");
        try {
            if (code == 200) have = 0; // сервер не умеет докачку — сначала
            else if (code != 206) throw new Exception("HTTP " + code);
            long total = bytes > 0 ? bytes : have + h.getContentLengthLong();
            byte[] buf = new byte[1 << 16];
            long got = have, last = 0;
            try (InputStream in = new BufferedInputStream(h.getInputStream()); OutputStream out = new FileOutputStream(part, have > 0)) {
                int n;
                while ((n = in.read(buf)) > 0) {
                    if (job.stop) throw new Exception("cancel");
                    out.write(buf, 0, n); got += n;
                    long now = System.currentTimeMillis();
                    if (now - last > 400) { last = now; emit(id, "get", got, total, null); }
                }
            }
            if (bytes > 0 && got != bytes) throw new Exception(got < bytes ? "short" : "tar size");
        } finally { h.disconnect(); }
    }

    // Распаковать ustar, сверяя каждый файл с описью; лишнее и чужие пути — отказ
    private void unpack(File tar, File out, Map<String, String[]> want, Job job, String id, long total) throws Exception {
        wipe(out);
        if (!out.mkdirs()) throw new Exception("mkdir");
        String base = out.getCanonicalPath() + File.separator;
        byte[] hdr = new byte[512], buf = new byte[1 << 16];
        int seen = 0;
        long pos = 0, last = 0;
        try (InputStream in = new BufferedInputStream(new FileInputStream(tar), 1 << 16)) {
            while (true) {
                if (job.stop) throw new Exception("cancel");
                if (readFully(in, hdr) < 512) throw new Exception("tar end");
                pos += 512;
                if (hdr[0] == 0) break; // конец архива
                String name = str(hdr, 0, 100), pre = str(hdr, 345, 155);
                if (!pre.isEmpty()) name = pre + "/" + name;
                long size = Long.parseLong(str(hdr, 124, 12).trim(), 8);
                char type = (char) hdr[156];
                String[] w = want.get(name);
                if ((type != '0' && type != 0) || w == null || Long.parseLong(w[1]) != size) throw new Exception("tar entry " + name);
                File f = new File(out, name);
                if (!f.getCanonicalPath().startsWith(base)) throw new Exception("tar path");
                File p = f.getParentFile();
                if (p != null && !p.isDirectory() && !p.mkdirs()) throw new Exception("mkdir");
                MessageDigest md = MessageDigest.getInstance("SHA-256");
                long left = size;
                try (OutputStream o = new FileOutputStream(f)) {
                    while (left > 0) {
                        int n = in.read(buf, 0, (int) Math.min(buf.length, left));
                        if (n < 0) throw new Exception("tar short");
                        o.write(buf, 0, n); md.update(buf, 0, n); left -= n;
                    }
                }
                if (!hex(md.digest()).equals(w[0])) throw new Exception("sha " + name);
                long pad = (512 - (size % 512)) % 512;
                if (readFully(in, new byte[(int) pad]) < pad) throw new Exception("tar short");
                pos += size + pad;
                seen++;
                long now = System.currentTimeMillis();
                if (now - last > 400) { last = now; emit(id, "check", pos, total, null); }
            }
        }
        if (seen != want.size()) throw new Exception("tar missing " + (want.size() - seen));
    }

    private static int readFully(InputStream in, byte[] b) throws Exception {
        int off = 0;
        while (off < b.length) { int n = in.read(b, off, b.length - off); if (n < 0) break; off += n; }
        return off;
    }
    private static String str(byte[] b, int off, int len) {
        int end = off;
        while (end < off + len && b[end] != 0) end++;
        return new String(b, off, end - off, StandardCharsets.UTF_8);
    }
    private static String hex(byte[] d) {
        StringBuilder s = new StringBuilder();
        for (byte x : d) s.append(String.format("%02x", x));
        return s.toString();
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        synchronized (jobs) { Job j = jobs.get(call.getString("id", "")); if (j != null) j.stop = true; }
        call.resolve();
    }

    // Удалить пакет (и недокачанное)
    @PluginMethod
    public void remove(PluginCall call) {
        String id = call.getString("id", "");
        if (!id.matches("[a-z0-9-]+")) { call.reject("id"); return; }
        synchronized (jobs) { Job j = jobs.get(id); if (j != null) j.stop = true; }
        File r = root(getContext());
        wipe(new File(r, id));
        new File(r, ".dl/" + id + ".tar").delete();
        new File(r, ".dl/" + id + ".tar.part").delete();
        call.resolve();
    }

    // Прежние версии APK копировали модель вокала в files/models при первом разделении: тот же файл (размер и sha256)
    // переносится в пакет, второй раз качать не нужно. { id, v, files: [[путь, sha256, размер]] } → { ok }
    @PluginMethod
    public void adopt(PluginCall call) {
        final String id = call.getString("id", ""), v = call.getString("v", "");
        final JSONArray fs = call.getArray("files", new JSArray());
        if (!id.matches("[a-z0-9-]+") || fs.length() != 1) { call.reject("args"); return; }
        new Thread(() -> {
            JSObject o = new JSObject();
            try {
                JSONArray f = fs.getJSONArray(0);
                String rel = f.getString(0);
                File old = new File(getContext().getFilesDir(), rel);
                boolean ok = old.isFile() && old.length() == f.getLong(2) && hex(sha(old)).equals(f.getString(1));
                if (ok) {
                    File d = new File(root(getContext()), id), dst = new File(d, rel);
                    File p = dst.getParentFile();
                    if (p != null && !p.isDirectory() && !p.mkdirs()) throw new Exception("mkdir");
                    if (!old.renameTo(dst)) throw new Exception("rename");
                    try (OutputStream w = new FileOutputStream(new File(d, ".ok"))) { w.write(v.getBytes(StandardCharsets.UTF_8)); }
                }
                o.put("ok", ok);
                call.resolve(o);
            } catch (Exception e) { call.reject(String.valueOf(e.getMessage())); }
        }, "packs-adopt").start();
    }

    private static byte[] sha(File f) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        byte[] buf = new byte[1 << 16];
        try (InputStream in = new FileInputStream(f)) { int n; while ((n = in.read(buf)) > 0) md.update(buf, 0, n); }
        return md.digest();
    }

    private static void wipe(File f) {
        if (f == null || !f.exists()) return;
        File[] kids = f.listFiles();
        if (kids != null) for (File k : kids) wipe(k);
        f.delete();
    }
}
