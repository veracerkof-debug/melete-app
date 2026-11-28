package app.practice.beta;

import android.content.Context;
import android.net.nsd.NsdManager;
import android.net.nsd.NsdServiceInfo;
import android.os.Handler;
import android.os.Looper;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.util.ArrayList;
import java.util.List;

// Автопоиск устройств Melete в локальной сети (docs/ecosystem.md, «Автопоиск»): служба NSD `_melete._tcp`.
// Объявление — ТОЛЬКО пока включён приём подключений (MeshPlugin.start/stop): тип, имя, порт, версия и первые 8 символов
// отпечатка — никаких ключей, кодов и данных. Поиск — ТОЛЬКО по команде страницы (NetDiscoveryPlugin.find), с таймаутом.
// Сопряжение остаётся по коду; автопоиск ничего не сопрягает. Любой сбой NSD — тихо «ничего не найдено».
// Компьютер объявляет ту же службу по mDNS (src-tauri/src/discover.rs).
final class NetDiscovery {
    private NetDiscovery() { }

    static final String TYPE = "_melete._tcp.";

    static final class Found {
        final String name, kind, addr, id; final int port;
        Found(String name, String kind, String addr, int port, String id) { this.name = name; this.kind = kind; this.addr = addr; this.port = port; this.id = id; }
    }

    interface Done { void done(List<Found> list); }

    private static NsdManager.RegistrationListener reg;
    private static NsdManager regMgr;

    private static NsdManager mgr(Context ctx) {
        try { return (NsdManager) ctx.getApplicationContext().getSystemService(Context.NSD_SERVICE); } catch (Exception e) { return null; }
    }

    // Имя экземпляра службы — безопасное для DNS-SD
    static String instance(String name) {
        String s = name == null ? "" : name.replaceAll("[^\\p{L}\\p{N}\\- ]", "-").trim();
        if (s.length() > 40) s = s.substring(0, 40);
        return "Melete-" + (s.isEmpty() ? "phone" : s);
    }

    // Объявить себя. Повторный вызов заменяет прежнее объявление
    static synchronized void announce(Context ctx, String name, int port, String fp8) {
        unannounce();
        NsdManager m = mgr(ctx);
        if (m == null || port <= 0) return;
        try {
            NsdServiceInfo si = new NsdServiceInfo();
            si.setServiceName(instance(name));
            si.setServiceType(TYPE);
            si.setPort(port);
            si.setAttribute("type", "phone");
            si.setAttribute("v", "1");
            si.setAttribute("name", name == null ? "" : name);
            if (fp8 != null && !fp8.isEmpty()) si.setAttribute("fp8", fp8.length() > 8 ? fp8.substring(0, 8) : fp8);
            NsdManager.RegistrationListener l = new NsdManager.RegistrationListener() {
                @Override public void onRegistrationFailed(NsdServiceInfo s, int code) { synchronized (NetDiscovery.class) { if (reg == this) reg = null; } }
                @Override public void onUnregistrationFailed(NsdServiceInfo s, int code) { }
                @Override public void onServiceRegistered(NsdServiceInfo s) { }
                @Override public void onServiceUnregistered(NsdServiceInfo s) { }
            };
            m.registerService(si, NsdManager.PROTOCOL_DNS_SD, l);
            reg = l; regMgr = m;
        } catch (Exception e) { reg = null; regMgr = null; }
    }

    static synchronized void unannounce() {
        try { if (reg != null && regMgr != null) regMgr.unregisterService(reg); } catch (Exception e) { /* уже снято */ }
        reg = null; regMgr = null;
    }

    static synchronized boolean announced() { return reg != null; }

    // Искать timeoutMs миллисекунд, затем один раз вызвать done (в любом потоке). Не бросает
    static void find(Context ctx, long timeoutMs, Done done) {
        final NsdManager m = mgr(ctx);
        if (m == null) { done.done(new ArrayList<>()); return; }
        final long ms = Math.max(500, Math.min(15000, timeoutMs));
        final Handler h = new Handler(Looper.getMainLooper());
        final List<Found> out = new ArrayList<>();
        final List<NsdServiceInfo> queue = new ArrayList<>();
        final boolean[] state = { false, false }; // [0] — закончено, [1] — идёт разбор одной службы
        final NsdManager.DiscoveryListener[] dl = new NsdManager.DiscoveryListener[1];

        final Runnable[] next = new Runnable[1];
        next[0] = () -> {
            synchronized (out) {
                if (state[0] || state[1] || queue.isEmpty()) return;
                state[1] = true;
            }
            NsdServiceInfo s; synchronized (out) { s = queue.remove(0); }
            try {
                m.resolveService(s, new NsdManager.ResolveListener() {
                    @Override public void onResolveFailed(NsdServiceInfo i, int code) { synchronized (out) { state[1] = false; } h.post(next[0]); }
                    @Override public void onServiceResolved(NsdServiceInfo i) {
                        try {
                            InetAddress a = i.getHost();
                            if (a instanceof Inet4Address && i.getPort() > 0) {
                                String ip = a.getHostAddress();
                                String kind = "phone".equals(attr(i, "type")) ? "phone" : "desktop";
                                String name = attr(i, "name");
                                if (name.isEmpty()) name = i.getServiceName() == null ? "Melete" : i.getServiceName().replaceFirst("^Melete-", "");
                                String fp8 = attr(i, "fp8");
                                String id = fp8.isEmpty() ? ip + ":" + i.getPort() : fp8;
                                synchronized (out) {
                                    boolean dup = false;
                                    for (Found f : out) if (f.addr.equals(ip) && f.port == i.getPort()) dup = true;
                                    if (!dup) out.add(new Found(name, kind, ip, i.getPort(), id));
                                }
                            }
                        } catch (Exception e) { /* пропустить */ }
                        synchronized (out) { state[1] = false; }
                        h.post(next[0]);
                    }
                });
            } catch (Exception e) { synchronized (out) { state[1] = false; } h.post(next[0]); }
        };

        final Runnable finish = () -> {
            List<Found> res;
            synchronized (out) { if (state[0]) return; state[0] = true; res = new ArrayList<>(out); }
            try { if (dl[0] != null) m.stopServiceDiscovery(dl[0]); } catch (Exception e) { /* не запущен */ }
            done.done(res);
        };

        dl[0] = new NsdManager.DiscoveryListener() {
            @Override public void onStartDiscoveryFailed(String t, int code) { h.post(finish); }
            @Override public void onStopDiscoveryFailed(String t, int code) { }
            @Override public void onDiscoveryStarted(String t) { }
            @Override public void onDiscoveryStopped(String t) { }
            @Override public void onServiceLost(NsdServiceInfo s) { }
            @Override public void onServiceFound(NsdServiceInfo s) {
                synchronized (out) { if (state[0]) return; queue.add(s); }
                h.post(next[0]);
            }
        };
        try {
            m.discoverServices(TYPE, NsdManager.PROTOCOL_DNS_SD, dl[0]);
            h.postDelayed(finish, ms);
        } catch (Exception e) { h.post(finish); }
    }

    private static String attr(NsdServiceInfo i, String k) {
        try {
            byte[] b = i.getAttributes().get(k);
            return b == null ? "" : new String(b, "UTF-8");
        } catch (Exception e) { return ""; }
    }
}
