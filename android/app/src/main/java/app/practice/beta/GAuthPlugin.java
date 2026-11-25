package app.practice.beta;

import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// Вход Google (core/gauth.js): открыть страницу входа в системном браузере. Возврат — схема com.googleusercontent.apps.…
// (intent-filter в манифесте) → Capacitor appUrlOpen. Ничего, кроме адреса страницы входа, сюда не приходит.
@CapacitorPlugin(name = "GAuth")
public class GAuthPlugin extends Plugin {
    @PluginMethod
    public void open(PluginCall call) {
        String url = call.getString("url", "");
        if (!url.startsWith("https://accounts.google.com/")) { call.reject("bad url"); return; }
        try {
            Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            call.resolve();
        } catch (Exception e) { call.reject(String.valueOf(e.getMessage())); }
    }
}
