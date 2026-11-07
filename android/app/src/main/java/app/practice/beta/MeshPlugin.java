package app.practice.beta;

import android.os.Build;
import android.util.Base64;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.util.Collections;

// Телефон принимает подключения других устройств Melete (MeshServer: TLS, свой сертификат) — связь всех со всеми
// в Melete DEV. Запрос уходит странице событием "req" { rid, method, url, key, b64 }, ответ — reply({ rid, status,
// ctype, b64 }); решает страница (src/core/sync.js). Сервер включается переключателем (сеть — по воле человека)
// и живёт, пока живо приложение.
@CapacitorPlugin(name = "Mesh")
public class MeshPlugin extends Plugin {
    private MeshServer srv;

    private MeshServer srv() {
        if (srv == null) srv = new MeshServer(new File(getContext().getFilesDir(), "mesh"), new MeshServer.Handler() {
            @Override public void onRequest(long rid, String method, String url, String key, byte[] body) {
                JSObject e = new JSObject();
                e.put("rid", rid); e.put("method", method); e.put("url", url); e.put("key", key);
                e.put("b64", body.length > 0 ? Base64.encodeToString(body, Base64.NO_WRAP) : "");
                notifyListeners("req", e);
            }
            @Override public String hello() {
                JSObject o = new JSObject();
                o.put("app", "melete"); o.put("v", 1); o.put("name", name()); o.put("kind", "phone");
                return o.toString();
            }
        });
        return srv;
    }
    private static String name() { String m = Build.MODEL; return m == null || m.isEmpty() ? "Android" : m; }

    private static JSArray ips() {
        JSArray a = new JSArray();
        try {
            for (NetworkInterface ni : Collections.list(NetworkInterface.getNetworkInterfaces())) {
                if (!ni.isUp() || ni.isLoopback()) continue;
                for (InetAddress ad : Collections.list(ni.getInetAddresses())) {
                    if (ad instanceof Inet4Address && !ad.isLoopbackAddress() && !ad.isLinkLocalAddress()) a.put(ad.getHostAddress());
                }
            }
        } catch (Exception e) { /* сети нет */ }
        return a;
    }

    private JSObject status() {
        JSObject r = new JSObject();
        r.put("on", srv != null && srv.isOn());
        r.put("ips", ips());
        r.put("name", name());
        r.put("fp", srv != null ? srv.fp() : "");
        return r;
    }

    @PluginMethod
    public void start(PluginCall call) {
        int port = call.getInt("port", 53329);
        new Thread(() -> {
            try { srv().start(port); call.resolve(status()); }
            catch (Exception e) { call.reject(String.valueOf(e.getMessage()), "port"); }
        }, "mesh-start").start();
    }

    @PluginMethod
    public void stop(PluginCall call) { if (srv != null) srv.stop(); call.resolve(status()); }

    @PluginMethod
    public void info(PluginCall call) { call.resolve(status()); }

    @PluginMethod
    public void reply(PluginCall call) {
        long rid = call.getLong("rid", 0L);
        int st = call.getInt("status", 500);
        String ct = call.getString("ctype", "application/json"), b = call.getString("b64", "");
        if (srv != null) srv.reply(rid, st, ct, b == null || b.isEmpty() ? new byte[0] : Base64.decode(b, Base64.NO_WRAP));
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() { if (srv != null) srv.stop(); }
}
