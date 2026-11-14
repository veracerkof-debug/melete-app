package app.practice.beta;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.AudioDeviceCallback;
import android.media.AudioDeviceInfo;
import android.media.AudioFormat;
import android.media.AudioPlaybackCaptureConfiguration;
import android.media.AudioManager;
import android.media.AudioRecord;
import android.media.AudioTrack;
import android.media.MediaRecorder;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.os.Build;
import android.util.Base64;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import androidx.activity.result.ActivityResult;
import androidx.core.content.ContextCompat;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.RandomAccessFile;

// Диктофон (src/modules/voice): список входов и выходов звука (встроенный микрофон, гарнитура, Bluetooth, USB —
// в том числе приёмники петличек), запись с выбранного входа (AudioRecord + setPreferredDevice) в WAV и
// воспроизведение на выбранный выход (AudioTrack + setPreferredDevice). Звук не покидает устройство.
@CapacitorPlugin(name = "Voice", permissions = { @Permission(strings = { Manifest.permission.RECORD_AUDIO }, alias = "mic") })
public class VoicePlugin extends Plugin {

    private AudioManager am;
    private volatile boolean recording = false, paused = false, playing = false, monitor = false, ended = false;
    private volatile String endReason = null;
    private Thread recThread, playThread;
    private File recFile;
    private static final long MIN_FREE = 40L * 1024 * 1024; // меньше — запись не начинается и бережно останавливается
    private int recRate = 48000, recCh = 1;
    private long recFrames = 0;
    private AudioDeviceCallback cb;
    private boolean commSet = false, scoOn = false;
    // Звук телефона (слово автора 14.11.2026): запись того, что играют другие приложения (урок, минус) — системный
    // захват Android 10+ (AudioPlaybackCapture). Разрешение Android спрашивает при каждой записи; приложения, запретившие
    // захват, и звонки не пишутся. withMic — вместе с микрофоном (играть вместе с уроком)
    private MediaProjection proj;
    private AudioRecord capRec, capMic;

    @Override
    public void load() {
        am = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        cb = new AudioDeviceCallback() {
            @Override public void onAudioDevicesAdded(AudioDeviceInfo[] d) { notifyListeners("devices", new JSObject()); }
            @Override public void onAudioDevicesRemoved(AudioDeviceInfo[] d) { notifyListeners("devices", new JSObject()); }
        };
        am.registerAudioDeviceCallback(cb, null);
    }

    @Override
    protected void handleOnDestroy() {
        recording = false; playing = false;
        if (am != null && cb != null) am.unregisterAudioDeviceCallback(cb);
        releaseComm();
    }

    private static String typeName(int t) {
        switch (t) {
            case AudioDeviceInfo.TYPE_BUILTIN_MIC: return "builtin_mic";
            case AudioDeviceInfo.TYPE_BUILTIN_SPEAKER: return "speaker";
            case AudioDeviceInfo.TYPE_BUILTIN_EARPIECE: return "earpiece";
            case AudioDeviceInfo.TYPE_WIRED_HEADSET: return "wired_headset";
            case AudioDeviceInfo.TYPE_WIRED_HEADPHONES: return "wired_headphones";
            case AudioDeviceInfo.TYPE_BLUETOOTH_SCO: return "bt_sco";
            case AudioDeviceInfo.TYPE_BLUETOOTH_A2DP: return "bt_a2dp";
            case AudioDeviceInfo.TYPE_USB_DEVICE: return "usb_device";
            case AudioDeviceInfo.TYPE_USB_HEADSET: return "usb_headset";
            case AudioDeviceInfo.TYPE_USB_ACCESSORY: return "usb_accessory";
            case AudioDeviceInfo.TYPE_HDMI: return "hdmi";
            case AudioDeviceInfo.TYPE_LINE_ANALOG: return "line";
            case AudioDeviceInfo.TYPE_TELEPHONY: return "telephony";
            case AudioDeviceInfo.TYPE_REMOTE_SUBMIX: return "submix";
            case AudioDeviceInfo.TYPE_FM: return "fm";
            case AudioDeviceInfo.TYPE_FM_TUNER: return "fm_tuner";
            case AudioDeviceInfo.TYPE_TV_TUNER: return "tv_tuner";
            case AudioDeviceInfo.TYPE_LINE_DIGITAL: return "line_digital";
            case AudioDeviceInfo.TYPE_AUX_LINE: return "aux_line";
            case AudioDeviceInfo.TYPE_DOCK: return "dock";
            case AudioDeviceInfo.TYPE_IP: return "ip";
            case AudioDeviceInfo.TYPE_BUS: return "bus";
            case 23: return "hearing_aid";   // TYPE_HEARING_AID (API 28)
            case 24: return "speaker_safe";  // TYPE_BUILTIN_SPEAKER_SAFE (API 30)
            case 26: return "ble_headset";   // TYPE_BLE_HEADSET (API 31)
            case 27: return "ble_speaker";   // TYPE_BLE_SPEAKER
            case 28: return "echo_reference"; // TYPE_ECHO_REFERENCE
            case 29: return "hdmi_earc";
            case 30: return "ble_broadcast";
            case 31: return "dock_analog";
            default: return "other_" + t;
        }
    }

    private JSObject devJson(AudioDeviceInfo d) {
        JSObject o = new JSObject();
        o.put("id", d.getId());
        o.put("type", typeName(d.getType()));
        o.put("name", String.valueOf(d.getProductName()));
        if (Build.VERSION.SDK_INT >= 28) o.put("address", d.getAddress());
        int[] ch = d.getChannelCounts();
        int max = 1; for (int c : ch) max = Math.max(max, c);
        o.put("channels", max);
        int[] rates = d.getSampleRates();
        int top = 0; for (int r : rates) top = Math.max(top, r);
        if (top > 0) o.put("rateMax", top);
        o.put("tech", isTech(d.getType()));
        // встроенный микрофон: где он стоит и что о нём говорит система (getMicrophones, API 28) — по адресу устройства
        if (Build.VERSION.SDK_INT >= 28 && d.isSource()) {
            try {
                for (android.media.MicrophoneInfo m : am.getMicrophones()) {
                    if (m.getType() != d.getType() || !String.valueOf(m.getAddress()).equals(String.valueOf(d.getAddress()))) continue;
                    JSObject mi = new JSObject();
                    mi.put("desc", String.valueOf(m.getDescription()));
                    mi.put("loc", m.getLocation()); // 1 — корпус, 2 — выдвижная часть, 3 — внешнее
                    mi.put("dir", m.getDirectionality()); // 1 — всенаправленный, 2 — двусторонний, 3–6 — кардиоиды
                    android.media.MicrophoneInfo.Coordinate3F pos = m.getPosition();
                    if (pos != null && pos != android.media.MicrophoneInfo.POSITION_UNKNOWN) { mi.put("x", pos.x); mi.put("y", pos.y); mi.put("z", pos.z); }
                    o.put("mic", mi);
                    break;
                }
            } catch (Exception e) { /* описание микрофонов есть не везде */ }
        }
        return o;
    }

    // Служебные устройства: показываются всё равно (слово автора 07.11.2026 — «любой источник, который я захочу»),
    // но ниже обычных; записывать или звучать через них может не дать система
    private static boolean isTech(int t) {
        switch (t) {
            case AudioDeviceInfo.TYPE_BUILTIN_MIC: case AudioDeviceInfo.TYPE_BUILTIN_SPEAKER: case AudioDeviceInfo.TYPE_BUILTIN_EARPIECE:
            case AudioDeviceInfo.TYPE_WIRED_HEADSET: case AudioDeviceInfo.TYPE_WIRED_HEADPHONES: case AudioDeviceInfo.TYPE_BLUETOOTH_SCO:
            case AudioDeviceInfo.TYPE_BLUETOOTH_A2DP: case AudioDeviceInfo.TYPE_USB_DEVICE: case AudioDeviceInfo.TYPE_USB_HEADSET:
            case AudioDeviceInfo.TYPE_USB_ACCESSORY: case AudioDeviceInfo.TYPE_HDMI: case AudioDeviceInfo.TYPE_LINE_ANALOG:
            case 23: case 26: case 27: return false;
            default: return true;
        }
    }

    private AudioDeviceInfo find(int flags, int id) {
        for (AudioDeviceInfo d : am.getDevices(flags)) if (d.getId() == id) return d;
        return null;
    }

    @PluginMethod
    public void devices(PluginCall call) {
        JSArray ins = new JSArray(), outs = new JSArray();
        // все входы и выходы, что видит система, — и служебные тоже (они помечены tech)
        for (AudioDeviceInfo d : am.getDevices(AudioManager.GET_DEVICES_INPUTS)) ins.put(devJson(d));
        for (AudioDeviceInfo d : am.getDevices(AudioManager.GET_DEVICES_OUTPUTS)) outs.put(devJson(d));
        JSObject r = new JSObject();
        r.put("inputs", ins);
        r.put("outputs", outs);
        r.put("sdk", Build.VERSION.SDK_INT);
        call.resolve(r);
    }

    /* ---------- Bluetooth-гарнитура: микрофон доступен только по голосовому каналу (SCO) ---------- */

    private boolean isBtVoice(AudioDeviceInfo d) {
        return d != null && (d.getType() == AudioDeviceInfo.TYPE_BLUETOOTH_SCO || d.getType() == 26);
    }

    private void useComm(AudioDeviceInfo in) {
        try {
            // голосовой режим — только для Bluetooth (иначе микрофон гарнитуры не открыть); USB и проводным он не нужен
            if (isBtVoice(in)) am.setMode(AudioManager.MODE_IN_COMMUNICATION);
            if (Build.VERSION.SDK_INT >= 31) {
                for (AudioDeviceInfo d : am.getAvailableCommunicationDevices()) {
                    if (d.getType() == in.getType() && (Build.VERSION.SDK_INT < 28 || String.valueOf(d.getAddress()).equals(String.valueOf(in.getAddress())))) {
                        commSet = am.setCommunicationDevice(d);
                        break;
                    }
                }
            } else if (isBtVoice(in)) {
                am.startBluetoothSco();
                am.setBluetoothScoOn(true);
                scoOn = true;
            }
        } catch (Exception e) { /* как получится */ }
    }

    /* ---------- маршрут для записи в инструментах (микрофон WebView: голосовой канал WebRTC) ----------
       Вход выбирается как «устройство связи»: Bluetooth-гарнитура, USB-микрофон или проводная гарнитура —
       тогда микрофон страницы берёт звук с него. Без выбора — как решит система. */
    @PluginMethod
    public void route(PluginCall call) {
        int id = call.getInt("deviceId", -1);
        releaseComm();
        AudioDeviceInfo dev = id >= 0 ? find(AudioManager.GET_DEVICES_INPUTS, id) : null;
        JSObject r = new JSObject();
        if (dev != null && !recording && (isBtVoice(dev) || Build.VERSION.SDK_INT >= 31)) useComm(dev);
        r.put("routed", commSet || scoOn);
        call.resolve(r);
    }

    @PluginMethod
    public void unroute(PluginCall call) { if (!recording) releaseComm(); call.resolve(); }

    private void releaseComm() {
        try {
            if (commSet && Build.VERSION.SDK_INT >= 31) am.clearCommunicationDevice();
            if (scoOn) { am.setBluetoothScoOn(false); am.stopBluetoothSco(); }
            if (commSet || scoOn) am.setMode(AudioManager.MODE_NORMAL);
        } catch (Exception e) { /* уже отпущено */ }
        commSet = false; scoOn = false;
    }

    /* ---------- запись ---------- */

    @PluginMethod
    public void start(PluginCall call) {
        if (getPermissionState("mic") != PermissionState.GRANTED) { requestPermissionForAlias("mic", call, "micGranted"); return; }
        begin(call);
    }

    @PermissionCallback
    private void micGranted(PluginCall call) {
        if (getPermissionState("mic") == PermissionState.GRANTED) begin(call);
        else call.reject("denied");
    }

    private void begin(PluginCall call) {
        if (!Boolean.TRUE.equals(call.getBoolean("capture", false))) { doStart(call); return; }
        if (Build.VERSION.SDK_INT < 29) { call.reject("unsupported"); return; }
        if (recording) { call.reject("busy"); return; }
        MediaProjectionManager mpm = (MediaProjectionManager) getContext().getSystemService(Context.MEDIA_PROJECTION_SERVICE);
        if (mpm == null) { call.reject("unsupported"); return; }
        startActivityForResult(call, mpm.createScreenCaptureIntent(), "capGranted");
    }

    // Человек ответил на системный вопрос «Начать запись?»: служба с типом mediaProjection — потом сам захват
    @ActivityCallback
    private void capGranted(PluginCall call, ActivityResult res) {
        if (call == null) return;
        if (res == null || res.getResultCode() != Activity.RESULT_OK || res.getData() == null) { call.reject("denied"); return; }
        final Intent data = res.getData();
        final int code = res.getResultCode();
        KeepAliveService.proj = true;
        Intent i = new Intent(getContext(), KeepAliveService.class);
        i.putExtra("title", call.getString("title", "Melete"));
        i.putExtra("text", call.getString("text", ""));
        i.putExtra("mic", true);
        try { ContextCompat.startForegroundService(getContext(), i); } catch (Exception e) { KeepAliveService.proj = false; call.reject("service"); return; }
        new Thread(() -> {
            // служба должна успеть стать «передней» с нужным типом — иначе getMediaProjection бросит исключение
            for (int k = 0; k < 40 && !KeepAliveService.running; k++) { try { Thread.sleep(25); } catch (InterruptedException e) { break; } }
            try { Thread.sleep(80); } catch (InterruptedException e) { /* дальше */ }
            getActivity().runOnUiThread(() -> {
                try {
                    MediaProjectionManager mpm = (MediaProjectionManager) getContext().getSystemService(Context.MEDIA_PROJECTION_SERVICE);
                    proj = mpm.getMediaProjection(code, data);
                    if (proj == null) throw new IllegalStateException("projection");
                    proj.registerCallback(new MediaProjection.Callback() {
                        @Override public void onStop() { if (recording && capRec != null) { endReason = "projection"; recording = false; } }
                    }, null);
                    capRec = openCapture(proj);
                    if (capRec == null) throw new IllegalStateException("capture");
                    recRate = 48000;
                    if (Boolean.TRUE.equals(call.getBoolean("withMic", false))) capMic = open(MediaRecorder.AudioSource.MIC, null, AudioFormat.CHANNEL_IN_MONO);
                    doStart(call);
                    if (!recording) endCapture(); // запись не началась (нет места, занято) — захват отпустить
                } catch (Exception e) { endCapture(); call.reject("unavailable"); }
            });
        }).start();
    }

    private AudioRecord openCapture(MediaProjection mp) {
        if (Build.VERSION.SDK_INT < 29) return null;
        try {
            AudioPlaybackCaptureConfiguration cfg = new AudioPlaybackCaptureConfiguration.Builder(mp)
                .addMatchingUsage(AudioAttributes.USAGE_MEDIA).addMatchingUsage(AudioAttributes.USAGE_GAME).addMatchingUsage(AudioAttributes.USAGE_UNKNOWN).build();
            AudioFormat f = new AudioFormat.Builder().setEncoding(AudioFormat.ENCODING_PCM_16BIT).setSampleRate(48000).setChannelMask(AudioFormat.CHANNEL_IN_STEREO).build();
            int min = AudioRecord.getMinBufferSize(48000, AudioFormat.CHANNEL_IN_STEREO, AudioFormat.ENCODING_PCM_16BIT);
            AudioRecord ar = new AudioRecord.Builder().setAudioFormat(f).setBufferSizeInBytes(Math.max(min * 4, 48000 * 4)).setAudioPlaybackCaptureConfig(cfg).build();
            if (ar.getState() != AudioRecord.STATE_INITIALIZED) { ar.release(); return null; }
            ar.startRecording();
            return ar;
        } catch (Exception e) { return null; }
    }

    // Конец записи звука телефона: захват и микрофон отпущены, служба — как просила страница
    private void endCapture() {
        if (capMic != null) { try { capMic.stop(); } catch (Exception e) { /* уже */ } capMic.release(); capMic = null; }
        if (proj != null) { try { proj.stop(); } catch (Exception e) { /* уже */ } proj = null; }
        capRec = null;
        KeepAliveService.proj = false;
        if (KeepAliveService.stopAfterProj) { KeepAliveService.stopAfterProj = false; getContext().stopService(new Intent(getContext(), KeepAliveService.class)); }
        else KeepAliveService.refresh(getContext());
    }

    // Папка записей: постоянная (filesDir) — кэш система может очистить сама, и запись пропала бы молча.
    // Прежние записи из кэша видны и открываются (fileOf, list)
    private File dir() { File d = new File(getContext().getFilesDir(), "voice"); if (!d.exists()) d.mkdirs(); return d; }
    private File oldDir() { return new File(getContext().getCacheDir(), "voice"); }

    private AudioRecord open(int src, AudioDeviceInfo dev, int chMask) {
        int min = AudioRecord.getMinBufferSize(recRate, chMask, AudioFormat.ENCODING_PCM_16BIT);
        if (min <= 0) return null;
        AudioRecord ar = null;
        try {
            ar = new AudioRecord(src, recRate, chMask, AudioFormat.ENCODING_PCM_16BIT, Math.max(min * 4, recRate));
            if (ar.getState() != AudioRecord.STATE_INITIALIZED) {
                ar.release();
                ar = new AudioRecord(MediaRecorder.AudioSource.MIC, recRate, chMask, AudioFormat.ENCODING_PCM_16BIT, Math.max(min * 4, recRate));
            }
            if (ar.getState() != AudioRecord.STATE_INITIALIZED) { ar.release(); return null; }
            if (dev != null) ar.setPreferredDevice(dev);
            ar.startRecording();
            return ar;
        } catch (Exception e) { if (ar != null) try { ar.release(); } catch (Exception x) { /* уже */ } return null; }
    }

    private void doStart(PluginCall call) {
        if (recording) { call.reject("busy"); return; }
        int id = call.getInt("deviceId", -1);
        boolean stereo = Boolean.TRUE.equals(call.getBoolean("stereo", false));
        boolean raw = Boolean.TRUE.equals(call.getBoolean("raw", true));
        // проверка уровня: всё как при записи, но в файл ничего не пишется
        monitor = Boolean.TRUE.equals(call.getBoolean("monitor", false));
        File d = dir();
        if (!monitor && d.getUsableSpace() < MIN_FREE) { call.reject("space"); return; }
        final boolean cap = capRec != null;
        AudioDeviceInfo dev = !cap && id >= 0 ? find(AudioManager.GET_DEVICES_INPUTS, id) : null;
        boolean bt = isBtVoice(dev);
        if (bt) useComm(dev);
        recRate = bt ? 16000 : 48000;
        recCh = cap ? 2 : stereo && !bt && dev != null && dev.getChannelCounts().length > 0 && max(dev.getChannelCounts()) >= 2 ? 2 : 1;
        final int chMask = recCh == 2 ? AudioFormat.CHANNEL_IN_STEREO : AudioFormat.CHANNEL_IN_MONO;
        if (AudioRecord.getMinBufferSize(recRate, chMask, AudioFormat.ENCODING_PCM_16BIT) <= 0) recRate = 44100;
        // UNPROCESSED — без системной обработки (если устройство умеет); голосовой канал — для Bluetooth
        final int src = bt ? MediaRecorder.AudioSource.VOICE_COMMUNICATION : raw && Build.VERSION.SDK_INT >= 24 ? MediaRecorder.AudioSource.UNPROCESSED : MediaRecorder.AudioSource.MIC;
        final AudioRecord first = cap ? capRec : open(src, dev, chMask);
        if (first == null) { releaseComm(); call.reject("unavailable"); return; }
        final AudioRecord mic = cap ? capMic : null;
        recFile = new File(d, "rec-" + System.currentTimeMillis() + ".wav");
        recFrames = 0; recording = true; paused = false; ended = false; endReason = null;
        final boolean btIn = bt;
        recThread = new Thread(() -> {
            android.os.Process.setThreadPriority(android.os.Process.THREAD_PRIORITY_URGENT_AUDIO);
            AudioRecord rec = first;
            short[] buf = new short[recRate / 20 * recCh]; // 50 мс
            byte[] bytes = new byte[buf.length * 2];
            byte[] pcm = new byte[2048]; // последние 1024 отсчёта (моно) — для спектра на экране
            int fails = 0;
            long lastHdr = 0, lastSync = 0, lastSpace = 0, lastRoute = 0;
            int routedId = rec.getRoutedDevice() == null ? -1 : rec.getRoutedDevice().getId();
            short[] mbuf = mic != null ? new short[recRate] : null; // микрофон к звуку телефона: очередь отсчётов (1 с)
            int mlen = 0;
            try (RandomAccessFile out = new RandomAccessFile(recFile, "rw")) {
                out.write(header(0, recRate, recCh)); // размер — каждую секунду: оборвётся — файл всё равно целый
                while (recording) {
                    int n = rec.read(buf, 0, buf.length);
                    if (n <= 0) {
                        // вход пропал (выдернули USB, отключилась гарнитура) или сбой — открыть встроенный микрофон и
                        // писать дальше в тот же файл; не вышло — бережно закончить, записанное остаётся
                        if (++fails < 6 && n != AudioRecord.ERROR_DEAD_OBJECT) { try { Thread.sleep(20); } catch (InterruptedException e) { break; } continue; }
                        try { rec.stop(); } catch (Exception e) { /* уже */ }
                        rec.release();
                        AudioRecord again = btIn || cap ? null : open(raw && Build.VERSION.SDK_INT >= 24 ? MediaRecorder.AudioSource.UNPROCESSED : MediaRecorder.AudioSource.MIC, null, chMask);
                        if (again == null) { rec = null; ended = true; endReason = "device"; JSObject e = new JSObject(); e.put("reason", "device"); notifyListeners("lost", e); break; }
                        rec = again; fails = 0;
                        JSObject e = new JSObject(); e.put("reason", "device"); e.put("switched", true);
                        if (again.getRoutedDevice() != null) { e.put("dev", devJson(again.getRoutedDevice())); routedId = again.getRoutedDevice().getId(); }
                        notifyListeners("lost", e);
                        continue;
                    }
                    fails = 0;
                    if (mic != null) { // микрофон — без ожидания: сколько накопилось, столько и подмешать в оба канала
                        int got = mic.read(mbuf, mlen, mbuf.length - mlen, AudioRecord.READ_NON_BLOCKING);
                        if (got > 0) mlen += got;
                        int fr = Math.min(mlen, n / 2);
                        for (int f = 0; f < fr; f++) { for (int c = 0; c < 2; c++) { int v = buf[2 * f + c] + mbuf[f]; buf[2 * f + c] = (short) Math.max(-32768, Math.min(32767, v)); } }
                        System.arraycopy(mbuf, fr, mbuf, 0, mlen - fr); mlen -= fr;
                        if (mlen > recRate / 4) mlen = 0; // отстал — догнать, не копить задержку
                    }
                    int peak = 0; double sum = 0;
                    for (int i = 0; i < n; i++) { int v = Math.abs(buf[i]); if (v > peak) peak = v; sum += (double) buf[i] * buf[i]; bytes[2 * i] = (byte) (buf[i] & 0xff); bytes[2 * i + 1] = (byte) ((buf[i] >> 8) & 0xff); }
                    if (!paused && !monitor) { out.write(bytes, 0, n * 2); recFrames += n / recCh; }
                    long now = System.currentTimeMillis();
                    if (!monitor && now - lastHdr > 1000) {
                        lastHdr = now;
                        long pos = out.getFilePointer(), data = recFrames * recCh * 2;
                        out.seek(4); out.write(le4(36 + data)); out.seek(40); out.write(le4(data)); out.seek(pos);
                        if (now - lastSync > 5000) { lastSync = now; try { out.getFD().sync(); } catch (Exception e) { /* как получится */ } }
                    }
                    // откуда на самом деле идёт звук: система могла не послушаться выбора или сменить вход на ходу
                    if (now - lastRoute > 1000) {
                        lastRoute = now;
                        AudioDeviceInfo rd = rec.getRoutedDevice();
                        int rid = rd == null ? -1 : rd.getId();
                        if (rid != routedId) { routedId = rid; JSObject re = new JSObject(); if (rd != null) re.put("dev", devJson(rd)); notifyListeners("route", re); }
                    }
                    if (!monitor && now - lastSpace > 5000) {
                        lastSpace = now;
                        if (recFile.getParentFile().getUsableSpace() < MIN_FREE / 2) { ended = true; endReason = "space"; JSObject e = new JSObject(); e.put("reason", "space"); notifyListeners("lost", e); break; }
                    }
                    int frames = n / recCh, m = Math.min(1024, frames), from = frames - m;
                    for (int i = 0; i < m; i++) {
                        int v = buf[(from + i) * recCh];
                        if (recCh == 2) v = (v + buf[(from + i) * recCh + 1]) / 2;
                        pcm[2 * i] = (byte) (v & 0xff); pcm[2 * i + 1] = (byte) ((v >> 8) & 0xff);
                    }
                    JSObject lv = new JSObject();
                    lv.put("pcm", Base64.encodeToString(pcm, 0, m * 2, Base64.NO_WRAP));
                    lv.put("rate", recRate);
                    lv.put("peak", peak / 32768.0);
                    lv.put("rms", Math.sqrt(sum / n) / 32768.0);
                    lv.put("sec", recFrames / (double) recRate);
                    lv.put("paused", paused);
                    notifyListeners("level", lv);
                }
                // окончательный заголовок
                if (!monitor) { long data = recFrames * recCh * 2; out.seek(0); out.write(header(data, recRate, recCh)); try { out.getFD().sync(); } catch (Exception e) { /* как получится */ } }
            } catch (Exception e) { ended = true; if (endReason == null) endReason = "write"; }
            if (rec != null) { try { rec.stop(); } catch (Exception e) { /* уже */ } rec.release(); }
            releaseComm();
            if (cap) { if (getActivity() != null) getActivity().runOnUiThread(this::endCapture); else endCapture(); }
        });
        recThread.start();
        JSObject r = new JSObject();
        r.put("rate", recRate);
        r.put("channels", recCh);
        r.put("bt", bt);
        r.put("routed", dev == null || first.getRoutedDevice() == null ? -1 : first.getRoutedDevice().getId());
        if (first.getRoutedDevice() != null) r.put("dev", devJson(first.getRoutedDevice()));
        r.put("raw", !cap && src == MediaRecorder.AudioSource.UNPROCESSED);
        r.put("capture", cap);
        call.resolve(r);
    }

    private static int max(int[] a) { int m = 0; for (int x : a) m = Math.max(m, x); return m; }

    @PluginMethod
    public void pause(PluginCall call) { paused = Boolean.TRUE.equals(call.getBoolean("on", true)); call.resolve(); }

    // Стоп — и после того, как запись закончилась сама (вход пропал, места нет): файл уже целый, вернуть его
    @PluginMethod
    public void stop(PluginCall call) {
        if (recFile == null || (!recording && !ended)) { call.reject("idle"); return; }
        recording = false;
        try { if (recThread != null) recThread.join(3000); } catch (InterruptedException e) { /* ну и ладно */ }
        ended = false;
        JSObject r = new JSObject();
        r.put("path", recFile.getName());
        r.put("size", recFile.length());
        r.put("sec", recFrames / (double) recRate);
        r.put("rate", recRate);
        r.put("channels", recCh);
        if (endReason != null) r.put("reason", endReason);
        if (monitor) recFile.delete(); // проверка уровня — файла нет
        recFile = null;
        call.resolve(r);
    }

    private static byte[] le4(long v) { byte[] b = new byte[4]; le(b, 0, v, 4); return b; }

    private static byte[] header(long data, int rate, int ch) {
        byte[] h = new byte[44];
        put(h, 0, "RIFF"); le(h, 4, 36 + data, 4); put(h, 8, "WAVE"); put(h, 12, "fmt "); le(h, 16, 16, 4); le(h, 20, 1, 2); le(h, 22, ch, 2);
        le(h, 24, rate, 4); le(h, 28, (long) rate * ch * 2, 4); le(h, 32, ch * 2, 2); le(h, 34, 16, 2); put(h, 36, "data"); le(h, 40, data, 4);
        return h;
    }
    private static void put(byte[] b, int o, String s) { for (int i = 0; i < s.length(); i++) b[o + i] = (byte) s.charAt(i); }
    private static void le(byte[] b, int o, long v, int n) { for (int i = 0; i < n; i++) b[o + i] = (byte) ((v >> (8 * i)) & 0xff); }

    /* ---------- файлы записей (папка приложения): чтение и запись частями ---------- */

    private File fileOf(PluginCall call) {
        String name = call.getString("path", "").replaceAll("[\\\\/]", "_");
        File f = new File(dir(), name);
        if (!f.exists()) { File o = new File(oldDir(), name); if (o.exists()) return o; }
        return f;
    }

    @PluginMethod
    public void read(PluginCall call) {
        File f = fileOf(call);
        // номер из JS приходит как Integer — getLong принимает только Long и вернул бы 0: каждый кусок читался с начала
        // файла, и в записи по кругу повторялись первые ~8 с
        Object ov = call.getData().opt("offset");
        long off = ov instanceof Number ? ((Number) ov).longValue() : 0L;
        int len = call.getInt("length", 1 << 20);
        try (RandomAccessFile r = new RandomAccessFile(f, "r")) {
            long size = r.length();
            int n = (int) Math.max(0, Math.min(len, size - off));
            byte[] b = new byte[n];
            r.seek(off); r.readFully(b);
            JSObject o = new JSObject();
            o.put("data", Base64.encodeToString(b, Base64.NO_WRAP));
            o.put("size", size);
            call.resolve(o);
        } catch (Exception e) { call.reject("read"); }
    }

    @PluginMethod
    public void write(PluginCall call) {
        File f = fileOf(call);
        try (FileOutputStream out = new FileOutputStream(f, Boolean.TRUE.equals(call.getBoolean("append", false)))) {
            out.write(Base64.decode(call.getString("data", ""), Base64.DEFAULT));
            call.resolve();
        } catch (Exception e) { call.reject("write"); }
    }

    @PluginMethod
    public void remove(PluginCall call) { fileOf(call).delete(); call.resolve(); }

    // Исходники записей в памяти диктофона (rec-*.wav): после сбоя или закрытия запись можно открыть снова
    @PluginMethod
    public void list(PluginCall call) {
        JSArray a = new JSArray();
        for (File d : new File[] { dir(), oldDir() }) {
            File[] fs = d.listFiles();
            if (fs != null) for (File f : fs) {
                if (!f.getName().startsWith("rec-") || !f.getName().endsWith(".wav") || f.length() <= 44) continue;
                if (recording && recFile != null && f.getName().equals(recFile.getName())) continue; // пишется сейчас
                JSObject o = new JSObject();
                o.put("path", f.getName()); o.put("size", f.length()); o.put("at", f.lastModified());
                a.put(o);
            }
        }
        JSObject r = new JSObject();
        r.put("files", a);
        call.resolve(r);
    }

    /* ---------- воспроизведение на выбранный выход ---------- */

    @PluginMethod
    public void play(PluginCall call) {
        stopPlayback();
        File f = fileOf(call);
        double from = call.getDouble("from", 0.0);
        // выходы: deviceIds — несколько сразу (слово автора 07.11.2026: «звук сразу в два выхода»; опыт — Android может
        // оставить один), deviceId — один, -1 — как решит система
        java.util.List<AudioDeviceInfo> devs = new java.util.ArrayList<>();
        JSArray ids = call.getArray("deviceIds");
        try { if (ids != null) for (int i = 0; i < ids.length(); i++) { AudioDeviceInfo d = find(AudioManager.GET_DEVICES_OUTPUTS, ids.getInt(i)); if (d != null && !devs.contains(d)) devs.add(d); } } catch (Exception e) { /* неверный список — как один */ }
        if (devs.isEmpty()) { int id = call.getInt("deviceId", -1); AudioDeviceInfo d = id >= 0 ? find(AudioManager.GET_DEVICES_OUTPUTS, id) : null; devs.add(d); }
        int rate, ch;
        long dataOff = 44;
        try (RandomAccessFile r = new RandomAccessFile(f, "r")) {
            byte[] h = new byte[44]; r.readFully(h);
            ch = (h[22] & 0xff) | ((h[23] & 0xff) << 8);
            rate = (h[24] & 0xff) | ((h[25] & 0xff) << 8) | ((h[26] & 0xff) << 16) | ((h[27] & 0xff) << 24);
        } catch (Exception e) { call.reject("read"); return; }
        final int fRate = rate, fCh = ch;
        int chMask = ch == 2 ? AudioFormat.CHANNEL_OUT_STEREO : AudioFormat.CHANNEL_OUT_MONO;
        int min = AudioTrack.getMinBufferSize(rate, chMask, AudioFormat.ENCODING_PCM_16BIT);
        final java.util.List<AudioTrack> trs = new java.util.ArrayList<>();
        for (AudioDeviceInfo dev : devs) {
            boolean ear = dev != null && dev.getType() == AudioDeviceInfo.TYPE_BUILTIN_EARPIECE;
            AudioAttributes attr = new AudioAttributes.Builder().setUsage(ear ? AudioAttributes.USAGE_VOICE_COMMUNICATION : AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build();
            try {
                AudioTrack tr = new AudioTrack(attr, new AudioFormat.Builder().setSampleRate(rate).setChannelMask(chMask).setEncoding(AudioFormat.ENCODING_PCM_16BIT).build(),
                    Math.max(min * 2, rate / 5), AudioTrack.MODE_STREAM, AudioManager.AUDIO_SESSION_ID_GENERATE);
                if (tr.getState() != AudioTrack.STATE_INITIALIZED) { tr.release(); continue; }
                if (dev != null) tr.setPreferredDevice(dev);
                trs.add(tr);
            } catch (Exception e) { /* этот выход не открылся — остальные звучат */ }
        }
        if (trs.isEmpty()) { call.reject("out"); return; }
        playing = true;
        final long start = dataOff + ((long) (from * rate) * ch * 2);
        playThread = new Thread(() -> {
            try (FileInputStream in = new FileInputStream(f)) {
                in.skip(start);
                byte[] buf = new byte[fRate / 20 * fCh * 2];
                for (AudioTrack tr : trs) tr.play();
                long played = (start - 44) / (fCh * 2);
                int n;
                while (playing && (n = in.read(buf)) > 0) {
                    for (AudioTrack tr : trs) tr.write(buf, 0, n); // каждый выход берёт свою копию; идут вровень — у всех одна частота
                    played += n / (fCh * 2);
                    JSObject p = new JSObject(); p.put("sec", played / (double) fRate); notifyListeners("pos", p);
                }
            } catch (Exception e) { /* остановлено */ }
            for (AudioTrack tr : trs) { try { tr.stop(); } catch (Exception e) { /* уже */ } tr.release(); }
            boolean natural = playing;
            playing = false;
            JSObject e = new JSObject(); e.put("done", natural); notifyListeners("end", e);
        });
        playThread.start();
        JSObject r = new JSObject();
        AudioTrack t0 = trs.get(0);
        r.put("routed", t0.getRoutedDevice() == null ? -1 : t0.getRoutedDevice().getId());
        JSArray routed = new JSArray();
        for (AudioTrack tr : trs) routed.put(tr.getRoutedDevice() == null ? -1 : tr.getRoutedDevice().getId());
        r.put("routedAll", routed);
        call.resolve(r);
    }

    private void stopPlayback() {
        playing = false;
        if (playThread != null) { try { playThread.join(1000); } catch (InterruptedException e) { /* ну и ладно */ } playThread = null; }
    }

    @PluginMethod
    public void stopPlay(PluginCall call) { stopPlayback(); call.resolve(); }
}
