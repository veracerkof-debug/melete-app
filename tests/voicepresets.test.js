import { describe, it, expect } from 'vitest';
import { BUILTIN, applyPreset, isDirty, saveAs, overwrite, rename, remove, move, migratePresets, presetSound, neutralChain } from '../src/audio/voicepresets.js';
import { encodeWav, decodeWav, withCue, readCue } from '../src/audio/voicefx.js';
import { normalizeFx } from '../src/audio/fx.js';
import { normalizeVoiceSet, editVoiceSet } from '../src/audio/vocal.js';

const fresh = () => ({ voice: normalizeVoiceSet({ mode: 'music' }), chain: normalizeFx({}), fx: { gain: 0 } });

describe('диктофон: пресеты', () => {
  it('готовые — режимы обработки с чистой цепочкой; выбор меняет звук', () => {
    const s = fresh();
    expect(BUILTIN).toContain('speech');
    applyPreset(s, 'speech');
    expect(s.cur).toBe('speech');
    expect(s.voice.mode).toBe('speech');
    expect(neutralChain(s.chain)).toBe(true);
    expect(isDirty(s)).toBe(false);
  });
  it('правка — «изменён»; готовый не портится; «Сохранить как» — новый свой с этим звуком', () => {
    const s = fresh(); applyPreset(s, 'vocal');
    s.chain = normalizeFx({ ...s.chain, rev: 0.3 });
    expect(isDirty(s)).toBe(true);
    expect(presetSound(s, 'vocal').chain.rev).toBe(0);
    const id = saveAs(s, '  Хор в зале  ', () => 0.5);
    expect(s.cur).toBe(id);
    expect(s.presets[0].name).toBe('Хор в зале');
    expect(isDirty(s)).toBe(false);
    // другой пресет и обратно — звук своего возвращается
    applyPreset(s, 'raw'); expect(s.chain.rev).toBe(0);
    applyPreset(s, id); expect(s.chain.rev).toBe(0.3); expect(s.voice.mode).toBe('vocal');
  });
  it('свой: сохранить поверх, переименовать, переставить, удалить', () => {
    const s = fresh();
    const a = saveAs(s, 'A', () => 0.1), b = saveAs(s, 'B', () => 0.2);
    applyPreset(s, a);
    s.voice = editVoiceSet(s.voice, 'eqPres', 3); s.fx.gain = 6;
    expect(isDirty(s)).toBe(true);
    overwrite(s); expect(isDirty(s)).toBe(false);
    expect(s.presets.find((p) => p.id === a).gain).toBe(6);
    rename(s, b, 'Бэк'); expect(s.presets[1].name).toBe('Бэк');
    move(s, 1, 0); expect(s.presets.map((p) => p.name)).toEqual(['Бэк', 'A']);
    remove(s, a); expect(s.presets).toHaveLength(1); expect(s.cur).toBe('music');
  });
  it('вид панели эффектов (простой/продвинутый) не считается правкой и сохраняется при выборе', () => {
    const s = fresh(); applyPreset(s, 'music');
    s.chain = normalizeFx({ ...s.chain, mode: 'adv' });
    expect(isDirty(s)).toBe(false);
    applyPreset(s, 'speech'); expect(s.chain.mode).toBe('adv');
  });
  it('переезд: настроенная цепочка или свой режим — свой пресет, звук тот же; без правок — готовый', () => {
    const a = { voice: normalizeVoiceSet({ mode: 'speech' }), chain: normalizeFx({}), fx: { gain: 0 } };
    migratePresets(a, 'Мой'); expect(a.cur).toBe('speech'); expect(a.presets).toEqual([]);
    const b = { voice: normalizeVoiceSet({ mode: 'music' }), chain: normalizeFx({ comp: 0.4 }), fx: { gain: 3 } };
    migratePresets(b, 'Мой');
    expect(b.presets[0].name).toBe('Мой'); expect(b.cur).toBe(b.presets[0].id); expect(isDirty(b)).toBe(false);
    expect(migratePresets(b, 'Мой')).toBe(false); // один раз
  });
  it('переезд новичка: прежнее умолчание диктофона (срез 80 Гц в продвинутом виде, вид не выбран) — не настройка', async () => {
    const { migrateVoiceFx } = await import('../src/audio/voicefx.js');
    const s = { voice: normalizeVoiceSet({ mode: 'music' }), chain: normalizeFx(migrateVoiceFx({ denoise: 0, gate: -90, gain: 0, normalize: true })), fx: { gain: 0 } };
    expect(neutralChain(s.chain)).toBe(true);
    migratePresets(s, 'Мой');
    expect(s.presets).toEqual([]); expect(s.cur).toBe('music'); expect(isDirty(s)).toBe(false);
    // а в продвинутом виде этот срез звучит
    expect(neutralChain({ ...s.chain, mode: 'adv', adv: [{ type: 'highpass', f: 80, g: 0, q: 0.7, on: true }] })).toBe(false);
  });
});

describe('диктофон: метки в WAV', () => {
  const tone = (n, sr) => [Float32Array.from({ length: n }, (_, i) => Math.sin((i / sr) * 2 * Math.PI * 440) * 0.5)];
  it('cue и подписи: звук не меняется, метки читаются обратно', () => {
    const sr = 48000, ch = tone(sr * 2, sr);
    [16, 24, 32].forEach((bits) => {
      const wav = encodeWav(ch, sr, bits), out = withCue(wav, [{ t: 1.5, name: '2-й куплет' }, { t: 0.5, name: '' }], sr);
      const a = decodeWav(wav), b = decodeWav(out);
      expect(b.ch[0].length).toBe(a.ch[0].length);
      expect(b.ch[0][12345]).toBe(a.ch[0][12345]);
      expect(readCue(out)).toEqual([{ t: 0.5, name: '' }, { t: 1.5, name: '2-й куплет' }]);
      expect(new DataView(out.buffer).getUint32(4, true)).toBe(out.length - 8);
    });
  });
  it('нечётная длина данных (24 бит моно) — выравнивание, звук целый', () => {
    const sr = 44100, ch = tone(1001, sr), wav = encodeWav(ch, sr, 24), out = withCue(wav, [{ t: 0.01 }], sr);
    expect(decodeWav(out).ch[0].length).toBe(1001);
    expect(readCue(out)).toHaveLength(1);
  });
  it('оборванный заголовок (размер 0) и без меток — файл как есть', () => {
    const sr = 48000, wav = encodeWav(tone(4800, sr), sr, 16);
    expect(withCue(wav, [], sr)).toBe(wav);
    const broken = wav.slice(); new DataView(broken.buffer).setUint32(40, 0, true);
    expect(withCue(broken, [{ t: 0.05 }], sr)).toBe(broken);
  });
});
