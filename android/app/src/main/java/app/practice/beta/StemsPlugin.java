package app.practice.beta;

import android.content.Context;
import android.os.PowerManager;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;

// «Дорожки» нативно (ONNX Runtime на всех ядрах): на телефоне — вокал и инструментал (Mdx.java, UVR MDX-Net);
// Melete DEV — ещё 4/6 дорожек (Demucs.java, пакет stems) и «улучшенное разделение»: вокал RoFormer.java (пакет roformer),
// остальное — HTDemucs по инструменталу, как на компьютере (слово автора 07.11.2026). В pre этих пакетов нет. WebView не даёт WebAssembly больше одного потока,
// а здесь считают все ядра — в разы быстрее. Протокол: begin() → push({ ch, b64 }) кусками float32 LE обоих
// каналов → run() (ход — событие progress { f }) → { files: { drums, bass, other, vocals } } — файлы float32 LE
// с чередованием L R в кэше, JS читает их по Capacitor.convertFileSrc и кладёт в медиатеку; clean() — убрать.
// Модель — из пакета (files/packs, PacksPlugin) или из assets (копируется в files/models): ONNX Runtime читает файл по пути.
// На время счёта — частичный wake lock: экран можно гасить, приложение не закрывать.
@CapacitorPlugin(name = "Stems")
public class StemsPlugin extends Plugin {
    private static final String MODEL2 = "models/mdx/vocals.onnx", MODEL4 = "models/demucs/htdemucs_embedded.onnx", MODEL6 = "models/demucs/htdemucs_6s.onnx";
    private static final String ROFORMER = "models/roformer/mel-roformer.fp16.onnx";
    private FileOutputStream[] ins = new FileOutputStream[2];
    private volatile Engine job = null;
    private volatile boolean busy = false, cancelledNow = false; // отмена между RoFormer и HTDemucs

    private File dir() { return new File(getContext().getCacheDir(), "stems"); }

    @PluginMethod
    public void info(PluginCall call) {
        JSObject r = new JSObject();
        r.put("threads", Math.max(1, Runtime.getRuntime().availableProcessors()));
        call.resolve(r);
    }

    @PluginMethod
    public void begin(PluginCall call) {
        if (busy) { call.reject("busy"); return; }
        try {
            closeIns();
            File d = dir();
            wipe(d);
            if (!d.isDirectory() && !d.mkdirs()) throw new Exception("mkdir");
            for (int c = 0; c < 2; c++) ins[c] = new FileOutputStream(new File(d, "in" + c + ".f32"));
            call.resolve();
        } catch (Exception e) { call.reject(e.getMessage()); }
    }

    @PluginMethod
    public void push(PluginCall call) {
        int ch = call.getInt("ch", 0);
        String b64 = call.getString("b64", "");
        try {
            if (ins[ch] == null) throw new Exception("not begun");
            ins[ch].write(Base64.decode(b64, Base64.DEFAULT));
            call.resolve();
        } catch (Exception e) { call.reject(e.getMessage()); }
    }

    @PluginMethod
    public void run(PluginCall call) {
        if (busy) { call.reject("busy"); return; }
        busy = true;
        cancelledNow = false;
        final String mode = call.getString("model", "2");
        final String modelAsset = "6".equals(mode) ? MODEL6 : "4".equals(mode) ? MODEL4 : MODEL2;
        final boolean hq = Boolean.TRUE.equals(call.getBoolean("hq", false));
        final File d = dir();
        try { closeIns(); } catch (Exception e) { busy = false; call.reject(e.getMessage()); return; }
        final long total = new File(d, "in0.f32").length() / 4;
        if (total <= 0) { busy = false; call.reject("empty"); return; }
        final Context ctx = getContext();
        Thread th = new Thread(() -> {
            PowerManager.WakeLock lock = null;
            Engine dm = null;
            try {
                PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
                if (pm != null) { lock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "melete:stems"); lock.acquire(3 * 60 * 60 * 1000L); }
                int threads = Math.max(1, Math.min(8, Runtime.getRuntime().availableProcessors()));
                Engine.Progress prog = (f) -> { JSObject p = new JSObject(); p.put("f", f); notifyListeners("progress", p); };
                File out = new File(d, "out");
                // улучшенное: вокал — RoFormer (если пакет скачан), режим 2 — им и заканчивается; 4 и 6 — HTDemucs по инструменталу
                File rof = hq ? PacksPlugin.file(ctx, "roformer", ROFORMER) : null;
                String[] parts;
                String vocals = "";
                if (rof != null) {
                    final boolean two = MODEL2.equals(modelAsset);
                    RoFormer rf = new RoFormer(rof.getAbsolutePath(), threads);
                    rf.planar = !two;
                    dm = rf; job = rf;
                    rf.separate(new File(d, "in0.f32"), new File(d, "in1.f32"), total, out, (f) -> prog.at(two ? f : f * 0.45), false);
                    rf.close(); dm = null; job = null;
                    vocals = "roformer";
                    if (two) parts = RoFormer.PARTS;
                    else {
                        // вокал RoFormer — в сторону, HTDemucs считает по записи без вокала; его остаток вокала отбрасывается
                        File keep = new File(d, "rvocals.f32"), inL = new File(d, "rin0.f32"), inR = new File(d, "rin1.f32");
                        if (!new File(out, "vocals.f32").renameTo(keep) || !new File(out, "inst0.f32").renameTo(inL) || !new File(out, "inst1.f32").renameTo(inR)) throw new Exception("rename");
                        new File(out, "inst.f32").delete();
                        if (cancelledNow) throw new Exception("cancel");
                        Demucs de = new Demucs(modelFile(ctx, modelAsset).getAbsolutePath(), threads);
                        dm = de; job = de;
                        de.separate(inL, inR, total, out, (f) -> prog.at(0.45 + f * 0.55), true);
                        File v = new File(out, "vocals.f32");
                        if (v.exists() && !v.delete()) throw new Exception("delete");
                        if (!keep.renameTo(v)) throw new Exception("rename");
                        parts = de.parts();
                    }
                } else {
                    File model = modelFile(ctx, modelAsset);
                    dm = modelAsset.equals(MODEL2) ? new Mdx(model.getAbsolutePath(), threads) : new Demucs(model.getAbsolutePath(), threads);
                    job = dm;
                    dm.separate(new File(d, "in0.f32"), new File(d, "in1.f32"), total, out, prog, hq);
                    parts = dm.parts();
                }
                JSObject files = new JSObject();
                for (String part : parts) files.put(part, new File(out, part + ".f32").getAbsolutePath());
                JSObject r = new JSObject();
                r.put("files", files);
                r.put("stems", parts.length);
                r.put("vocals", vocals);
                r.put("total", total);
                r.put("threads", threads);
                call.resolve(r);
            } catch (Throwable e) {
                String m = e.getMessage();
                call.reject(m == null ? e.getClass().getSimpleName() : m);
            } finally {
                job = null; busy = false; cancelledNow = false;
                if (dm != null) dm.close();
                if (lock != null && lock.isHeld()) lock.release();
            }
        }, "stems");
        th.setPriority(Thread.NORM_PRIORITY);
        th.start();
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        Engine j = job;
        cancelledNow = true;
        if (j != null) j.cancel();
        call.resolve();
    }

    @PluginMethod
    public void clean(PluginCall call) {
        if (!busy) { try { closeIns(); } catch (Exception e) { /* ignore */ } wipe(dir()); }
        call.resolve();
    }

    private void closeIns() throws Exception {
        for (int c = 0; c < 2; c++) if (ins[c] != null) { ins[c].close(); ins[c] = null; }
    }

    private static void wipe(File f) {
        if (f == null || !f.exists()) return;
        File[] kids = f.listFiles();
        if (kids != null) for (File k : kids) wipe(k);
        f.delete();
    }

    // Модель — из скачанного пакета (PacksPlugin: вокал телефона — пакет vocals); иначе из assets (сборка с моделью):
    // файл в files/models (один раз; размер сверяется, чтобы обновление приложения подменило файл). Нет нигде — "nopack"
    private static File modelFile(Context ctx, String rel) throws Exception {
        File packed = PacksPlugin.file(ctx, MODEL2.equals(rel) ? "vocals" : ROFORMER.equals(rel) ? "roformer" : "stems", rel);
        if (packed != null) return packed;
        File dst = new File(ctx.getFilesDir(), rel);
        long size;
        try (InputStream in = ctx.getAssets().open("public/" + rel)) { size = in.available(); } catch (java.io.IOException e) { throw new Exception("nopack"); }
        if (dst.isFile() && dst.length() > 0 && (size <= 0 || dst.length() == size)) return dst;
        File parent = dst.getParentFile();
        if (parent != null && !parent.isDirectory() && !parent.mkdirs()) throw new Exception("mkdir");
        File tmp = new File(dst.getPath() + ".part");
        try (InputStream in = ctx.getAssets().open("public/" + rel); OutputStream out = new FileOutputStream(tmp)) {
            byte[] buf = new byte[1 << 16];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
        }
        if (!tmp.renameTo(dst)) throw new Exception("rename");
        return dst;
    }
}
