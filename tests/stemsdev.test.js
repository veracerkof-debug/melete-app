// Телефон (и DEV, и pre) — только вокал и инструментал (слово автора 21.11.2026, отменило 07.11); 4/6 и улучшенный вокал — компьютер
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
  it('DEV (решение 21.11.2026): даже с пакетами stems и roformer телефон делит только на вокал и инструментал', async () => {
    const S = await load(['piano', 'vocals', 'ffmpeg', 'stems', 'roformer']);
    expect(S.fullStems()).toBe(false);
    expect(S.modesHere()).toEqual(['2']);
    expect(S.stemsSupported('4')).toBe(false);
    expect(S.stemsPack('4')).toBe(null);
    expect(S.stemsPack('6')).toBe(null);
    expect(S.stemsPack('2')).toBe('vocals');
    expect(S.hqPack()).toBe(null);
    expect(S.hqVocalsModel()).toBe(false);
  });
  it('опись: stems и roformer не отдаются ни одному телефону', () => {
    const models = JSON.parse(readFileSync('build/models.json', 'utf8'));
    expect(models.packs.stems).toEqual([]);
    expect(models.packs.roformer).toEqual([]);
    const idx = JSON.parse(readFileSync('build/packs.json', 'utf8'));
    for (const id of ['stems', 'roformer']) expect(idx.list.find((p) => p.id === id).on).toEqual([]);
  });
});
