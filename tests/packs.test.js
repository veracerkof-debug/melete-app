// Пакеты моделей (build/packs.mjs, build/packs.json, src/core/packs.js): опись сходится с models.json,
// заголовки tar читаются как ustar, без пакетов в сборке всё встроено
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { tarHeader, tarSize } from '../build/packs.mjs';
import { hasPack, packUrl, packList, isPacked } from '../src/core/packs.js';

const models = JSON.parse(readFileSync('build/models.json', 'utf8'));
const idx = JSON.parse(readFileSync('build/packs.json', 'utf8'));

describe('пакеты: опись', () => {
  it('каждая модель с полем pack — в описи, sha и размер — как в models.json', () => {
    for (const m of models.models.filter((x) => x.pack && !x.extract)) {
      const rel = m.file.replace(/^(public|src-tauri)\//, '');
      const f = idx.files[m.pack].find(([p]) => p === rel);
      expect(f, rel).toBeTruthy();
      expect(f[1]).toBe(m.sha256);
      expect(f[2]).toBe(m.bytes);
    }
  });
  it('у каждого пакета: системы из models.json, размер tar по описи, папки покрывают файлы', () => {
    for (const p of idx.list) {
      expect(p.on).toEqual(models.packs[p.id]);
      expect(p.bytes).toBe(tarSize(idx.files[p.id]));
      expect(p.v).toMatch(/^[0-9a-f]{12}$/);
      for (const [f] of idx.files[p.id]) expect(p.dirs.some((d) => f.startsWith(d)), f).toBe(true);
    }
  });
  it('рояль — в пакете целиком (вместе с pack.json, по нему grand.js узнаёт набор)', () => {
    const fs = idx.files.piano.map(([p]) => p);
    expect(fs).toContain('models/piano/pack.json');
    expect(fs.filter((p) => p.endsWith('.ogg')).length).toBeGreaterThan(500);
  });
});

describe('пакеты: tar', () => {
  const field = (h, off, len) => h.subarray(off, off + len).toString('utf8').replace(/\0.*$/s, '');
  it('заголовок ustar: имя, размер, контрольная сумма', () => {
    const h = tarHeader('models/piano/A0v1.ogg', 248175);
    expect(h.length).toBe(512);
    expect(field(h, 0, 100)).toBe('models/piano/A0v1.ogg');
    expect(parseInt(field(h, 124, 12), 8)).toBe(248175);
    expect(field(h, 257, 6)).toBe('ustar');
    const sum = parseInt(field(h, 148, 8), 8);
    const c = Buffer.from(h); c.fill(0x20, 148, 156);
    expect(c.reduce((a, b) => a + b, 0)).toBe(sum);
  });
  it('длинный путь — через приставку', () => {
    const name = 'models/' + 'x'.repeat(90) + '/' + 'y'.repeat(40) + '.onnx';
    const h = tarHeader(name, 1);
    expect(field(h, 345, 155) + '/' + field(h, 0, 100)).toBe(name);
  });
  it('размер: заголовок + данные кратно 512 + два пустых блока', () => {
    expect(tarSize([['a', '', 1], ['b', '', 512]])).toBe(512 + 512 + 512 + 512 + 1024);
  });
});

describe('пакеты: сборка без пакетов (у себя, тесты)', () => {
  it('всё встроено: пакет «есть», адрес — из сборки', () => {
    expect(packList()).toEqual([]);
    expect(isPacked('piano')).toBe(false);
    expect(hasPack('piano')).toBe(true);
    expect(packUrl('models/piano/pack.json')).toMatch(/\/models\/piano\/pack\.json$/);
  });
});
