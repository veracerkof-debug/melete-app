package app.practice.beta;

import android.content.Context;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.security.cert.CertificateException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLHandshakeException;
import javax.net.ssl.SSLSocket;
import javax.net.ssl.TrustManager;

// Канал событий в реальном времени (Melete DEV; src/core/link.js, linkhub.js, docs/link.md): постоянное соединение
// с компьютером поверх того же TLS с закреплённым отпечатком, что и у SyncHttp (Pinned). Длинное TCP-соединение:
// TCP_NODELAY (кадры уходят сразу, без склейки), keep-alive; после рукопожатия — «MLNK» + версия, дальше кадры
// [тип: 1][длина: 2, старший первым][нагрузка]. Кадры страница получает событием «frame» { t, d (base64) },
// конец соединения — «close» { reason }; отправка — send({ t, d }) без ответа (RETURN_NONE: не ждём мост).
// Пока канал открыт, держится WifiLock: WIFI_MODE_FULL_LOW_LATENCY (Android 10+, работает при включённом экране
// и приложении на виду), иначе FULL_HIGH_PERF — Wi-Fi не засыпает между редкими кадрами. Разрешение — WAKE_LOCK (уже есть).
// Запись — отдельным потоком из очереди: порядок кадров сохраняется, страница не ждёт сеть. Одно соединение за раз.
@CapacitorPlugin(name = "Link")
public class LinkPlugin extends Plugin {
    private static final byte[] PRE = { 'M', 'L', 'N', 'K', 1 };
    private static final int READ_TIMEOUT_MS = 12000; // пинги каждые 2 с; тишина дольше — соединение мёртво
    private final ExecutorService connector = Executors.newSingleThreadExecutor();
    private final ExecutorService writer = Executors.newSingleThreadExecutor();
    private volatile Session cur;
    private WifiManager.WifiLock wifi;

    private static final class Session {
        final SSLSocket sock;
        final OutputStream out;
        volatile boolean closed;
        Session(SSLSocket s, OutputStream o) { sock = s; out = o; }
        void kill() { closed = true; try { sock.close(); } catch (IOException ignored) { } }
    }

    private void lockWifi() {
        try {
            if (wifi == null) {
                WifiManager wm = (WifiManager) getContext().getApplicationContext().getSystemService(Context.WIFI_SERVICE);
                if (wm == null) return;
                wifi = wm.createWifiLock(Build.VERSION.SDK_INT >= 29 ? WifiManager.WIFI_MODE_FULL_LOW_LATENCY : WifiManager.WIFI_MODE_FULL_HIGH_PERF, "melete:link");
                wifi.setReferenceCounted(false);
            }
            if (!wifi.isHeld()) wifi.acquire();
        } catch (Exception ignored) { /* нет Wi-Fi или нет права — канал работает и без замка */ }
    }
    private void unlockWifi() {
        try { if (wifi != null && wifi.isHeld()) wifi.release(); } catch (Exception ignored) { }
    }

    // connect({ host, port, pin, timeout }) → { fp }; отказ с кодом "pin" (не тот сертификат), "tls", "net"
    @PluginMethod
    public void connect(PluginCall call) {
        connector.execute(() -> {
            Session old = cur;
            if (old != null) old.kill();
            SyncHttpPlugin.Pinned tm = new SyncHttpPlugin.Pinned(call.getString("pin", ""));
            Socket raw = null;
            try {
                String host = call.getString("host", "");
                int port = call.getInt("port", 53329), timeout = call.getInt("timeout", 4000);
                SSLContext ctx = SSLContext.getInstance("TLS");
                ctx.init(null, new TrustManager[] { tm }, null);
                raw = new Socket();
                raw.setTcpNoDelay(true);
                raw.setKeepAlive(true);
                raw.connect(new InetSocketAddress(host, port), timeout);
                SSLSocket s = (SSLSocket) ctx.getSocketFactory().createSocket(raw, host, port, true);
                s.setSoTimeout(timeout); // на время рукопожатия
                s.startHandshake();
                s.setSoTimeout(READ_TIMEOUT_MS);
                OutputStream out = s.getOutputStream();
                out.write(PRE); out.flush();
                Session se = new Session(s, out);
                cur = se;
                lockWifi();
                new Thread(() -> read(se), "link-read").start();
                JSObject r = new JSObject();
                r.put("fp", tm.seen);
                call.resolve(r);
            } catch (SSLHandshakeException e) {
                boolean pin = false;
                for (Throwable t = e; t != null; t = t.getCause()) if (t instanceof CertificateException && "pin".equals(t.getMessage())) pin = true;
                if (raw != null) try { raw.close(); } catch (IOException ignored) { }
                call.reject(pin ? "pin" : "tls", pin ? "pin" : "tls");
            } catch (Exception e) {
                if (raw != null) try { raw.close(); } catch (IOException ignored) { }
                call.reject(String.valueOf(e.getMessage()), "net");
            }
        });
    }

    // Чтение кадров: заголовок 3 байта, потом нагрузка; каждый кадр — странице
    private void read(Session se) {
        String reason = "net";
        try {
            InputStream in = se.sock.getInputStream();
            byte[] head = new byte[3];
            while (!se.closed) {
                readFully(in, head, 3);
                int type = head[0] & 0xff, len = ((head[1] & 0xff) << 8) | (head[2] & 0xff);
                if (type == 0) { reason = "proto"; break; }
                byte[] p = new byte[len];
                readFully(in, p, len);
                if (cur != se) break;
                JSObject e = new JSObject();
                e.put("t", type);
                e.put("d", len > 0 ? Base64.encodeToString(p, Base64.NO_WRAP) : "");
                notifyListeners("frame", e);
            }
        } catch (java.net.SocketTimeoutException e) {
            reason = "timeout";
        } catch (Exception e) {
            reason = se.closed ? "closed" : "net";
        }
        boolean mine = cur == se;
        se.kill();
        if (mine) { cur = null; unlockWifi(); }
        if (!mine) return; // соединение уже заменено новым — странице о нём знать не нужно
        JSObject e = new JSObject();
        e.put("reason", reason);
        notifyListeners("close", e);
    }

    private static void readFully(InputStream in, byte[] b, int n) throws IOException {
        int off = 0;
        while (off < n) { int k = in.read(b, off, n - off); if (k < 0) throw new IOException("eof"); off += k; }
    }

    // send({ t, d }) — кадр в очередь записи; без ответа
    @PluginMethod(returnType = PluginMethod.RETURN_NONE)
    public void send(PluginCall call) {
        final Session se = cur;
        if (se == null) return;
        int t = call.getInt("t", 0);
        String d = call.getString("d", "");
        final byte[] p = d == null || d.isEmpty() ? new byte[0] : Base64.decode(d, Base64.NO_WRAP);
        if (t < 1 || t > 255 || p.length > 0xffff) return;
        final byte[] f = new byte[3 + p.length];
        f[0] = (byte) t; f[1] = (byte) (p.length >> 8); f[2] = (byte) (p.length & 0xff);
        System.arraycopy(p, 0, f, 3, p.length);
        writer.execute(() -> {
            if (se.closed) return;
            try { synchronized (se.out) { se.out.write(f); se.out.flush(); } }
            catch (IOException e) { se.kill(); }
        });
    }

    @PluginMethod
    public void close(PluginCall call) {
        Session se = cur;
        // закрытие — после уже поставленных в очередь кадров (BYE)
        writer.execute(() -> { if (se != null) se.kill(); });
        call.resolve();
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject r = new JSObject();
        r.put("open", cur != null && !cur.closed);
        r.put("wifiLock", wifi != null && wifi.isHeld());
        r.put("lowLatency", Build.VERSION.SDK_INT >= 29);
        call.resolve(r);
    }

    @Override
    protected void handleOnDestroy() {
        Session se = cur;
        if (se != null) se.kill();
        unlockWifi();
    }
}
