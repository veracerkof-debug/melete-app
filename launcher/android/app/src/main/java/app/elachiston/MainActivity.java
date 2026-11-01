package app.elachiston;

import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

// Ἐλάχιστον (Elachiston) — главный экран телефона (docs/launcher.md). Одно окно: оно же и значок в списке приложений,
// и главный экран (category.HOME) — Android предлагает его в выборе главного экрана.
public class MainActivity extends BridgeActivity {
    // когда окно последний раз стало видно — страница отвечает «показана» (LauncherPlugin.shown), разница — в журнал
    static volatile long resumedAt = 0;
    static volatile boolean resumed = false;
    private String lastInsets = null;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // свои плагины — до запуска моста
        registerPlugin(LauncherPlugin.class);
        registerPlugin(UpdatePlugin.class);
        Diag.init(this);
        Diag.catchCrashes();
        long t0 = android.os.SystemClock.elapsedRealtime();
        long procAge = android.os.Build.VERSION.SDK_INT >= 24 ? t0 - android.os.Process.getStartElapsedRealtime() : -1;
        // процесс только что запущен (холодный старт: система закрывала главный) или окно пересоздано в живом процессе
        Diag.log("start", (procAge >= 0 && procAge < 3000 ? "cold" : "warm") + " restore=" + (savedInstanceState != null) + " procAge=" + procAge + "ms");
        Diag.exitReasons(this);
        super.onCreate(savedInstanceState);
        Diag.log("start", "bridge ready in " + (android.os.SystemClock.elapsedRealtime() - t0) + "ms");
        if (getBridge() != null) {
            android.webkit.WebView wv = getBridge().getWebView();
            // страница главного экрана — важная: система не выгружает её первой, когда главный в фоне (возврат без пересборки)
            if (android.os.Build.VERSION.SDK_INT >= 26) wv.setRendererPriorityPolicy(android.webkit.WebView.RENDERER_PRIORITY_IMPORTANT, false);
            // система всё же закрыла страницу (нехватка памяти) — не падать всем приложением, а собрать окно заново
            getBridge().addWebViewListener(new WebViewListener() {
                @Override public boolean onRenderProcessGone(android.webkit.WebView view, android.webkit.RenderProcessGoneDetail d) {
                    Diag.log("GONE", "webview renderer gone crash=" + (android.os.Build.VERSION.SDK_INT >= 26 && d.didCrash()) + " — окно пересобирается");
                    recreate();
                    return true;
                }
                @Override public void onPageLoaded(android.webkit.WebView view) { Diag.log("page", "loaded"); }
            });
        }
        // Край в край: страница рисует под строкой состояния и полосой жестов, а отступы системы получает сама
        // (window.__insets → CSS --l-sat/--l-sab/…; env(safe-area-inset-*) в WebView Android равен нулю)
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);
        if (android.os.Build.VERSION.SDK_INT >= 29) getWindow().setNavigationBarContrastEnforced(false);
        final float density = getResources().getDisplayMetrics().density;
        // Системная строка состояния скрыта (решение автора): у главного экрана своя — сеть и заряд (home.js).
        // Смахнуть сверху — системная появляется на время, второе смахивание — шторка уведомлений
        hideStatusBar();
        // без анимаций окна: главный появляется сразу (и после недавних, и после других приложений)
        if (android.os.Build.VERSION.SDK_INT >= 34) {
            overrideActivityTransition(OVERRIDE_TRANSITION_OPEN, 0, 0);
            overrideActivityTransition(OVERRIDE_TRANSITION_CLOSE, 0, 0);
        }
        // до первого кадра страницы — тот же цвет, что у неё (не белая вспышка)
        if (getBridge() != null) getBridge().getWebView().setBackgroundColor(androidx.core.content.ContextCompat.getColor(this, R.color.l_bg));
        ViewCompat.setOnApplyWindowInsetsListener(getWindow().getDecorView(), (v, insets) -> {
            androidx.core.graphics.Insets s = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            // сверху — место скрытой строки (там своя строка и вырез камеры), а не ноль
            int top = Math.max(s.top, Math.max(insets.getInsetsIgnoringVisibility(WindowInsetsCompat.Type.statusBars()).top,
                insets.getInsets(WindowInsetsCompat.Type.displayCutout()).top));
            String js = String.format(java.util.Locale.US, "window.__insets && window.__insets(%.1f,%.1f,%.1f,%.1f)",
                top / density, s.right / density, s.bottom / density, s.left / density);
            // система шлёт отступы много раз (недавние, фокус, шторка) — странице только новые: каждая пересчитывает раскладку
            if (!js.equals(lastInsets) && getBridge() != null) { lastInsets = js; getBridge().getWebView().post(() -> getBridge().getWebView().evaluateJavascript(js, null)); }
            return insets;
        });
        // «Назад» не закрывает главный экран: страница закрывает шторку, список приложений или тихий экран
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (getBridge() != null) getBridge().getWebView().evaluateJavascript("window.__launcherBack && window.__launcherBack()", null);
            }
        });
    }

    private void hideStatusBar() {
        // уже скрыта — ничего не трогать (иначе каждый возврат дёргает отступы и раскладку страницы)
        WindowInsetsCompat now = ViewCompat.getRootWindowInsets(getWindow().getDecorView());
        if (now != null && !now.isVisible(WindowInsetsCompat.Type.statusBars())) return;
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        c.hide(WindowInsetsCompat.Type.statusBars());
    }

    @Override
    public void onResume() {
        resumedAt = android.os.SystemClock.elapsedRealtime();
        resumed = true;
        Diag.log("life", "resume");
        super.onResume();
        if (android.os.Build.VERSION.SDK_INT < 34) overridePendingTransition(0, 0);
    }

    @Override
    public void onPause() {
        resumed = false;
        Diag.log("life", "pause");
        super.onPause();
        if (android.os.Build.VERSION.SDK_INT < 34) overridePendingTransition(0, 0);
    }

    // система может вернуть строку (после другого приложения, шторки, поворота) — снова прячем
    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideStatusBar();
    }

    // Жест «Домой», когда главный экран уже на виду, — ничего не делает (решение автора): не перезапускает страницу,
    // не закрывает открытое, не прокручивает. Пришли домой из другого приложения — страница сама собирается
    // в чистый вид, когда её снова показывают (src/launcher/main.js, visibilitychange).
    @Override
    public void onStop() { Diag.log("life", "stop"); super.onStop(); }

    @Override
    public void onDestroy() { Diag.log("life", "destroy finishing=" + isFinishing()); super.onDestroy(); }

    // система просит отдать память: уровень в журнал (15 — критично, 80 — главный в фоне и первым на выгрузку)
    @Override
    public void onTrimMemory(int level) { Diag.log("mem", "trim level=" + level); super.onTrimMemory(level); }

    @Override
    public void onLowMemory() { Diag.log("mem", "LOW"); super.onLowMemory(); }

    @Override
    protected void onNewIntent(Intent intent) {
        if (intent != null && Intent.ACTION_MAIN.equals(intent.getAction()) && intent.hasCategory(Intent.CATEGORY_HOME)) {
            Diag.log("life", "home " + (resumed ? "(already on home)" : "(from app)"));
            setIntent(intent);
            return;
        }
        super.onNewIntent(intent);
    }
}
