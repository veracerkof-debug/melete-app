package app.practice.beta;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.List;

// Автопоиск устройств Melete в сети (NetDiscovery.java). find — только по команде страницы (кнопка «Искать устройства»),
// с таймаутом; объявление этого телефона включается и выключается вместе с «Принимать подключения» (MeshPlugin).
@CapacitorPlugin(name = "NetDiscovery")
public class NetDiscoveryPlugin extends Plugin {
    @PluginMethod
    public void find(PluginCall call) {
        long ms = call.getLong("timeoutMs", 8000L);
        NetDiscovery.find(getContext(), ms, (List<NetDiscovery.Found> list) -> {
            JSArray a = new JSArray();
            for (NetDiscovery.Found f : list) {
                JSObject o = new JSObject();
                o.put("name", f.name); o.put("type", f.kind); o.put("addr", f.addr); o.put("port", f.port); o.put("id", f.id);
                a.put(o);
            }
            JSObject r = new JSObject();
            r.put("list", a);
            call.resolve(r);
        });
    }

    @PluginMethod
    public void info(PluginCall call) {
        JSObject r = new JSObject();
        r.put("announced", NetDiscovery.announced());
        call.resolve(r);
    }
}
