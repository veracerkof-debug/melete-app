package app.practice.beta;

import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;
import java.util.Iterator;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLHandshakeException;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

// Связь с компьютером (src/core/sync.js, src-tauri/src/sync.rs) по TLS с закреплённым отпечатком.
// У компьютера свой сертификат (не от удостоверяющего центра — его в своей сети не бывает); телефон при сопряжении
// запоминает отпечаток SHA-256 сертификата (pin пуст — принять и вернуть отпечаток), дальше верит только ему:
// другой сертификат — отказ с кодом "pin" (подмена или компьютер переустановлен — подключиться заново).
// Имя узла не проверяется: адрес — IP в своей сети, подлинность даёт отпечаток.
@CapacitorPlugin(name = "SyncHttp")
public class SyncHttpPlugin extends Plugin {
    private final ExecutorService pool = Executors.newCachedThreadPool(); // синхронизация и опрос ансамбля — параллельно

    static String hex(byte[] b) {
        StringBuilder s = new StringBuilder(b.length * 2);
        for (byte x : b) s.append(String.format("%02x", x & 0xff));
        return s.toString();
    }

    private static final class Pinned implements X509TrustManager {
        final String pin;
        volatile String seen = "";
        Pinned(String pin) { this.pin = pin == null ? "" : pin.toLowerCase(); }
        @Override public void checkClientTrusted(X509Certificate[] chain, String auth) throws CertificateException { throw new CertificateException("client"); }
        @Override public void checkServerTrusted(X509Certificate[] chain, String auth) throws CertificateException {
            if (chain == null || chain.length == 0) throw new CertificateException("empty");
            try { seen = hex(MessageDigest.getInstance("SHA-256").digest(chain[0].getEncoded())); }
            catch (Exception e) { throw new CertificateException(e); }
            if (!pin.isEmpty() && !pin.equals(seen)) throw new CertificateException("pin");
        }
        @Override public X509Certificate[] getAcceptedIssuers() { return new X509Certificate[0]; }
    }

    @PluginMethod
    public void request(PluginCall call) {
        pool.execute(() -> {
            HttpsURLConnection c = null;
            Pinned tm = new Pinned(call.getString("pin", ""));
            try {
                URL u = new URL(call.getString("url", ""));
                if (!"https".equals(u.getProtocol())) { call.reject("https only", "addr"); return; }
                SSLContext ctx = SSLContext.getInstance("TLS");
                ctx.init(null, new TrustManager[] { tm }, null);
                c = (HttpsURLConnection) u.openConnection();
                c.setSSLSocketFactory(ctx.getSocketFactory());
                c.setHostnameVerifier((h, s) -> true);
                c.setRequestMethod(call.getString("method", "GET"));
                c.setConnectTimeout(call.getInt("connectTimeout", 6000));
                c.setReadTimeout(call.getInt("readTimeout", 60000));
                c.setUseCaches(false);
                JSObject hs = call.getObject("headers", new JSObject());
                for (Iterator<String> it = hs.keys(); it.hasNext(); ) { String k = it.next(); c.setRequestProperty(k, hs.getString(k)); }
                String body = call.getString("body", null);
                if (body != null) {
                    byte[] b = body.getBytes(StandardCharsets.UTF_8);
                    c.setDoOutput(true);
                    c.setFixedLengthStreamingMode(b.length);
                    try (OutputStream o = c.getOutputStream()) { o.write(b); }
                }
                int status = c.getResponseCode();
                InputStream in = status >= 400 ? c.getErrorStream() : c.getInputStream();
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                if (in != null) { try (InputStream i = in) { byte[] buf = new byte[64 * 1024]; int n; while ((n = i.read(buf)) > 0) out.write(buf, 0, n); } }
                JSObject r = new JSObject();
                r.put("status", status);
                r.put("fp", tm.seen);
                r.put("data", call.getBoolean("bin", false) ? Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP) : new String(out.toByteArray(), StandardCharsets.UTF_8));
                call.resolve(r);
            } catch (SSLHandshakeException e) {
                // отпечаток не тот — отдельным кодом; прочие сбои рукопожатия (старый компьютер без TLS) — "tls"
                boolean pin = false;
                for (Throwable t = e; t != null; t = t.getCause()) if (t instanceof CertificateException && "pin".equals(t.getMessage())) pin = true;
                call.reject(pin ? "pin" : "tls", pin ? "pin" : "tls");
            } catch (Exception e) {
                call.reject(String.valueOf(e.getMessage()), "net");
            } finally {
                if (c != null) c.disconnect();
            }
        });
    }
}
