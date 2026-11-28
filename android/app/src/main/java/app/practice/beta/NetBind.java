package app.practice.beta;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;

// Локальная связь между своими устройствами (синхронизация, пульт) обязана идти по Wi-Fi: если Wi-Fi «без интернета»
// или включено умное переключение («Wi-Fi+»), Android отправляет обычный трафик приложения через мобильную сеть, и адрес
// 192.168.x.x недостижим («Failed to connect … from /10.x.x.x»). Поэтому такие соединения привязываются к сети Wi-Fi
// (Network.openConnection / Network.getSocketFactory) — только они; процесс целиком (bindProcessToNetwork) не трогаем.
// Не частный адрес или нет Wi-Fi — прежнее поведение (привязки нет). Та же логика в JS: src/core/netinfo.js: bindFor.
final class NetBind {
    private NetBind() { }

    // 10/8, 172.16/12, 192.168/16, 169.254/16 — как nearAddrs в sync.js (плюс link-local)
    static boolean isPrivate(String host) {
        if (host == null) return false;
        String[] p = host.trim().split("\\.");
        if (p.length != 4) return false;
        int[] n = new int[4];
        try {
            for (int i = 0; i < 4; i++) { n[i] = Integer.parseInt(p[i]); if (n[i] < 0 || n[i] > 255) return false; }
        } catch (NumberFormatException e) { return false; }
        return n[0] == 10 || (n[0] == 172 && n[1] >= 16 && n[1] <= 31) || (n[0] == 192 && n[1] == 168) || (n[0] == 169 && n[1] == 254);
    }

    private static boolean has(ConnectivityManager cm, Network n, int transport) {
        try { NetworkCapabilities c = cm.getNetworkCapabilities(n); return c != null && c.hasTransport(transport); }
        catch (Exception e) { return false; }
    }

    // Сеть Wi-Fi (подключённая, пусть и без интернета) или null
    @SuppressWarnings("deprecation")
    static Network wifi(Context ctx) {
        try {
            ConnectivityManager cm = (ConnectivityManager) ctx.getSystemService(Context.CONNECTIVITY_SERVICE);
            if (cm == null) return null;
            Network[] all = cm.getAllNetworks();
            if (all == null) return null;
            for (Network n : all) if (has(cm, n, NetworkCapabilities.TRANSPORT_WIFI)) return n;
        } catch (Exception e) { /* нет разрешения или сети — без привязки */ }
        return null;
    }

    @SuppressWarnings("deprecation")
    static boolean cellular(Context ctx) {
        try {
            ConnectivityManager cm = (ConnectivityManager) ctx.getSystemService(Context.CONNECTIVITY_SERVICE);
            if (cm == null) return false;
            Network[] all = cm.getAllNetworks();
            if (all != null) for (Network n : all) if (has(cm, n, NetworkCapabilities.TRANSPORT_CELLULAR)) return true;
        } catch (Exception e) { /* неизвестно */ }
        return false;
    }

    // Сеть для адреса host: Wi-Fi, если адрес частный и Wi-Fi есть; иначе null (прежнее поведение)
    static Network forHost(Context ctx, String host) {
        return isPrivate(host) ? wifi(ctx) : null;
    }

    static String label(Network n) { return n != null ? "wifi" : "default"; }
}
