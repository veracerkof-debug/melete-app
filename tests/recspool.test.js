import { describe, it, expect } from 'vitest';
import { memBackend, spoolTake, leftovers, headOk, durOfParts } from '../src/core/recspool.js';

const txt = async (b) => (b ? await b.text() : null);

describe('запись кусками на диск (recspool)', () => {
  it('куски склеиваются по порядку, после drop ничего не остаётся', async () => {
    const be = memBackend(), tk = spoolTake(be, 'r1', { name: 'Пианино', type: 'audio/webm' });
    ['a', 'b', 'c'].forEach((x) => tk.add(new Blob([x])));
    expect(await txt(await tk.blob('audio/webm'))).toBe('abc');
    await tk.drop();
    expect(await be.metas()).toEqual([]);
    expect(await be.parts('r1')).toEqual([]);
  });

  it('диск не принял кусок — он из памяти встаёт на своё место', async () => {
    const be = memBackend(), put = be.put;
    be.put = (id, seq, b) => (seq === 1 ? Promise.reject(new Error('quota')) : put(id, seq, b));
    const tk = spoolTake(be, 'r2', { type: 'audio/webm' });
    ['1', '2', '3'].forEach((x) => tk.add(new Blob([x])));
    expect(await txt(await tk.blob('audio/webm'))).toBe('123');
  });

  it('нет базы совсем — запись живёт в памяти, как раньше', async () => {
    const no = () => Promise.reject(new Error('no idb'));
    const be = { putMeta: no, put: no, parts: no, drop: no, metas: no };
    const tk = spoolTake(be, 'r3', {});
    ['x', 'y'].forEach((s) => tk.add(new Blob([s])));
    expect(await txt(await tk.blob('audio/webm'))).toBe('xy');
  });

  it('оборванная запись находится при следующем запуске, идущая сейчас — нет', async () => {
    const be = memBackend();
    const a = spoolTake(be, 'old', { name: 'Терменвокс', type: 'audio/webm;codecs=opus', t0: 1 });
    a.add(new Blob(['he'])); a.add(new Blob(['llo']));
    await a.blob('audio/webm'); // дождаться записи на диск; «Стоп» не было — сбой
    const b = spoolTake(be, 'now', { type: 'audio/webm' });
    b.add(new Blob(['z'])); await b.blob('audio/webm');
    const l = await leftovers(be, (id) => id === 'now');
    expect(l.map((x) => x.id)).toEqual(['old']);
    expect(l[0].meta.name).toBe('Терменвокс');
    const { blob, n } = await l[0].load();
    expect(n).toBe(2);
    expect(blob.type).toBe('audio/webm');
    expect(await txt(blob)).toBe('hello');
  });

  it('длительность оборванной записи — по числу кусков', () => {
    expect(durOfParts(0, 1000)).toBe(0);
    expect(durOfParts(1, 1000)).toBe(0.5);
    expect(durOfParts(120, 1000)).toBe(119.5);
    expect(durOfParts(5, 0)).toBe(0);
  });

  it('проверка начала файла: WebM, MP4, Ogg', () => {
    expect(headOk(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0]), 'audio/webm')).toBe(true);
    expect(headOk(new Uint8Array([0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70]), 'audio/mp4')).toBe(true);
    expect(headOk(new Uint8Array([0x4f, 0x67, 0x67, 0x53, 0, 0, 0, 0]), 'audio/ogg')).toBe(true);
    expect(headOk(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]), 'audio/webm')).toBe(false);
    expect(headOk(new Uint8Array([1, 2]), 'audio/webm')).toBe(false);
  });
});
