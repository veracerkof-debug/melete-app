package app.practice.beta;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.util.Collections;

// Какие сети сейчас есть: Wi-Fi (подключён ли), мобильная, и адрес в сети Wi-Fi. Нужен экрану «Устройства» и
// понятным ошибкам синхронизации (src/core/netinfo.js). Только чтение состояния, сеть не трогает.
@CapacitorPlugin(name = "NetInfo")
public class NetInfoPlugin extends Plugin {
    @PluginMethod
    public void info(PluginCall call) {
        JSObject r = new JSObject();
        r.put("wifi", NetBind.wifi(getContext()) != null);
        r.put("cellular", NetBind.cellular(getContext()));
        r.put("ip", wifiIp());
        call.resolve(r);
    }

    // Частный IPv4 с интерфейса wlan* (имя у производителей разное, но wlan — у всех обычных телефонов)
    private static String wifiIp() {
        try {
            for (NetworkInterface ni : Collections.list(NetworkInterface.getNetworkInterfaces())) {
                if (!ni.isUp() || ni.isLoopback() || !ni.getName().startsWith("wlan")) continue;
                for (InetAddress ad : Collections.list(ni.getInetAddresses())) {
                    if (ad instanceof Inet4Address && !ad.isLoopbackAddress() && NetBind.isPrivate(ad.getHostAddress())) return ad.getHostAddress();
                }
            }
        } catch (Exception e) { /* нет сети */ }
        return null;
    }
}
