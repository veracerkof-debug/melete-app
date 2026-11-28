package app.practice.beta;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioDeviceCallback;
import android.media.AudioDeviceInfo;
import android.media.AudioManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.List;

// Куда сейчас идёт звук (src/audio/route.js): список устройств вывода (динамик, наушники, Bluetooth, USB, HDMI), выбранное системой устройство
// и событие «route» при подключении и отключении. Только чтение: звук не переключается, разрешений не нужно (Bluetooth-доступ не запрашивается:
// имена берутся из AudioManager). Профили вывода (src/audio/profiles.js) привязаны к ключу «тип|имя».
@CapacitorPlugin(name = "AudioRoute")
public class AudioRoutePlugin extends Plugin {
    private AudioManager am;
    private AudioDeviceCallback cb;
    private final Handler h = new Handler(Looper.getMainLooper());
    private Runnable pending;

    @Override
    public void load() {
        try {
            am = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
            if (am == null || Build.VERSION.SDK_INT < 23) return;
            cb = new AudioDeviceCallback() {
                @Override public void onAudioDevicesAdded(AudioDeviceInfo[] added) { changed(); }
                @Override public void onAudioDevicesRemoved(AudioDeviceInfo[] removed) { changed(); }
            };
            am.registerAudioDeviceCallback(cb, h);
        } catch (Exception e) { /* без событий: JS спросит сам */ }
    }

    @Override
    protected void handleOnDestroy() {
        try { if (am != null && cb != null) am.unregisterAudioDeviceCallback(cb); } catch (Exception e) { /* */ }
    }

    // Подключения приходят пачкой (Bluetooth добавляет несколько профилей) — одно событие после паузы
    private void changed() {
        if (pending != null) h.removeCallbacks(pending);
        pending = new Runnable() { @Override public void run() { try { notifyListeners("route", describe(pick(outputs()))); } catch (Exception e) { /* */ } } };
        h.postDelayed(pending, 500);
    }

    private AudioDeviceInfo[] outputs() {
        if (am == null || Build.VERSION.SDK_INT < 23) return new AudioDeviceInfo[0];
        return am.getDevices(AudioManager.GET_DEVICES_OUTPUTS);
    }

    private static String typeName(int t) {
        switch (t) {
            case 2: return "speaker";
            case 1: return "earpiece";
            case 3: case 4: return "wired";
            case 8: return "bluetooth";
            case 7: return "bluetooth_call";
            case 11: case 22: case 12: return "usb";
            case 9: return "hdmi";
            case 23: case 26: case 27: case 30: return "ble";
            default: return "other";
        }
    }

    // Приоритет: что система выберет для музыки, если подключено несколько
    private static int rank(int t) {
        switch (t) {
            case 23: case 26: case 27: case 30: return 9;
            case 8: return 9;
            case 11: case 22: return 7;
            case 3: case 4: return 6;
            case 9: return 4;
            case 2: return 1;
            case 1: return 0;
            default: return 2;
        }
    }

    private AudioDeviceInfo pick(AudioDeviceInfo[] all) {
        try {
            if (Build.VERSION.SDK_INT >= 33 && am != null) {
                AudioAttributes aa = new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build();
                List<AudioDeviceInfo> l = am.getAudioDevicesForAttributes(aa);
                if (l != null && !l.isEmpty()) return l.get(0);
            }
        } catch (Exception e) { /* по приоритету */ }
        AudioDeviceInfo best = null;
        for (AudioDeviceInfo d : all) {
            if (!d.isSink()) continue;
            if (best == null || rank(d.getType()) > rank(best.getType())) best = d;
        }
        return best;
    }

    private JSObject describe(AudioDeviceInfo d) {
        JSObject o = new JSObject();
        if (d == null) { o.put("key", "none"); o.put("type", "none"); o.put("name", ""); return o; }
        String type = typeName(d.getType());
        CharSequence pn = d.getProductName();
        String name = pn == null ? "" : pn.toString().trim();
        o.put("type", type);
        o.put("name", name);
        o.put("key", type + "|" + name.toLowerCase());
        return o;
    }

    @PluginMethod
    public void current(PluginCall call) {
        try { call.resolve(describe(pick(outputs()))); } catch (Exception e) { call.reject(String.valueOf(e.getMessage())); }
    }

    @PluginMethod
    public void list(PluginCall call) {
        try {
            AudioDeviceInfo[] all = outputs();
            String cur = describe(pick(all)).getString("key");
            JSArray arr = new JSArray();
            for (AudioDeviceInfo d : all) {
                if (!d.isSink()) continue;
                JSObject o = describe(d);
                o.put("current", o.getString("key").equals(cur));
                arr.put(o);
            }
            JSObject r = new JSObject();
            r.put("items", arr);
            call.resolve(r);
        } catch (Exception e) { call.reject(String.valueOf(e.getMessage())); }
    }
}
