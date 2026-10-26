package app.elachiston;

import android.content.Intent;
import android.os.Bundle;
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
        // «Назад» не закрывает главный экран: страница закрывает шторку, список приложений или тихий экран
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (getBridge() != null) getBridge().getWebView().evaluateJavascript("window.__launcherBack && window.__launcherBack()", null);
            }
        });
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
