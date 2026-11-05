package app.practice.beta;

import android.content.Context;
import android.media.MediaMetadata;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.os.Handler;
import android.os.Looper;
import org.json.JSONObject;

// Медиасессия Android (слово автора 05.11.2026): браслет (Mi Band — через Mi Fitness, Zepp Life или Gadgetbridge), часы,
// Bluetooth-наушники и педали, экран блокировки видят Melete как проигрыватель. Название — что звучит
// («Метроном 4/4 · 120 BPM», «Пэды Свет · C3», имя записи), строкой ниже — остальное звучащее. Кнопки уходят странице
// событием «control» (PlayerPlugin.emit): play / pause / next / prev; что они делают — решает core/player.js.
// Сессия активна, только пока что-то звучит (или стоит на паузе с пульта) — иначе Melete не перехватывает кнопки.
final class MediaCtl {
    private static MediaSession ses;
    private static final Handler main = new Handler(Looper.getMainLooper());
    private static String lastSig = "";

    private MediaCtl() {}

    private static MediaSession session(Context c) {
        if (ses != null) return ses;
        ses = new MediaSession(c.getApplicationContext(), "Melete");
        ses.setCallback(new MediaSession.Callback() {
            @Override public void onPlay() { PlayerPlugin.emit("play", null, 0); }
            @Override public void onPause() { PlayerPlugin.emit("pause", null, 0); }
            @Override public void onStop() { PlayerPlugin.emit("pause", null, 0); }
            @Override public void onSkipToNext() { PlayerPlugin.emit("next", null, 0); }
            @Override public void onSkipToPrevious() { PlayerPlugin.emit("prev", null, 0); }
        });
        return ses;
    }

    // state — то, что прислала страница (PlayerPlugin.state): { playing, sounding, media: { title, sub } | null }
    static void update(Context c, JSONObject state) {
        main.post(() -> {
            try {
                JSONObject m = state.optJSONObject("media");
                boolean playing = state.optBoolean("playing", true);
                boolean show = m != null && m.optString("title", "").length() > 0;
                String title = show ? m.optString("title", "") : "", sub = show ? m.optString("sub", "") : "";
                String sig = show + "|" + playing + "|" + title + "|" + sub;
                if (sig.equals(lastSig)) return;
                lastSig = sig;
                if (!show) {
                    // ничего не звучит и не на паузе с пульта — отпустить кнопки другим проигрывателям
                    if (ses != null && !(m != null && !playing)) ses.setActive(false);
                    return;
                }
                MediaSession s = session(c);
                s.setMetadata(new MediaMetadata.Builder()
                    .putString(MediaMetadata.METADATA_KEY_TITLE, title)
                    .putString(MediaMetadata.METADATA_KEY_ARTIST, sub.isEmpty() ? "Melete" : sub)
                    .putString(MediaMetadata.METADATA_KEY_ALBUM, "Melete")
                    .build());
                long actions = PlaybackState.ACTION_PLAY | PlaybackState.ACTION_PAUSE | PlaybackState.ACTION_PLAY_PAUSE
                    | PlaybackState.ACTION_STOP | PlaybackState.ACTION_SKIP_TO_NEXT | PlaybackState.ACTION_SKIP_TO_PREVIOUS;
                s.setPlaybackState(new PlaybackState.Builder()
                    .setActions(actions)
                    .setState(playing ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED, PlaybackState.PLAYBACK_POSITION_UNKNOWN, playing ? 1f : 0f)
                    .build());
                if (!s.isActive()) s.setActive(true);
            } catch (Exception ignored) { /* пульт — не главное: звук работает и без него */ }
        });
    }

    static void release() {
        main.post(() -> { if (ses != null) { try { ses.setActive(false); ses.release(); } catch (Exception ignored) { } ses = null; lastSig = ""; } });
    }
}
