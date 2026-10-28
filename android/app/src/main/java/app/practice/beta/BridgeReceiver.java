package app.practice.beta;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

// Главный экран спрашивает состояние (REQUEST) или жмёт ▶/❚❚ (CONTROL: toggle | play | pause | stop) — тот же путь,
// что у кнопок уведомления (PlayerPlugin → src/core/player.js). Данных наружу не отдаёт, кроме STATE адресно
public class BridgeReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        String a = i.getAction();
        if (BridgePlugin.REQUEST.equals(a)) { BridgePlugin.send(c, BridgePlugin.last(c)); return; }
        if (BridgePlugin.CONTROL.equals(a)) {
            String act = i.getStringExtra("action");
            if (act != null && act.matches("toggle|play|pause|stop")) PlayerPlugin.emit(act, null, 0);
        }
    }
}
