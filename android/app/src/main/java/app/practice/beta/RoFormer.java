package app.practice.beta;

import ai.onnxruntime.OnnxTensor;
import ai.onnxruntime.OrtEnvironment;
import ai.onnxruntime.OrtSession;
import java.io.File;
import java.io.RandomAccessFile;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.FloatBuffer;
import java.nio.channels.FileChannel;
import java.util.Collections;

// Вокал записи моделью Mel-Band RoFormer (веса Kimberley Jensen, MIT; ONNX fp16 audiojs/mel-roformer, 464 МБ) — «улучшенное
// разделение» на телефоне Melete DEV (слово автора 07.11.2026), модель — из пакета roformer. Тот же алгоритм, что
// src-tauri/src/roformer.rs на компьютере: спектр снаружи модели — окно Ханна 2048, шаг 441, без нормировки, центрирование
// с отражёнными полями (как torch.stft); сегменты 8 с (801 кадр) каждые 4 с, края сегментов гаснут линейно на 10 % длины,
// запись перед нарезкой отражается на 4 с в обе стороны. Вход модели [1,4,1025,801] (L re, L im, R re, R im), выход — спектр
// вокала той же раскладки.
// Телефон: песня не держится в куче — вход читается из файлов отображением в память, готовая часть (всё до начала
// следующего сегмента) сразу пишется в файлы: vocals.f32 и inst.f32 (float32 LE, чередование L R; инструментал = запись −
// вокал), а для HTDemucs по инструменталу (режимы 4 и 6) — ещё inst0.f32 и inst1.f32 (левый и правый отдельно).
public final class RoFormer implements Engine {
    static final int NFFT = 2048, HOP = 441, F = NFFT / 2 + 1, L = 352800, T = 1 + L / HOP, STEP = L / 2, FADE = L / 10, BORDER = L - STEP;
    static final String[] PARTS = { "vocals", "inst" };

    private final OrtEnvironment env;
    private final OrtSession session;
    private final String inName;
    private volatile boolean cancelled = false;
    public boolean planar = false; // писать ли inst0/inst1 (вход HTDemucs)

    public RoFormer(String modelPath, int threads) throws Exception {
        env = OrtEnvironment.getEnvironment();
        OrtSession.SessionOptions o = new OrtSession.SessionOptions();
        o.setIntraOpNumThreads(Math.max(1, threads));
        o.setInterOpNumThreads(1);
        o.setOptimizationLevel(OrtSession.SessionOptions.OptLevel.ALL_OPT);
        o.setCPUArenaAllocator(false); // память возвращается после каждого сегмента
        o.setMemoryPatternOptimization(false);
        session = env.createSession(modelPath, o);
        inName = session.getInputNames().iterator().next();
    }

    @Override public String[] parts() { return PARTS; }
    @Override public void cancel() { cancelled = true; }
    @Override public void close() { try { session.close(); } catch (Exception e) { /* ignore */ } }

    /* ---------- БПФ 2048 (комплексное, на месте; inv — обратное с делением на n) ---------- */

    private static double[] cosT, sinT, hann, envW;
    private static int[] rev;

    private static synchronized void tables() {
        if (hann != null) return;
        rev = new int[NFFT]; int bits = 11;
        for (int i = 0; i < NFFT; i++) { int r = 0, x = i; for (int b = 0; b < bits; b++) { r = (r << 1) | (x & 1); x >>= 1; } rev[i] = r; }
        cosT = new double[NFFT / 2]; sinT = new double[NFFT / 2];
        for (int k = 0; k < NFFT / 2; k++) { cosT[k] = Math.cos(2 * Math.PI * k / NFFT); sinT[k] = -Math.sin(2 * Math.PI * k / NFFT); }
        hann = new double[NFFT];
        for (int i = 0; i < NFFT; i++) hann[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / NFFT); // периодическое (torch.hann_window)
        envW = new double[(T - 1) * HOP + NFFT];
        for (int m = 0; m < T; m++) for (int i = 0; i < NFFT; i++) envW[m * HOP + i] += hann[i] * hann[i];
    }
    private static void fft(double[] re, double[] im, boolean inv) {
        for (int i = 0; i < NFFT; i++) { int j = rev[i]; if (j > i) { double t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
        for (int size = 2; size <= NFFT; size <<= 1) {
            int half = size >> 1, step = NFFT / size;
            for (int i = 0; i < NFFT; i += size) {
                for (int j = 0, k = 0; j < half; j++, k += step) {
                    double c = cosT[k], s = inv ? -sinT[k] : sinT[k]; int a = i + j, b = a + half;
                    double tr = re[b] * c - im[b] * s, ti = re[b] * s + im[b] * c;
                    re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
                }
            }
        }
        if (inv) { double sc = 1.0 / NFFT; for (int i = 0; i < NFFT; i++) { re[i] *= sc; im[i] *= sc; } }
    }
    // Отражение numpy/torch: без повтора краевого отсчёта, период 2(n−1); любая ширина полей
    static int reflect(long i, long n) {
        if (n <= 1) return 0;
        long p = 2 * (n - 1), k = ((i % p) + p) % p;
        return (int) (k >= n ? p - k : k);
    }

    private final double[] re = new double[NFFT], im = new double[NFFT];

    // STFT сегмента обоих каналов (ровно L отсчётов) → spec [4][F][T]; оба канала одним комплексным БПФ (L + iR)
    private void spectrum(float[] sl, float[] sr, float[] spec) {
        int pad = NFFT / 2, plane = F * T;
        for (int m = 0; m < T; m++) {
            int pos = m * HOP - pad;
            for (int i = 0; i < NFFT; i++) { int p = pos + i, j = p < 0 || p >= L ? reflect(p, L) : p; re[i] = sl[j] * hann[i]; im[i] = sr[j] * hann[i]; }
            fft(re, im, false);
            for (int f = 0; f < F; f++) {
                int nf = (NFFT - f) % NFFT, o = f * T + m;
                double zr = re[f], zi = im[f], cr = re[nf], ci = im[nf];
                spec[o] = (float) ((zr + cr) / 2); spec[plane + o] = (float) ((zi - ci) / 2);          // левый
                spec[2 * plane + o] = (float) ((zi + ci) / 2); spec[3 * plane + o] = (float) (-(zr - cr) / 2); // правый
            }
        }
    }
    // Обратное STFT спектра вокала z [4][F][T] → ol, or (L отсчётов): наложение с окном, деление на огибающую окна
    private final double[] accL = new double[(T - 1) * HOP + NFFT], accR = new double[(T - 1) * HOP + NFFT];
    private void ispectrum(FloatBuffer z, float[] ol, float[] or) {
        int plane = F * T, pad = NFFT / 2;
        java.util.Arrays.fill(accL, 0); java.util.Arrays.fill(accR, 0);
        for (int m = 0; m < T; m++) {
            java.util.Arrays.fill(re, 0); java.util.Arrays.fill(im, 0);
            for (int f = 0; f < F; f++) {
                int o = f * T + m;
                boolean edge = f == 0 || f == F - 1; // у постоянной и частоты Найквиста мнимая часть — ноль
                double lr = z.get(o), li = edge ? 0 : z.get(plane + o), rr = z.get(2 * plane + o), ri = edge ? 0 : z.get(3 * plane + o);
                re[f] = lr - ri; im[f] = li + rr; // XL + i·XR
                if (!edge) { int nf = NFFT - f; re[nf] = lr + ri; im[nf] = -li + rr; } // conj(XL) + i·conj(XR)
            }
            fft(re, im, true);
            int pos = m * HOP;
            for (int i = 0; i < NFFT; i++) { double w = hann[i]; accL[pos + i] += re[i] * w; accR[pos + i] += im[i] * w; }
        }
        for (int i = 0; i < L; i++) { double e = envW[pad + i]; ol[i] = e > 1e-8 ? (float) (accL[pad + i] / e) : 0f; or[i] = e > 1e-8 ? (float) (accR[pad + i] / e) : 0f; }
    }

    private static FloatBuffer map(File f) throws Exception {
        try (RandomAccessFile r = new RandomAccessFile(f, "r"); FileChannel ch = r.getChannel()) {
            return ch.map(FileChannel.MapMode.READ_ONLY, 0, ch.size()).order(ByteOrder.LITTLE_ENDIAN).asFloatBuffer();
        }
    }

    @Override
    public void separate(File inL, File inR, long total, File outDir, Progress progress, boolean hq) throws Exception {
        tables();
        if (!outDir.isDirectory() && !outDir.mkdirs()) throw new Exception("outdir");
        final FloatBuffer xl = map(inL), xr = map(inR);
        final long n = Math.min(total, Math.min(xl.capacity(), xr.capacity()));
        if (n <= 0) throw new Exception("empty");
        final boolean wide = n > 2L * BORDER;
        final long m = wide ? n + 2L * BORDER : n, off = wide ? BORDER : 0;
        int segs = 1; for (long s = 0; s + L < m; s += STEP) segs++;
        float[] sl = new float[L], sr = new float[L], vl = new float[L], vr = new float[L], spec = new float[4 * F * T];
        float[] aL = new float[L], aR = new float[L], ws = new float[L]; // накопление на [base, base + L)
        RandomAccessFile ov = new RandomAccessFile(new File(outDir, "vocals.f32"), "rw"), oi = new RandomAccessFile(new File(outDir, "inst.f32"), "rw");
        RandomAccessFile p0 = planar ? new RandomAccessFile(new File(outDir, "inst0.f32"), "rw") : null, p1 = planar ? new RandomAccessFile(new File(outDir, "inst1.f32"), "rw") : null;
        try {
            ov.setLength(0); oi.setLength(0); if (planar) { p0.setLength(0); p1.setLength(0); }
            ByteBuffer vb = ByteBuffer.allocate(STEP * 8).order(ByteOrder.LITTLE_ENDIAN), ib = ByteBuffer.allocate(STEP * 8).order(ByteOrder.LITTLE_ENDIAN);
            ByteBuffer b0 = ByteBuffer.allocate(STEP * 4).order(ByteOrder.LITTLE_ENDIAN), b1 = ByteBuffer.allocate(STEP * 4).order(ByteOrder.LITTLE_ENDIAN);
            long base = 0;
            for (int k = 0; k < segs; k++, base += STEP) {
                if (cancelled) throw new Exception("cancel");
                final long start = base;
                final int len = (int) Math.min(L, m - start);
                final boolean refl = len > L / 2, last = k == segs - 1;
                for (int i = 0; i < L; i++) {
                    long q = i < len ? start + i : refl ? start + reflect(i, len) : -1;
                    if (q < 0) { sl[i] = 0f; sr[i] = 0f; continue; }
                    int j = wide ? reflect(q - BORDER, n) : (int) q;
                    sl[i] = xl.get(j); sr[i] = xr.get(j);
                }
                spectrum(sl, sr, spec);
                try (OnnxTensor t = OnnxTensor.createTensor(env, FloatBuffer.wrap(spec), new long[] { 1, 4, F, T });
                     OrtSession.Result r = session.run(Collections.singletonMap(inName, t))) {
                    ispectrum(((OnnxTensor) r.get(0)).getFloatBuffer(), vl, vr);
                }
                for (int i = 0; i < len; i++) {
                    float w = 1f;
                    if (k > 0 && i < FADE) w = i / (float) (FADE - 1);
                    if (!last && i >= L - FADE) w = Math.min(w, (L - 1 - i) / (float) (FADE - 1));
                    ws[i] += w; aL[i] += vl[i] * w; aR[i] += vr[i] * w;
                }
                // готово всё до начала следующего сегмента (последний — целиком): в файлы, только отсчёты самой записи
                int done = last ? len : STEP;
                vb.clear(); ib.clear(); b0.clear(); b1.clear();
                int cnt = 0;
                for (int i = 0; i < done; i++) {
                    long j = start + i - off;
                    if (j < 0 || j >= n) continue;
                    float w = ws[i], a = w > 0 ? aL[i] / w : 0f, b = w > 0 ? aR[i] / w : 0f, ml = xl.get((int) j), mr = xr.get((int) j);
                    vb.putFloat(a); vb.putFloat(b); ib.putFloat(ml - a); ib.putFloat(mr - b);
                    if (planar) { b0.putFloat(ml - a); b1.putFloat(mr - b); }
                    cnt++;
                    if (cnt == STEP) { flush(ov, oi, p0, p1, vb, ib, b0, b1, cnt); cnt = 0; }
                }
                if (cnt > 0) flush(ov, oi, p0, p1, vb, ib, b0, b1, cnt);
                if (!last) { // сдвинуть накопление на шаг
                    System.arraycopy(aL, STEP, aL, 0, L - STEP); java.util.Arrays.fill(aL, L - STEP, L, 0f);
                    System.arraycopy(aR, STEP, aR, 0, L - STEP); java.util.Arrays.fill(aR, L - STEP, L, 0f);
                    System.arraycopy(ws, STEP, ws, 0, L - STEP); java.util.Arrays.fill(ws, L - STEP, L, 0f);
                }
                if (progress != null) progress.at((k + 1) / (double) segs);
            }
        } finally {
            ov.close(); oi.close(); if (p0 != null) p0.close(); if (p1 != null) p1.close();
        }
    }
    private static void flush(RandomAccessFile ov, RandomAccessFile oi, RandomAccessFile p0, RandomAccessFile p1, ByteBuffer vb, ByteBuffer ib, ByteBuffer b0, ByteBuffer b1, int cnt) throws Exception {
        ov.write(vb.array(), 0, cnt * 8); oi.write(ib.array(), 0, cnt * 8);
        if (p0 != null) { p0.write(b0.array(), 0, cnt * 4); p1.write(b1.array(), 0, cnt * 4); }
        vb.clear(); ib.clear(); b0.clear(); b1.clear();
    }
}
