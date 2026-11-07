// Полное разделение на телефоне Melete DEV (слово автора 07.11.2026): пакеты stems и roformer — только в android-dev;
// там режимы 2/4/6 и улучшенный вокал, в pre (пакетов нет) — только вокал и инструментал
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false, getPlatform: () => 'android', convertFileSrc: (x) => x }, registerPlugin: () => ({}) }));

const load = async (packed) => {
  vi.resetModules();
  globalThis.__PACKED__ = packed;
  return import('../src/audio/stems.js');
};
afterEach(() => { delete globalThis.__PACKED__; });

describe('полное разделение: DEV и pre', () => {
  beforeEach(() => vi.resetModules());
  it('pre (пакетов stems и roformer нет): только вокал и инструментал', async () => {
    const S = await load(['piano', 'vocals', 'ffmpeg']);
    expect(S.fullStems()).toBe(false);
    expect(S.modesHere()).toEqual(['2']);
    expect(S.stemsSupported('4')).toBe(false);
    expect(S.hqVocalsModel()).toBe(false);
    expect(S.hqPack()).toBe(null);
  });
  it('DEV: режимы 2/4/6; пока пакет не скачан — разделения нет, предлагается пакет', async () => {
    const S = await load(['piano', 'vocals', 'ffmpeg', 'stems', 'roformer']);
    expect(S.fullStems()).toBe(true);
    expect(S.modesHere()).toEqual(['2', '4', '6']);
    expect(S.stemsSupported('4')).toBe(false);
    expect(S.stemsPack('4')).toBe('stems');
    expect(S.stemsPack('6')).toBe('stems');
    expect(S.stemsPack('2')).toBe('vocals');
    expect(S.hqPack()).toBe('roformer');
    expect(S.hqVocalsModel()).toBe(false);
  });
  it('опись: stems и roformer — только android-dev, в них HTDemucs 4 и 6 и RoFormer', () => {
    const models = JSON.parse(readFileSync('build/models.json', 'utf8'));
    expect(models.packs.stems).toEqual(['android-dev']);
    expect(models.packs.roformer).toEqual(['android-dev']);
    const idx = JSON.parse(readFileSync('build/packs.json', 'utf8'));
    expect(idx.files.stems.map(([p]) => p)).toEqual(['models/demucs/htdemucs_6s.onnx', 'models/demucs/htdemucs_embedded.onnx']);
    expect(idx.files.roformer.map(([p]) => p)).toEqual(['models/roformer/mel-roformer.fp16.onnx']);
  });
});
