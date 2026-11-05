// Движок записи (диктофон и запись в инструментах — одна система): входы и выходы звука, запись с выбранного входа,
// воспроизведение на выбранный выход; route — направить микрофон страницы на выбранный вход (запись в инструментах).
// Android — плагин Voice (AudioRecord/AudioTrack с выбором устройства: телефон, гарнитура, Bluetooth, USB-приёмники
// петличек); веб — getUserMedia с deviceId и setSinkId, где браузер умеет. Записи — WAV, только на устройстве.
import { Capacitor, registerPlugin } from '@capacitor/core';
import { encodeWav } from './voicefx.js';
import { REC } from './recstate.js';
import { log } from '../core/log.js';

const V = Capacitor.isNativePlatform() ? registerPlugin('Voice') : null;
const CHUNK = 768 * 1024;
const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = (s) => { const b = atob(s), u8 = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u8[i] = b.charCodeAt(i); return u8; };

// Петлички и радиосистемы — по имени устройства (настройки самих петличек — в их приложениях: протоколы закрыты)
const LAV = /lark|hollyland|dji|wireless\s*mic|mic\s*(mini|2|se)|rode|wireless\s*go|boya|saramonic|synco|comica|lav|петлич/i;
export const isLav = (d) => LAV.test(d.name || '');
// Вид устройства по типу (Android AudioDeviceInfo или догадка по имени в браузере) — для подписей
export const KIND = { builtin_mic: 'phone', speaker: 'speaker', earpiece: 'earpiece', wired_headset: 'wired', wired_headphones: 'wired', line: 'wired', bt_sco: 'bt', bt_a2dp: 'bt', ble_headset: 'bt', ble_speaker: 'bt', bt: 'bt', usb_device: 'usb', usb_headset: 'usb', usb_accessory: 'usb', hdmi: 'hdmi' };
export const devKind = (d) => KIND[d && d.type] || 'other';

/* ---------- Android ---------- */

function nativeEngine() {
  const subs = { level: new Set(), pos: new Set(), end: new Set(), devices: new Set(), lost: new Set(), route: new Set() };
  // уровень: кусочек сигнала для спектра (int16, моно) → Float32Array
  const toF = (e) => { if (e && e.pcm) { const u = unb64(e.pcm), n = u.length >> 1, x = new Float32Array(n); for (let i = 0; i < n; i++) { const v = u[2 * i] | (u[2 * i + 1] << 8); x[i] = (v > 32767 ? v - 65536 : v) / 32768; } e.samples = x; } return e; };
  ['level', 'pos', 'end', 'devices', 'lost', 'route'].forEach((k) => V.addListener(k, (e) => { if (k === 'level') toF(e); subs[k].forEach((fn) => fn(e)); }));
  return {
    native: true,
    on: (k, fn) => { subs[k].add(fn); return () => subs[k].delete(fn); },
    devices: async () => { const r = await V.devices(); return { inputs: r.inputs || [], outputs: r.outputs || [] }; },
    start: (o) => V.start(o).then((r) => { REC.voice = !o.monitor; return r; }),
    pause: (on) => V.pause({ on }),
    stop: () => V.stop().finally(() => { REC.voice = false; }),
    async read(path) {
      const parts = []; let off = 0, size = Infinity;
      while (off < size) { const r = await V.read({ path, offset: off, length: CHUNK }); size = r.size; const u = unb64(r.data || ''); if (!u.length) break; parts.push(u); off += u.length; }
      const out = new Uint8Array(off); let p = 0; parts.forEach((u) => { out.set(u, p); p += u.length; });
      return out;
    },
    async write(path, u8) { for (let off = 0; off < u8.length || off === 0; off += CHUNK) { await V.write({ path, data: b64(u8.subarray(off, off + CHUNK)), append: off > 0 }); if (!u8.length) break; } },
    remove: (path) => V.remove({ path }).catch(() => {}),
    // исходники записей в памяти (rec-*.wav): { path, size, at }
    list: () => V.list().then((r) => r.files || []).catch(() => []),
    play: (path, deviceId, from = 0) => V.play({ path, deviceId: deviceId ?? -1, from }),
    stopPlay: () => V.stopPlay(),
    route: (deviceId) => V.route({ deviceId: deviceId == null || deviceId === '' ? -1 : +deviceId }).catch(() => ({})),
    unroute: () => V.unroute().catch(() => {}),
  };
}

/* ---------- браузер, Windows, Linux ---------- */

// Записи — в IndexedDB кусками по ~2 с, пока идёт запись: закрыли окно, сбой, выключился компьютер — записанное
// остаётся и открывается из «Записей в памяти» (list/read собирают WAV из кусков). Исходник — 32 бит с плавающей точкой,
// как отдаёт браузер. Нет IndexedDB — в памяти страницы, как раньше.
const DB = 'melete-voice';
let dbp = null;
function db() {
  if (dbp) return dbp;
  dbp = new Promise((res) => {
    try {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => { const d = r.result; d.createObjectStore('files'); d.createObjectStore('chunks'); };
      r.onsuccess = () => res(r.result);
      r.onerror = () => res(null);
    } catch { res(null); }
  });
  return dbp;
}
const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
async function tx(store, mode, fn) {
  const d = await db();
  if (!d) return null;
  const t = d.transaction(store, mode), out = await fn(t.objectStore(store));
  await new Promise((res, rej) => { t.oncomplete = res; t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); });
  return out;
}
const range = (path) => IDBKeyRange.bound([path, 0], [path, Infinity]);
// куски записи (+ куски, которые IndexedDB не приняла — место кончилось) → WAV (32f)
async function assemble(path, extra = []) {
  const keys = (await tx('chunks', 'readonly', (s) => req(s.getAllKeys(range(path)))).catch(() => null)) || [];
  const vals = (await tx('chunks', 'readonly', (s) => req(s.getAll(range(path)))).catch(() => null)) || [];
  const parts = vals.map((v, i) => ({ ...v, seq: keys[i] ? keys[i][1] : i })).concat(extra).sort((a, b) => a.seq - b.seq);
  if (!parts.length) return null;
  const { sr, nc } = parts[0], n = parts.reduce((a, p) => a + p.data.length / nc, 0), ch = Array.from({ length: nc }, () => new Float32Array(n));
  let o = 0;
  parts.forEach((p) => { const m = p.data.length / nc; for (let i = 0; i < m; i++) for (let c = 0; c < nc; c++) ch[c][o + i] = p.data[i * nc + c]; o += m; });
  return { wav: encodeWav(ch, sr, 32), sec: n / sr, sr, nc, at: parts[parts.length - 1].at || Date.now() };
}

// Свободное место для записей (IndexedDB): оценка браузера; не знает — считаем, что хватает
const MIN_FREE = 100 * 1048576;
async function freeBytes() {
  try { const e = await navigator.storage.estimate(); return e && e.quota ? e.quota - (e.usage || 0) : Infinity; } catch { return Infinity; }
}
// Что за вход на самом деле открыт: имя, частота, каналы (по настройкам дорожки)
function infoOf(stream) {
  const tr = stream && stream.getAudioTracks()[0];
  if (!tr) return null;
  const s = (tr.getSettings && tr.getSettings()) || {};
  return { id: s.deviceId || '', name: tr.label || '', rate: s.sampleRate || 0, channels: s.channelCount || 0 };
}
function webEngine() {
  const subs = { level: new Set(), pos: new Set(), end: new Set(), devices: new Set(), lost: new Set(), route: new Set() };
  const emit = (k, e) => subs[k].forEach((fn) => fn(e));
  const mem = new Map(); // путь → WAV, если IndexedDB нет
  let rec = null, audio = null;
  if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) navigator.mediaDevices.addEventListener('devicechange', () => emit('devices', {}));
  const typeOf = (d) => (/bluetooth|bt|airpods|buds/i.test(d.label) ? 'bt' : /usb/i.test(d.label) ? 'usb_device' : /head|гарнитур|наушник/i.test(d.label) ? 'wired_headset' : d.kind === 'audiooutput' ? 'speaker' : 'builtin_mic');
  const putFile = async (path, u8, meta = {}) => { const ok = await tx('files', 'readwrite', (s) => req(s.put({ u8, at: Date.now(), ...meta }, path))).then(() => true, () => false); if (!ok) mem.set(path, u8); };
  // открыть вход: устройство (deviceId) или звук экрана/вкладки (getDisplayMedia: звук компьютера, урок в браузере)
  async function openStream(deviceId, nc, raw) {
    const dsp = { echoCancellation: !raw, noiseSuppression: !raw, autoGainControl: !raw };
    if (deviceId === 'display') {
      const s = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, systemAudio: 'include' });
      s.getVideoTracks().forEach((t) => { t.stop(); s.removeTrack(t); });
      if (!s.getAudioTracks().length) throw Object.assign(new Error('noaudio'), { name: 'NoAudio' });
      return s;
    }
    return navigator.mediaDevices.getUserMedia({ audio: { ...(deviceId && deviceId !== -1 ? { deviceId: { exact: deviceId } } : {}), channelCount: nc, ...dsp } });
  }
  return {
    native: false,
    on: (k, fn) => { subs[k].add(fn); return () => subs[k].delete(fn); },
    canDisplay: () => !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia),
    async devices() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return { inputs: [], outputs: [] };
      const list = await navigator.mediaDevices.enumerateDevices();
      const map = (k) => list.filter((d) => d.kind === k && d.deviceId !== 'communications').map((d, i) => ({ id: d.deviceId, type: d.deviceId === 'default' ? (k === 'audioinput' ? 'builtin_mic' : 'speaker') : typeOf(d), name: d.label || (k === 'audioinput' ? 'Mic ' : 'Out ') + (i + 1), channels: 2 }));
      const inputs = map('audioinput');
      if (this.canDisplay()) inputs.push({ id: 'display', type: 'display', name: '', channels: 2 });
      return { inputs, outputs: 'setSinkId' in HTMLMediaElement.prototype ? map('audiooutput') : [] };
    },
    async start({ deviceId, stereo, raw, monitor }) {
      const nc = stereo || deviceId === 'display' ? 2 : 1;
      // места мало — не начинать: запись, оборвавшаяся на середине, хуже, чем честный отказ сразу
      if (!monitor && (await freeBytes()) < MIN_FREE) throw Object.assign(new Error('space'), { message: 'space' });
      let stream;
      const why = (e) => (e && e.name === 'NotAllowedError' ? 'denied' : e && e.name === 'NoAudio' ? 'noaudio' : e && (e.name === 'NotFoundError' || e.name === 'OverconstrainedError' || e.name === 'TypeError') ? 'nomic' : 'unavailable');
      try { stream = await openStream(deviceId, nc, raw); }
      catch (e) { throw Object.assign(new Error('mic'), { message: why(e) }); }
      // контекст — на родной частоте входа (USB-микрофон 44,1 или 96 кГц пишется без пересчёта); не умеет — как выйдет
      const set0 = (stream.getAudioTracks()[0] && stream.getAudioTracks()[0].getSettings && stream.getAudioTracks()[0].getSettings()) || {};
      const AC = window.AudioContext || window.webkitAudioContext;
      let c;
      try { c = set0.sampleRate ? new AC({ latencyHint: 'balanced', sampleRate: set0.sampleRate }) : new AC({ latencyHint: 'balanced' }); }
      catch { c = new AC({ latencyHint: 'balanced' }); }
      if (c.state !== 'running') { try { await c.resume(); } catch (e) { log('voice', 'звук записи не запустился сразу: ' + ((e && e.name) || e) + ' — пробуем дальше', 'w'); } }
      let src = c.createMediaStreamSource(stream);
      const path = 'rec-' + Date.now() + '.wav', sr = c.sampleRate;
      let frames = 0, paused = false, seq = 0, pend = [], pendN = 0, lastFlush = 0, node = null, sp = null, ended = false;
      const memParts = [];
      let rec0done = null, rec0node = null;
      const drained = () => new Promise((res) => { rec0done = res; setTimeout(res, 400); });
      const flush = async (force) => {
        if (!pendN || (!force && performance.now() - lastFlush < 2000)) return;
        lastFlush = performance.now();
        const data = new Float32Array(pendN * nc);
        let o = 0;
        pend.forEach((b) => { const m = b[0].length; for (let i = 0; i < m; i++) for (let k = 0; k < nc; k++) data[(o + i) * nc + k] = b[Math.min(k, b.length - 1)][i]; o += m; });
        pend = []; pendN = 0;
        const q = seq++, rec0 = { data, sr, nc, at: Date.now() };
        const ok = await tx('chunks', 'readwrite', (s) => req(s.put(rec0, [path, q]))).then(() => true, () => false);
        if (!ok) memParts.push({ ...rec0, seq: q });
      };
      const onChunk = (bufs) => {
        let peak = 0, sum = 0;
        const x0 = bufs[0];
        for (let k = 0; k < bufs.length; k++) { const x = bufs[k]; for (let i = 0; i < x.length; i++) { const v = Math.abs(x[i]); if (v > peak) peak = v; sum += x[i] * x[i]; } }
        if (!paused && !monitor) { pend.push(bufs); pendN += x0.length; frames += x0.length; flush(false); }
        emit('level', { peak, rms: Math.sqrt(sum / (x0.length * bufs.length)), sec: frames / sr, paused, samples: x0.slice(-1024), rate: sr });
      };
      try {
        await c.audioWorklet.addModule(new URL('./wl/rec.worklet.js', import.meta.url));
        node = new AudioWorkletNode(c, 'melete-rec', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: nc, channelCountMode: 'explicit', processorOptions: { nc } });
        node.port.onmessage = (e) => { if (e.data === 'done') { if (rec0done) rec0done(); } else onChunk(e.data); };
        const mute = c.createGain(); mute.gain.value = 0; // узел должен тянуться выходом, звук — в тишину
        src.connect(node).connect(mute).connect(c.destination);
        rec0node = node;
      } catch {
        // запасной путь: ScriptProcessor (старые движки без AudioWorklet)
        sp = c.createScriptProcessor(4096, nc, nc);
        sp.onaudioprocess = (e) => onChunk(Array.from({ length: nc }, (_, k) => Float32Array.from(e.inputBuffer.getChannelData(Math.min(k, e.inputBuffer.numberOfChannels - 1)))));
        src.connect(sp); sp.connect(c.destination);
      }
      // вход пропал (выдернули USB, Bluetooth отключился): открыть встроенный микрофон и писать дальше в тот же файл,
      // как на Android; не вышло (или это был звук экрана) — бережно закончить, записанное сохраняется
      const sink = () => rec0node || sp;
      const watch = (st) => st.getAudioTracks().forEach((tr) => { tr.onended = async () => {
        if (!rec || ended || rec.stream !== st) return;
        if (deviceId !== 'display') {
          try {
            const s2 = await openStream(-1, nc, raw), src2 = c.createMediaStreamSource(s2);
            try { src.disconnect(); } catch { /* уже */ }
            src2.connect(sink()); src = src2; rec.stream = s2; rec.src = src2; watch(s2);
            emit('lost', { reason: 'device', switched: true, dev: infoOf(s2) });
            return;
          } catch { /* встроенного нет */ }
        }
        ended = true; emit('lost', { reason: 'device' });
      }; });
      watch(stream);
      // система «усыпила» звук (звонок, другое приложение взяло вход) — разбудить; не просыпается — сказать
      c.onstatechange = () => { if (rec && rec.c === c && c.state === 'suspended') c.resume().catch(() => emit('lost', { reason: 'suspended', soft: true })); };
      // место кончается во время записи — остановить, пока всё записанное цело
      const spaceT = monitor ? 0 : setInterval(async () => { if (rec && rec.c === c && !ended && (await freeBytes()) < MIN_FREE / 3) { ended = true; emit('lost', { reason: 'space' }); } }, 10000);
      rec = { c, stream, src, node, sp, path, sr, nc, memParts, flush, drained, spaceT, get frames() { return frames; }, setPaused: (v) => { paused = v; } };
      if (!monitor) REC.voice = true;
      return { rate: sr, channels: nc, path, dev: infoOf(stream) };
    },
    async pause(on) { if (rec) rec.setPaused(on); },
    async stop() {
      const r = rec; rec = null; REC.voice = false;
      if (!r) throw new Error('idle');
      if (r.spaceT) clearInterval(r.spaceT);
      r.c.onstatechange = null;
      // дождаться последних отсчётов из потока звука (недописанный кусок)
      if (r.node) { const d = r.drained(); r.node.port.postMessage('stop'); await d; r.node.port.onmessage = null; }
      else await new Promise((res) => setTimeout(res, 120));
      try { r.src.disconnect(); } catch { /* уже */ }
      if (r.sp) { try { r.sp.disconnect(); } catch { /* уже */ } }
      r.stream.getTracks().forEach((t) => t.stop());
      await r.flush(true);
      try { await r.c.close(); } catch { /* уже */ }
      const out = await assemble(r.path, r.memParts).catch(() => null);
      if (!out) throw new Error('empty');
      await putFile(r.path, out.wav);
      await tx('chunks', 'readwrite', (s) => req(s.delete(range(r.path)))).catch(() => {});
      return { path: r.path, size: out.wav.length, sec: out.sec, rate: r.sr, channels: r.nc };
    },
    async read(path) {
      if (mem.has(path)) return mem.get(path);
      const f = await tx('files', 'readonly', (s) => req(s.get(path))).catch(() => null);
      if (f) return f.u8;
      const a = await assemble(path).catch(() => null); // запись оборвалась — собрать из кусков
      if (!a) return undefined;
      await putFile(path, a.wav);
      await tx('chunks', 'readwrite', (s) => req(s.delete(range(path)))).catch(() => {});
      return a.wav;
    },
    write: async (path, u8) => { if (path.startsWith('proc-')) mem.set(path, u8); else await putFile(path, u8); },
    remove: async (path) => { mem.delete(path); await tx('files', 'readwrite', (s) => req(s.delete(path))).catch(() => {}); await tx('chunks', 'readwrite', (s) => req(s.delete(range(path)))).catch(() => {}); },
    // исходники записей: готовые и оборванные (куски без WAV)
    async list() {
      const out = [];
      await tx('files', 'readonly', (s) => new Promise((res) => {
        const r = s.openCursor();
        r.onsuccess = () => { const cu = r.result; if (!cu) return res(); if (String(cu.key).startsWith('rec-')) out.push({ path: cu.key, size: cu.value.u8.length, at: cu.value.at }); cu.continue(); };
        r.onerror = () => res();
      })).catch(() => {});
      const open = new Map();
      await tx('chunks', 'readonly', (s) => new Promise((res) => {
        const r = s.openCursor();
        r.onsuccess = () => { const cu = r.result; if (!cu) return res(); const [p] = cu.key, v = cu.value, o = open.get(p) || { path: p, size: 44, at: 0 }; o.size += v.data.length * 4; o.at = Math.max(o.at, v.at || 0); open.set(p, o); cu.continue(); };
        r.onerror = () => res();
      })).catch(() => {});
      open.forEach((o, p) => { if (!(rec && rec.path === p) && !out.some((f) => f.path === p)) out.push({ ...o, cut: true }); });
      return out;
    },
    async play(path, deviceId, from = 0) {
      this.stopPlay();
      const u8 = await this.read(path), url = URL.createObjectURL(new Blob([u8], { type: 'audio/wav' }));
      audio = new Audio(url);
      if (deviceId && deviceId !== -1 && audio.setSinkId) { try { await audio.setSinkId(deviceId); } catch (e) { log('voice', 'выбранный выход недоступен — звучит выход по умолчанию: ' + ((e && e.name) || e), 'w'); } }
      audio.currentTime = from;
      audio.ontimeupdate = () => emit('pos', { sec: audio.currentTime });
      audio.onended = () => { emit('end', { done: true }); URL.revokeObjectURL(url); };
      await audio.play();
      return {};
    },
    route: async () => ({}), // в браузере вход выбирается deviceId при открытии микрофона
    unroute: async () => {},
    async stopPlay() { if (audio) { audio.pause(); audio.onended = null; emit('end', { done: false }); audio = null; } },
  };
}

let ENGINE = null;
export const engine = () => ENGINE || (ENGINE = V ? nativeEngine() : webEngine());
