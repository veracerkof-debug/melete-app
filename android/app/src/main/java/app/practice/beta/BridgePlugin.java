package app.practice.beta;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// Мост с главным экраном Ἐλάχιστον (docs/launcher-bridge.md; src/core/bridge.js). Подписи у приложений разные,
// поэтому рассылки адресные (setPackage) — только в пакеты главного экрана; приёмник запросов и управления —
// BridgeReceiver. Переходы: melete://free | session | bible (или extra melete.route) → событие route на странице
@CapacitorPlugin(name = "Bridge")
public class BridgePlugin extends Plugin {
    static final String STATE = "app.melete.bridge.STATE", REQUEST = "app.melete.bridge.REQUEST", CONTROL = "app.melete.bridge.CONTROL";
    static final String[] LAUNCHERS = { "app.elachiston", "app.elachiston.dev" };
    private static final String PREFS = "melete.bridge";
    private String pending = null;

    // Состояние — в оба пакета главного экрана (кого нет — тот не получит)
    static void send(Context c, String json) {
        if (json == null || json.isEmpty()) return;
        for (String p : LAUNCHERS) {
            try { c.sendBroadcast(new Intent(STATE).setPackage(p).putExtra("state", json).putExtra("pkg", c.getPackageName())); } catch (Exception ignored) { }
        }
    }
    static String last(Context c) { return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("state", null); }

    // Маршрут из намерения: melete://free → free; или extra melete.route
    static String routeOf(Intent i) {
        if (i == null) return null;
        String r = i.getStringExtra("melete.route");
        Uri u = i.getData();
        if (r == null && u != null && "melete".equals(u.getScheme())) r = u.getHost();
        return r == null || !r.matches("free|session|bible") ? null : r;
    }

    @Override
    public void load() { pending = routeOf(getActivity() != null ? getActivity().getIntent() : null); }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        String r = routeOf(intent);
        if (r == null) return;
        JSObject o = new JSObject();
        o.put("route", r);
        notifyListeners("route", o);
    }

    // { state } — страница сообщила новое состояние: запомнить (для ответа на запрос) и разослать
    @PluginMethod
    public void publish(PluginCall call) {
        String s = call.getString("state", null);
        if (s != null) {
            getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("state", s).apply();
            send(getContext(), s);
        }
        call.resolve();
    }

    // Маршрут, с которым приложение открыли (один раз)
    @PluginMethod
    public void route(PluginCall call) {
        JSObject o = new JSObject();
        o.put("route", pending);
        pending = null;
        call.resolve(o);
    }
}
