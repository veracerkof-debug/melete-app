package app.elachiston;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.database.Cursor;
import android.media.MediaMetadata;
import android.media.session.MediaController;
import android.media.session.MediaSessionManager;
import android.media.session.PlaybackState;
import android.net.Uri;
import android.provider.AlarmClock;
import android.provider.DocumentsContract;
import android.provider.MediaStore;
import android.provider.Settings;
import androidx.activity.result.ActivityResult;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.List;

// Мост главного экрана (src/launcher/native.js): приложения и запуск, приложения по ролям, «что играет»
// (медиасессии других приложений — по доступу к уведомлениям), главный экран системы, папка Melete (SAF, только чтение)
// и запуск Melete.
@CapacitorPlugin(name = "Launcher")
public class LauncherPlugin extends Plugin {
    // Melete: основной и DEV (docs/launcher.md, мост с Melete)
    private static final String[] MELETE = { "app.melete", "app.melete.dev" };

    private PackageManager pm() { return getContext().getPackageManager(); }

    private static String clean(CharSequence s) { return s == null ? "" : s.toString(); }

    private boolean start(Intent i) {
        try {
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            return true;
        } catch (Exception e) { return false; }
    }

    /* ---------- приложения ---------- */

    @PluginMethod
    public void apps(PluginCall call) {
        Intent main = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER);
        List<ResolveInfo> list = pm().queryIntentActivities(main, 0);
        HashSet<String> seen = new HashSet<>();
        String self = getContext().getPackageName();
        JSArray out = new JSArray();
        for (ResolveInfo ri : list) {
            ActivityInfo ai = ri.activityInfo;
            if (ai == null || !seen.add(ai.packageName)) continue; // одно приложение — одна строка
            JSObject o = new JSObject();
            o.put("pkg", ai.packageName);
            o.put("label", clean(ri.loadLabel(pm())));
            o.put("self", ai.packageName.equals(self));
            out.put(o);
        }
        JSObject r = new JSObject();
        r.put("apps", out);
        call.resolve(r);
    }

    // Родной значок приложения картинкой (PNG, data: URL) — для своих мест на главном (DECISIONS 2026-10-29).
    // Берётся у системы в момент показа: в Elachiston чужие значки не хранятся. Цвет снимает страница (ч/б фильтр).
    @PluginMethod
    public void appIcon(PluginCall call) {
        String pkg = call.getString("pkg");
        int size = Math.max(24, Math.min(256, call.getInt("size", 96)));
        if (pkg == null) { call.reject("no pkg"); return; }
        try {
            android.graphics.drawable.Drawable d = pm().getApplicationIcon(pkg);
            android.graphics.Bitmap bmp = android.graphics.Bitmap.createBitmap(size, size, android.graphics.Bitmap.Config.ARGB_8888);
            android.graphics.Canvas c = new android.graphics.Canvas(bmp);
            d.setBounds(0, 0, size, size);
            d.draw(c);
            ByteArrayOutputStream bo = new ByteArrayOutputStream();
            bmp.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, bo);
            bmp.recycle();
            JSObject r = new JSObject();
            r.put("src", "data:image/png;base64," + android.util.Base64.encodeToString(bo.toByteArray(), android.util.Base64.NO_WRAP));
            call.resolve(r);
        } catch (Exception e) {
            call.reject("no icon");
        }
    }

    private String handlerOf(Intent i) {
        try {
            ResolveInfo ri = pm().resolveActivity(i, PackageManager.MATCH_DEFAULT_ONLY);
            if (ri == null || ri.activityInfo == null) return null;
            String p = ri.activityInfo.packageName;
            return "android".equals(p) ? null : p; // «выбор приложения» системы — не роль
        } catch (Exception e) { return null; }
    }

    private static Intent selector(String category) { return Intent.makeMainSelectorActivity(Intent.ACTION_MAIN, category); }

    // Приложения по ролям — для главного экрана и значков по умолчанию
    @PluginMethod
    public void roles(PluginCall call) {
        JSObject r = new JSObject();
        r.put("phone", handlerOf(new Intent(Intent.ACTION_DIAL)));
        r.put("sms", handlerOf(selector(Intent.CATEGORY_APP_MESSAGING)));
        r.put("camera", handlerOf(new Intent(MediaStore.INTENT_ACTION_STILL_IMAGE_CAMERA)));
        r.put("browser", handlerOf(selector(Intent.CATEGORY_APP_BROWSER)));
        r.put("calendar", handlerOf(selector(Intent.CATEGORY_APP_CALENDAR)));
        r.put("clock", handlerOf(new Intent(AlarmClock.ACTION_SHOW_ALARMS)));
        r.put("music", handlerOf(selector(Intent.CATEGORY_APP_MUSIC)));
        r.put("maps", handlerOf(selector(Intent.CATEGORY_APP_MAPS)));
        r.put("mail", handlerOf(selector(Intent.CATEGORY_APP_EMAIL)));
        r.put("gallery", handlerOf(selector(Intent.CATEGORY_APP_GALLERY)));
        call.resolve(r);
    }

    @PluginMethod
    public void launch(PluginCall call) {
        String pkg = call.getString("pkg");
        Intent i = pkg == null ? null : pm().getLaunchIntentForPackage(pkg);
        if (i == null || !start(i)) { call.reject("not found"); return; }
        call.resolve();
    }

    // Действие системы по имени (команды значков и жестов) или ссылка: https:, tel:, intent:…
    @PluginMethod
    public void open(PluginCall call) {
        String what = call.getString("what", "");
        Intent i;
        switch (what) {
            case "alarms": i = new Intent(AlarmClock.ACTION_SHOW_ALARMS); break;
            case "timer": i = new Intent(AlarmClock.ACTION_SET_TIMER); break;
            case "camera": i = new Intent(MediaStore.INTENT_ACTION_STILL_IMAGE_CAMERA); break;
            case "video": i = new Intent(MediaStore.INTENT_ACTION_VIDEO_CAMERA); break;
            case "dial": i = new Intent(Intent.ACTION_DIAL); break;
            case "settings": i = new Intent(Settings.ACTION_SETTINGS); break;
            case "wifi": i = new Intent(Settings.ACTION_WIFI_SETTINGS); break;
            case "bluetooth": i = new Intent(Settings.ACTION_BLUETOOTH_SETTINGS); break;
            case "url":
                String url = call.getString("url", "");
                try {
                    i = url.startsWith("intent:") ? Intent.parseUri(url, Intent.URI_INTENT_SCHEME) : new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    i.addCategory(Intent.CATEGORY_BROWSABLE);
                    i.setComponent(null); // ссылка не открывает закрытые окна чужих приложений
                    i.setSelector(null);
                } catch (Exception e) { call.reject("bad url"); return; }
                break;
            default: call.reject("unknown"); return;
        }
        if (!start(i)) { call.reject("no app"); return; }
        call.resolve();
    }

    // «О приложении» в настройках системы (меню удержания в списке приложений)
    @PluginMethod
    public void appInfo(PluginCall call) {
        start(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + call.getString("pkg", ""))));
        call.resolve();
    }

    /* ---------- что играет ---------- */

    private boolean hasMediaAccess() {
        return NotificationManagerCompat.getEnabledListenerPackages(getContext()).contains(getContext().getPackageName());
    }

    private static boolean isPlaying(MediaController c) {
        PlaybackState st = c.getPlaybackState();
        return st != null && st.getState() == PlaybackState.STATE_PLAYING;
    }

    // Играющая сессия, иначе первая с названием
    private MediaController activeController() {
        MediaSessionManager m = (MediaSessionManager) getContext().getSystemService(Context.MEDIA_SESSION_SERVICE);
        List<MediaController> list = m.getActiveSessions(new ComponentName(getContext(), LauncherMedia.class));
        MediaController fallback = null;
        for (MediaController c : list) {
            if (isPlaying(c)) return c;
            if (fallback == null && c.getMetadata() != null) fallback = c;
        }
        return fallback;
    }

    @PluginMethod
    public void mediaState(PluginCall call) {
        JSObject r = new JSObject();
        boolean access = hasMediaAccess();
        r.put("access", access);
        r.put("active", false);
        if (!access) { call.resolve(r); return; }
        try {
            MediaController c = activeController();
            if (c != null) {
                r.put("active", true);
                r.put("playing", isPlaying(c));
                MediaMetadata md = c.getMetadata();
                if (md != null) {
                    r.put("title", md.getString(MediaMetadata.METADATA_KEY_TITLE));
                    String artist = md.getString(MediaMetadata.METADATA_KEY_ARTIST);
                    if (artist == null) artist = md.getString(MediaMetadata.METADATA_KEY_ALBUM_ARTIST);
                    r.put("artist", artist);
                }
                String pkg = c.getPackageName();
                r.put("pkg", pkg);
                try { r.put("app", clean(pm().getApplicationLabel(pm().getApplicationInfo(pkg, 0)))); } catch (PackageManager.NameNotFoundException ignored) { }
            }
        } catch (SecurityException e) {
            r.put("access", false);
        }
        call.resolve(r);
    }

    @PluginMethod
    public void mediaCommand(PluginCall call) {
        String cmd = call.getString("cmd", "toggle");
        try {
            MediaController c = activeController();
            if (c == null) { call.reject("no session"); return; }
            MediaController.TransportControls t = c.getTransportControls();
            if ("next".equals(cmd)) t.skipToNext();
            else if ("prev".equals(cmd)) t.skipToPrevious();
            else if (isPlaying(c)) t.pause();
            else t.play();
            call.resolve();
        } catch (SecurityException e) {
            call.reject("no access");
        }
    }

    @PluginMethod
    public void openMediaAccess(PluginCall call) {
        start(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS));
        call.resolve();
    }

    /* ---------- главный экран системы ---------- */

    @PluginMethod
    public void homeState(PluginCall call) {
        Intent h = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME);
        ResolveInfo ri = pm().resolveActivity(h, PackageManager.MATCH_DEFAULT_ONLY);
        JSObject r = new JSObject();
        r.put("isDefault", ri != null && ri.activityInfo != null && getContext().getPackageName().equals(ri.activityInfo.packageName));
        call.resolve(r);
    }

    @PluginMethod
    public void openHomeSettings(PluginCall call) {
        if (!start(new Intent(Settings.ACTION_HOME_SETTINGS))) start(new Intent(Settings.ACTION_SETTINGS));
        call.resolve();
    }

    /* ---------- мост с Melete ---------- */

    // Открыть Melete: основной, иначе DEV. route — экран (docs/launcher-bridge.md): free — свободная практика,
    // bible — чтение дня, session — идущее занятие. Melete без поддержки маршрутов откроется как обычно.
    @PluginMethod
    public void openMelete(PluginCall call) {
        String route = call.getString("route");
        for (String p : MELETE) {
            Intent launch = pm().getLaunchIntentForPackage(p);
            if (launch == null) continue;
            if (route != null && !route.isEmpty()) {
                Intent v = new Intent(Intent.ACTION_VIEW, Uri.parse("melete://" + route)).setPackage(p)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                if (v.resolveActivity(pm()) != null && start(v)) { call.resolve(); return; }
                launch.putExtra("melete.route", route); // запасной путь: Melete читает extra при запуске
            }
            if (start(launch)) { call.resolve(); return; }
        }
        call.reject("not installed");
    }

    // Состояние Melete (занятие, звук, неделя, чтение) — Melete рассылает его сам при каждом изменении
    // (STATE, адресно в app.elachiston и app.elachiston.dev); главный экран при показе просит прислать (REQUEST).
    static final String M_STATE = "app.melete.bridge.STATE", M_REQUEST = "app.melete.bridge.REQUEST", M_CONTROL = "app.melete.bridge.CONTROL";
    static volatile String meleteState = null;
    private android.content.BroadcastReceiver stateRx;

    @Override
    public void load() {
        stateRx = new android.content.BroadcastReceiver() {
            @Override public void onReceive(Context c, Intent i) {
                String st = i.getStringExtra("state");
                if (st == null) return;
                meleteState = st;
                JSObject o = new JSObject();
                o.put("state", st);
                o.put("from", i.getStringExtra("pkg"));
                notifyListeners("meleteState", o);
            }
        };
        android.content.IntentFilter f = new android.content.IntentFilter(M_STATE);
        if (android.os.Build.VERSION.SDK_INT >= 33) getContext().registerReceiver(stateRx, f, Context.RECEIVER_EXPORTED);
        else getContext().registerReceiver(stateRx, f);
    }

    @Override
    protected void handleOnDestroy() {
        try { if (stateRx != null) getContext().unregisterReceiver(stateRx); } catch (Exception ignored) { }
        try { if (batRx != null) getContext().unregisterReceiver(batRx); } catch (Exception ignored) { }
        try { if (netCb != null) cm().unregisterNetworkCallback(netCb); } catch (Exception ignored) { }
    }

    // — Своя строка состояния (системная скрыта): заряд и сеть из системы, WebView их не знает —
    private android.content.BroadcastReceiver batRx;
    private android.net.ConnectivityManager.NetworkCallback netCb;
    private Intent lastBattery;
    private android.net.ConnectivityManager cm() { return (android.net.ConnectivityManager) getContext().getSystemService(Context.CONNECTIVITY_SERVICE); }

    private JSObject statusNow() {
        JSObject o = new JSObject();
        Intent b = lastBattery != null ? lastBattery : getContext().registerReceiver(null, new android.content.IntentFilter(Intent.ACTION_BATTERY_CHANGED));
        if (b != null) {
            int level = b.getIntExtra(android.os.BatteryManager.EXTRA_LEVEL, -1), scale = b.getIntExtra(android.os.BatteryManager.EXTRA_SCALE, 100);
            int st = b.getIntExtra(android.os.BatteryManager.EXTRA_STATUS, -1);
            if (level >= 0 && scale > 0) o.put("battery", Math.round(level * 100f / scale));
            o.put("charging", st == android.os.BatteryManager.BATTERY_STATUS_CHARGING || st == android.os.BatteryManager.BATTERY_STATUS_FULL);
        }
        String net = "none"; int bars = -1;
        try {
            android.net.ConnectivityManager c = cm();
            android.net.NetworkCapabilities nc = c.getNetworkCapabilities(c.getActiveNetwork());
            if (nc != null && nc.hasCapability(android.net.NetworkCapabilities.NET_CAPABILITY_INTERNET)) {
                if (nc.hasTransport(android.net.NetworkCapabilities.TRANSPORT_WIFI)) {
                    net = "wifi";
                    if (android.os.Build.VERSION.SDK_INT >= 29) {
                        int rssi = nc.getSignalStrength();
                        if (rssi != Integer.MIN_VALUE) bars = rssi >= -55 ? 4 : rssi >= -66 ? 3 : rssi >= -77 ? 2 : rssi >= -88 ? 1 : 0;
                    }
                } else if (nc.hasTransport(android.net.NetworkCapabilities.TRANSPORT_CELLULAR)) net = "cell";
                else net = "other";
            }
        } catch (Exception ignored) { }
        // мобильная связь: уровень сигнала (без разрешений, Android 9+), даже когда интернет идёт по Wi-Fi
        try {
            if (android.os.Build.VERSION.SDK_INT >= 28) {
                android.telephony.TelephonyManager tm = (android.telephony.TelephonyManager) getContext().getSystemService(Context.TELEPHONY_SERVICE);
                android.telephony.SignalStrength ss = tm != null ? tm.getSignalStrength() : null;
                if (ss != null) o.put("cell", ss.getLevel());
            }
        } catch (Exception ignored) { }
        o.put("net", net);
        if (bars >= 0) o.put("wifi", bars);
        return o;
    }

    @PluginMethod
    public void status(PluginCall call) {
        if (batRx == null) {
            batRx = new android.content.BroadcastReceiver() {
                @Override public void onReceive(Context c, Intent i) { lastBattery = i; notifyListeners("status", statusNow()); }
            };
            android.content.IntentFilter f = new android.content.IntentFilter(Intent.ACTION_BATTERY_CHANGED);
            if (android.os.Build.VERSION.SDK_INT >= 33) getContext().registerReceiver(batRx, f, Context.RECEIVER_NOT_EXPORTED);
            else getContext().registerReceiver(batRx, f);
            try {
                netCb = new android.net.ConnectivityManager.NetworkCallback() {
                    @Override public void onCapabilitiesChanged(android.net.Network n, android.net.NetworkCapabilities nc) { notifyListeners("status", statusNow()); }
                    @Override public void onLost(android.net.Network n) { notifyListeners("status", statusNow()); }
                };
                cm().registerDefaultNetworkCallback(netCb);
            } catch (Exception ignored) { netCb = null; }
        }
        call.resolve(statusNow());
    }

    @PluginMethod
    public void meleteState(PluginCall call) {
        for (String p : MELETE) getContext().sendBroadcast(new Intent(M_REQUEST).setPackage(p).putExtra("to", getContext().getPackageName()));
        JSObject o = new JSObject();
        o.put("state", meleteState);
        call.resolve(o);
    }

    // Управление звуком Melete: toggle | play | pause | stop
    @PluginMethod
    public void meleteControl(PluginCall call) {
        String a = call.getString("action", "toggle");
        for (String p : MELETE) getContext().sendBroadcast(new Intent(M_CONTROL).setPackage(p).putExtra("action", a));
        call.resolve();
    }

    // Папка Melete: человек выбирает её один раз; доступ — только чтение и сохраняется
    @PluginMethod
    public void pickFolder(PluginCall call) {
        Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        startActivityForResult(call, i, "folderPicked");
    }

    @ActivityCallback
    private void folderPicked(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Intent data = result.getData();
        if (result.getResultCode() != Activity.RESULT_OK || data == null || data.getData() == null) { call.reject("cancelled"); return; }
        Uri tree = data.getData();
        getContext().getContentResolver().takePersistableUriPermission(tree, Intent.FLAG_GRANT_READ_URI_PERMISSION);
        JSObject r = new JSObject();
        r.put("tree", tree.toString());
        call.resolve(r);
    }

    // Копия данных главного экрана (src/launcher/backup.js): сохранить файл — человек выбирает, куда и под каким
    // именем (окно системы «Сохранить»); загрузить — выбирает файл. Без разрешений на память.
    @PluginMethod
    public void saveDocument(PluginCall call) {
        Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
            .setType(call.getString("mime", "application/json"))
            .putExtra(Intent.EXTRA_TITLE, call.getString("name", "elachiston.json"));
        startActivityForResult(call, i, "documentCreated");
    }

    @ActivityCallback
    private void documentCreated(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Intent data = result.getData();
        if (result.getResultCode() != Activity.RESULT_OK || data == null || data.getData() == null) { call.reject("cancelled"); return; }
        try (java.io.OutputStream out = getContext().getContentResolver().openOutputStream(data.getData(), "wt")) {
            out.write(call.getString("text", "").getBytes(StandardCharsets.UTF_8));
            call.resolve();
        } catch (Exception e) { call.reject(e.getMessage()); }
    }

    @PluginMethod
    public void openDocument(PluginCall call) {
        Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");
        startActivityForResult(call, i, "documentOpened");
    }

    @ActivityCallback
    private void documentOpened(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Intent data = result.getData();
        if (result.getResultCode() != Activity.RESULT_OK || data == null || data.getData() == null) { call.reject("cancelled"); return; }
        try (InputStream in = getContext().getContentResolver().openInputStream(data.getData())) {
            ByteArrayOutputStream buf = new ByteArrayOutputStream();
            byte[] b = new byte[16384];
            int n;
            while ((n = in.read(b)) > 0) { buf.write(b, 0, n); if (buf.size() > 50_000_000) throw new Exception("too big"); }
            JSObject r = new JSObject();
            r.put("text", buf.toString("UTF-8"));
            call.resolve(r);
        } catch (Exception e) { call.reject(e.getMessage()); }
    }

    // Текстовый файл внутри выбранной папки по пути (Data/melete-data.json) и время его изменения
    @PluginMethod
    public void readText(PluginCall call) {
        String treeStr = call.getString("tree");
        String path = call.getString("path");
        if (treeStr == null || path == null) { call.reject("tree and path required"); return; }
        try {
            Uri tree = Uri.parse(treeStr);
            String docId = DocumentsContract.getTreeDocumentId(tree);
            for (String part : path.split("/")) {
                docId = findChild(tree, docId, part);
                if (docId == null) { call.reject("not found: " + part); return; }
            }
            Uri doc = DocumentsContract.buildDocumentUriUsingTree(tree, docId);
            long modified = 0;
            try (Cursor c = getContext().getContentResolver().query(doc, new String[] { DocumentsContract.Document.COLUMN_LAST_MODIFIED }, null, null, null)) {
                if (c != null && c.moveToFirst()) modified = c.getLong(0);
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            try (InputStream in = getContext().getContentResolver().openInputStream(doc)) {
                byte[] buf = new byte[16384];
                int n;
                while (in != null && (n = in.read(buf)) > 0) out.write(buf, 0, n);
            }
            JSObject r = new JSObject();
            r.put("text", new String(out.toByteArray(), StandardCharsets.UTF_8));
            r.put("modified", modified);
            call.resolve(r);
        } catch (Exception e) {
            call.reject(String.valueOf(e.getMessage()));
        }
    }

    private String findChild(Uri tree, String parentId, String name) {
        Uri children = DocumentsContract.buildChildDocumentsUriUsingTree(tree, parentId);
        String[] cols = { DocumentsContract.Document.COLUMN_DOCUMENT_ID, DocumentsContract.Document.COLUMN_DISPLAY_NAME };
        try (Cursor c = getContext().getContentResolver().query(children, cols, null, null, null)) {
            while (c != null && c.moveToNext()) if (name.equals(c.getString(1))) return c.getString(0);
        }
        return null;
    }

    // Кошелёк под замком (src/launcher/lock.js): отпечаток или лицо — если есть на телефоне и включены в системе.
    // Запасной вход — свой код кошелька (кнопка «Код» в окне системы), не код телефона.
    @PluginMethod
    public void bioState(PluginCall call) {
        int r = BiometricManager.from(getContext()).canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK);
        JSObject o = new JSObject();
        o.put("available", r == BiometricManager.BIOMETRIC_SUCCESS);
        o.put("enrolled", r != BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED);
        o.put("hardware", r != BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE && r != BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE);
        call.resolve(o);
    }

    @PluginMethod
    public void bioUnlock(PluginCall call) {
        Activity a = getActivity();
        if (!(a instanceof FragmentActivity)) { call.reject("no activity"); return; }
        String title = call.getString("title", "Elachiston");
        String cancel = call.getString("cancel", "PIN");
        a.runOnUiThread(() -> {
            BiometricPrompt prompt = new BiometricPrompt((FragmentActivity) a, ContextCompat.getMainExecutor(getContext()),
                new BiometricPrompt.AuthenticationCallback() {
                    @Override public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                        JSObject o = new JSObject(); o.put("ok", true); call.resolve(o);
                    }
                    @Override public void onAuthenticationError(int code, CharSequence msg) {
                        JSObject o = new JSObject(); o.put("ok", false); o.put("code", code); call.resolve(o);
                    }
                    // неудачная попытка — окно системы остаётся и просит ещё раз
                });
            BiometricPrompt.PromptInfo info = new BiometricPrompt.PromptInfo.Builder()
                .setTitle(title)
                .setNegativeButtonText(cancel)
                .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_WEAK)
                .build();
            try { prompt.authenticate(info); } catch (Exception e) { call.reject(e.getMessage()); }
        });
    }

    // Значки строки состояния и полосы жестов: тёмные на светлом фоне, светлые на тёмном (look.js → setBars)
    @PluginMethod
    public void setBars(PluginCall call) {
        boolean lightBg = call.getBoolean("lightBg", true);
        Activity a = getActivity();
        if (a == null) { call.resolve(); return; }
        a.runOnUiThread(() -> {
            androidx.core.view.WindowInsetsControllerCompat c = androidx.core.view.WindowCompat.getInsetsController(a.getWindow(), a.getWindow().getDecorView());
            c.setAppearanceLightStatusBars(lightBg);
            c.setAppearanceLightNavigationBars(lightBg);
            // фон окна и WebView — цвет темы главного (тёмная, OLED, светлая выбраны в самом приложении)
            String bg = call.getString("bg");
            if (bg != null) {
                try {
                    int col = android.graphics.Color.parseColor(bg);
                    a.getWindow().setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(col));
                    if (getBridge() != null) getBridge().getWebView().setBackgroundColor(col);
                } catch (Exception ignored) { }
            }
        });
        call.resolve();
    }
}
