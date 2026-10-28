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

// Ἐλάχιστον (Elachiston) — главный экран телефона (docs/launcher.md). Одно окно: оно же и значок в списке приложений,
// и главный экран (category.HOME) — Android предлагает его в выборе главного экрана.
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // свои плагины — до запуска моста
        registerPlugin(LauncherPlugin.class);
        registerPlugin(UpdatePlugin.class);
        super.onCreate(savedInstanceState);
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
            if (getBridge() != null) getBridge().getWebView().post(() -> getBridge().getWebView().evaluateJavascript(js, null));
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
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        c.hide(WindowInsetsCompat.Type.statusBars());
    }

    @Override
    public void onResume() {
        super.onResume();
        if (android.os.Build.VERSION.SDK_INT < 34) overridePendingTransition(0, 0);
    }

    @Override
    public void onPause() {
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
    protected void onNewIntent(Intent intent) {
        if (intent != null && Intent.ACTION_MAIN.equals(intent.getAction()) && intent.hasCategory(Intent.CATEGORY_HOME)) {
            setIntent(intent);
            return;
        }
        super.onNewIntent(intent);
    }
}
