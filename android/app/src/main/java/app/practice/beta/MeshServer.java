package app.practice.beta;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.math.BigInteger;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.KeyStore;
import java.security.MessageDigest;
import java.security.PrivateKey;
import java.security.SecureRandom;
import java.security.Signature;
import java.security.cert.Certificate;
import java.security.cert.CertificateFactory;
import java.security.spec.PKCS8EncodedKeySpec;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Map;
import java.util.TimeZone;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.SynchronousQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;
import javax.net.ssl.KeyManagerFactory;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLServerSocket;

// Связь между устройствами (Melete DEV, слово автора 07.11.2026: «связь всех со всеми»): телефон тоже принимает
// подключения — тот же протокол, что у компьютера (src-tauri/src/sync.rs), решает страница (src/core/sync.js:
// handleRequest). Здесь только посредник без Android: TLS-сервер на порту, разбор HTTP/1.1, запрос — наружу
// (Handler.onRequest), ответ — reply(). Сертификат свой, постоянный: ключ RSA 2048 и самоподписанный X.509 создаются
// один раз и лежат в папке приложения; клиент запоминает отпечаток SHA-256 при сопряжении и дальше верит только ему.
public final class MeshServer {
    public interface Handler {
        void onRequest(long rid, String method, String url, String key, byte[] body);
        String hello(); // JSON ответа на /melete/v1/hello
    }
    static final int MAX_HEAD = 16 << 10, MAX_BODY = 32 << 20;
    private final File dir;
    private final Handler h;
    private final AtomicLong next = new AtomicLong(1);
    private final Map<Long, SynchronousQueue<Object[]>> waits = new ConcurrentHashMap<>();
    private volatile ServerSocket ss;
    private volatile boolean on = false;
    private ExecutorService pool;
    private byte[] certDer;

    public MeshServer(File dir, Handler h) { this.dir = dir; this.h = h; }

    public boolean isOn() { return on; }

    /* ---------- сертификат ---------- */

    private static byte[] der(int tag, byte[]... parts) {
        int n = 0; for (byte[] p : parts) n += p.length;
        ByteArrayOutputStream o = new ByteArrayOutputStream();
        o.write(tag);
        if (n < 128) o.write(n);
        else if (n < 256) { o.write(0x81); o.write(n); }
        else if (n < 65536) { o.write(0x82); o.write(n >> 8); o.write(n & 0xff); }
        else { o.write(0x83); o.write(n >> 16); o.write((n >> 8) & 0xff); o.write(n & 0xff); }
        for (byte[] p : parts) o.write(p, 0, p.length);
        return o.toByteArray();
    }
    private static byte[] seq(byte[]... p) { return der(0x30, p); }
    private static final byte[] SHA256_RSA = seq(der(0x06, new byte[] { 0x2a, (byte) 0x86, 0x48, (byte) 0x86, (byte) 0xf7, 0x0d, 0x01, 0x01, 0x0b }), new byte[] { 0x05, 0x00 });
    private static byte[] name(String cn) { return seq(der(0x31, seq(der(0x06, new byte[] { 0x55, 0x04, 0x03 }), der(0x0c, cn.getBytes(StandardCharsets.UTF_8))))); }
    private static byte[] time(Date d, boolean gen) {
        SimpleDateFormat f = new SimpleDateFormat(gen ? "yyyyMMddHHmmss'Z'" : "yyMMddHHmmss'Z'");
        f.setTimeZone(TimeZone.getTimeZone("UTC"));
        return der(gen ? 0x18 : 0x17, f.format(d).getBytes(StandardCharsets.US_ASCII));
    }
    // Самоподписанный сертификат X.509 v3 без расширений: ключ, имя «Melete», срок — 30 лет
    static byte[] selfSigned(KeyPair kp, String cn) throws Exception {
        byte[] serial = new BigInteger(63, new SecureRandom()).add(BigInteger.ONE).toByteArray();
        long now = System.currentTimeMillis();
        byte[] tbs = seq(der(0xa0, der(0x02, new byte[] { 2 })), der(0x02, serial), SHA256_RSA, name(cn),
            seq(time(new Date(now - 86400000L), false), time(new Date(now + 30L * 365 * 86400000L), true)), name(cn), kp.getPublic().getEncoded());
        Signature s = Signature.getInstance("SHA256withRSA");
        s.initSign(kp.getPrivate()); s.update(tbs);
        byte[] sig = s.sign(), bits = new byte[sig.length + 1];
        System.arraycopy(sig, 0, bits, 1, sig.length);
        return seq(tbs, SHA256_RSA, der(0x03, bits));
    }

    private static byte[] readAll(File f) throws Exception { // java.nio.file — только с Android 8, а приложению нужен 7
        try (InputStream in = new java.io.FileInputStream(f)) { ByteArrayOutputStream o = new ByteArrayOutputStream(); byte[] b = new byte[8192]; int n; while ((n = in.read(b)) > 0) o.write(b, 0, n); return o.toByteArray(); }
    }
    private SSLContext tls() throws Exception {
        if (!dir.isDirectory() && !dir.mkdirs()) throw new Exception("mkdir");
        File kf = new File(dir, "mesh.key"), cf = new File(dir, "mesh.der");
        PrivateKey pk;
        if (kf.isFile() && cf.isFile()) {
            pk = KeyFactory.getInstance("RSA").generatePrivate(new PKCS8EncodedKeySpec(readAll(kf)));
            certDer = readAll(cf);
        } else {
            KeyPairGenerator g = KeyPairGenerator.getInstance("RSA");
            g.initialize(2048);
            KeyPair kp = g.generateKeyPair();
            certDer = selfSigned(kp, "Melete");
            pk = kp.getPrivate();
            try (OutputStream o = new FileOutputStream(kf)) { o.write(pk.getEncoded()); }
            try (OutputStream o = new FileOutputStream(cf)) { o.write(certDer); }
        }
        Certificate cert = CertificateFactory.getInstance("X.509").generateCertificate(new java.io.ByteArrayInputStream(certDer));
        KeyStore ks = KeyStore.getInstance(KeyStore.getDefaultType());
        ks.load(null, null);
        char[] pw = "melete".toCharArray();
        ks.setKeyEntry("k", pk, pw, new Certificate[] { cert });
        KeyManagerFactory kmf = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm());
        kmf.init(ks, pw);
        SSLContext c = SSLContext.getInstance("TLS");
        c.init(kmf.getKeyManagers(), null, null);
        return c;
    }
    // Отпечаток сертификата: SHA-256 его DER, 64 знака hex — как у компьютера
    public String fp() {
        if (certDer == null) return "";
        try { StringBuilder sb = new StringBuilder(); for (byte b : MessageDigest.getInstance("SHA-256").digest(certDer)) sb.append(String.format("%02x", b)); return sb.toString(); }
        catch (Exception e) { return ""; }
    }

    /* ---------- сервер ---------- */

    public synchronized void start(int port) throws Exception {
        if (on) return;
        SSLContext c = tls();
        SSLServerSocket s = (SSLServerSocket) c.getServerSocketFactory().createServerSocket();
        s.setReuseAddress(true);
        s.bind(new InetSocketAddress(port));
        ss = s; on = true;
        pool = Executors.newFixedThreadPool(6);
        Thread acc = new Thread(() -> {
            while (on) {
                try { Socket k = ss.accept(); k.setSoTimeout(60000); pool.execute(() -> serve(k)); }
                catch (Exception e) { if (!on) break; }
            }
        }, "mesh-accept");
        acc.setDaemon(true);
        acc.start();
    }
    public synchronized void stop() {
        on = false;
        try { if (ss != null) ss.close(); } catch (Exception e) { /* уже */ }
        ss = null;
        if (pool != null) pool.shutdownNow();
        pool = null;
        for (SynchronousQueue<Object[]> q : waits.values()) q.offer(new Object[] { 503, "application/json", "{}".getBytes(StandardCharsets.UTF_8) });
    }
    // Ответ страницы на запрос rid
    public void reply(long rid, int status, String ctype, byte[] body) {
        SynchronousQueue<Object[]> q = waits.get(rid);
        if (q != null) q.offer(new Object[] { status, ctype, body });
    }

    private static int indexOf(byte[] a, int n, byte[] pat) {
        outer: for (int i = 0; i + pat.length <= n; i++) { for (int j = 0; j < pat.length; j++) if (a[i + j] != pat[j]) continue outer; return i; }
        return -1;
    }
    private void serve(Socket k) {
        try (Socket sock = k; InputStream in = sock.getInputStream(); OutputStream out = sock.getOutputStream()) {
            byte[] head = new byte[MAX_HEAD];
            int n = 0, end = -1;
            while (end < 0) {
                int r = in.read(head, n, head.length - n);
                if (r <= 0) return;
                n += r;
                end = indexOf(head, n, new byte[] { '\r', '\n', '\r', '\n' });
                if (end < 0 && n >= head.length) { send(out, 431, "text/plain", new byte[0]); return; }
            }
            String[] lines = new String(head, 0, end, StandardCharsets.ISO_8859_1).split("\r\n");
            String[] rl = lines[0].split(" ");
            if (rl.length < 2) { send(out, 400, "text/plain", new byte[0]); return; }
            String method = rl[0], url = rl[1], key = "";
            long len = 0;
            for (int i = 1; i < lines.length; i++) {
                int c = lines[i].indexOf(':');
                if (c < 0) continue;
                String nm = lines[i].substring(0, c).trim().toLowerCase(), v = lines[i].substring(c + 1).trim();
                if (nm.equals("content-length")) { try { len = Long.parseLong(v); } catch (Exception e) { len = -1; } }
                else if (nm.equals("x-melete-key")) key = v;
            }
            if (len < 0 || len > MAX_BODY) { send(out, 413, "text/plain", new byte[0]); return; }
            byte[] body = new byte[(int) len];
            int got = Math.min(n - end - 4, (int) len);
            System.arraycopy(head, end + 4, body, 0, got);
            while (got < len) { int r = in.read(body, got, (int) len - got); if (r <= 0) return; got += r; }
            if (url.startsWith("/melete/v1/hello")) { send(out, 200, "application/json", h.hello().getBytes(StandardCharsets.UTF_8)); return; }
            if (!url.startsWith("/melete/v1/")) { send(out, 404, "text/plain", new byte[0]); return; }
            long rid = next.getAndIncrement();
            SynchronousQueue<Object[]> q = new SynchronousQueue<>();
            waits.put(rid, q);
            Object[] res;
            try {
                h.onRequest(rid, method, url, key, body);
                res = q.poll(180, TimeUnit.SECONDS);
            } finally { waits.remove(rid); }
            if (res == null) { send(out, 504, "application/json", "{}".getBytes(StandardCharsets.UTF_8)); return; }
            send(out, (Integer) res[0], (String) res[1], (byte[]) res[2]);
        } catch (Exception e) { /* соединение оборвалось */ }
    }
    private static void send(OutputStream out, int status, String ctype, byte[] body) throws Exception {
        String h = "HTTP/1.1 " + status + " " + (status < 400 ? "OK" : "Error") + "\r\nContent-Type: " + ctype + "\r\nContent-Length: " + body.length + "\r\nConnection: close\r\n\r\n";
        out.write(h.getBytes(StandardCharsets.ISO_8859_1));
        out.write(body);
        out.flush();
    }
}
