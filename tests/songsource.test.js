import { describe, it, expect } from 'vitest';
import { scanSource, walk, staleSongs, takeSource, keepMine } from '../src/core/songsource.js';

const enc = (s) => new TextEncoder().encode(s);
// Папка в памяти: { 'dir/a.cho': { text, mtime } }
function drive(files) {
  return {
    list: async (dir) => {
      const pre = dir ? dir + '/' : '', seen = new Map();
      for (const [p, f] of Object.entries(files)) { if (!p.startsWith(pre)) continue; const rest = p.slice(pre.length), i = rest.indexOf('/');
        if (i < 0) seen.set(rest, { name: rest, dir: false, size: enc(f.text).length, mtime: f.mtime }); else seen.set(rest.slice(0, i), { name: rest.slice(0, i), dir: true, size: 0, mtime: 0 }); }
      return [...seen.values()];
    },
    read: async (p, off, len) => { const u = enc(files[p].text); return { data: u.subarray(off, off + len), size: u.length }; },
  };
}
const mkStore = (songs = []) => ({ now: () => 5, state: { songs }, saves: 0, save() { this.saves++; } });
const cho = (t, a, body) => '{title: ' + t + '}\n{artist: ' + a + '}\n' + body;

describe('источник песен: чтение папки', () => {
  it('новые песни добавляются, подпапки читаются, мусор пропускается', async () => {
    const files = { 'a.cho': { text: cho('Один', 'Иванов', 'слова один'), mtime: 1 }, 'sub/b.cho': { text: cho('Два', 'Петров', 'слова два'), mtime: 1 }, 'pic.png': { text: 'x', mtime: 1 } };
    const store = mkStore(), r = await scanSource({ sourceId: 'g', drv: drive(files), store });
    expect(r.added).toBe(2); expect(store.state.songs.map((s) => s.title).sort()).toEqual(['Два', 'Один']); expect(store.saves).toBe(1);
  });
  it('повторное чтение: без дублей и без чтения неизменных файлов', async () => {
    const files = { 'a.cho': { text: cho('Один', 'Иванов', 'слова'), mtime: 1 } }, store = mkStore(), drv = drive(files);
    await scanSource({ sourceId: 'g', drv, store });
    let reads = 0; const spy = { ...drv, read: (...a) => { reads++; return drv.read(...a); } };
    const r = await scanSource({ sourceId: 'g', drv: spy, store });
    expect(store.state.songs.length).toBe(1); expect(r.changed).toBe(0); expect(reads).toBe(0);
  });
  it('правка текста и названия в источнике обновляет песню (если человек не правил)', async () => {
    const files = { 'a.cho': { text: cho('Один', 'Иванов', 'старый текст'), mtime: 1 } }, store = mkStore(), drv = drive(files);
    await scanSource({ sourceId: 'g', drv, store });
    files['a.cho'] = { text: cho('Один (новая)', 'Иванов', 'новый текст'), mtime: 2 };
    const r = await scanSource({ sourceId: 'g', drv, store });
    expect(store.state.songs.length).toBe(1); expect(store.state.songs[0].title).toBe('Один (новая)'); expect(store.state.songs[0].notes).toContain('новый текст'); expect(r.updated).toBe(1);
  });
  it('аккорды человека не затираются: новый текст ждёт решения', async () => {
    const files = { 'a.cho': { text: cho('Один', 'Иванов', 'слова'), mtime: 1 } }, store = mkStore(), drv = drive(files);
    await scanSource({ sourceId: 'g', drv, store });
    const s = store.state.songs[0]; s.notes = '[Am]' + s.notes; // человек или нейросеть дописали аккорды
    files['a.cho'] = { text: cho('Один', 'Иванов', 'слова изменены'), mtime: 2 };
    const r = await scanSource({ sourceId: 'g', drv, store });
    expect(r.stale).toBe(1); expect(s.notes.startsWith('[Am]')).toBe(true); expect(staleSongs(store.state.songs).length).toBe(1);
    expect(keepMine(store, s)).toBe(true); expect(staleSongs(store.state.songs).length).toBe(0); expect(s.notes.startsWith('[Am]')).toBe(true);
    files['a.cho'] = { text: cho('Один', 'Иванов', 'ещё раз'), mtime: 3 };
    await scanSource({ sourceId: 'g', drv, store }); expect(staleSongs(store.state.songs).length).toBe(1);
    expect(takeSource(store, s)).toBe(true); expect(s.notes).toContain('ещё раз');
  });
  it('уже занесённая вручную песня усыновляется, а не дублируется и не затирается', async () => {
    const store = mkStore([{ id: 'm1', title: 'Один', artist: 'Иванов', notes: '[C]мой текст' }]);
    const files = { 'a.cho': { text: cho('один', 'иванов', 'чужой текст'), mtime: 1 } };
    const r = await scanSource({ sourceId: 'g', drv: drive(files), store });
    expect(store.state.songs.length).toBe(1); expect(r.adopted).toBe(1); expect(store.state.songs[0].notes).toBe('[C]мой текст');
  });
  it('тёзки с разными исполнителями — две песни; плохой файл не мешает остальным', async () => {
    const files = { 'a.cho': { text: cho('Аллилуйя', 'А', 'x'), mtime: 1 }, 'b.cho': { text: cho('Аллилуйя', 'Б', 'y'), mtime: 1 }, 'bad.json': { text: '{"это":"не песня"', mtime: 1 } };
    const store = mkStore(), r = await scanSource({ sourceId: 'g', drv: drive(files), store });
    expect(store.state.songs.length).toBe(2); expect(r.errors.map((e) => e.name)).toContain('bad.json');
  });
  it('удалённый из папки файл песню не удаляет; остановка работает', async () => {
    const files = { 'a.cho': { text: cho('Один', 'И', 'x'), mtime: 1 } }, store = mkStore(), drv = drive(files);
    await scanSource({ sourceId: 'g', drv, store }); delete files['a.cho'];
    await scanSource({ sourceId: 'g', drv, store }); expect(store.state.songs.length).toBe(1);
    expect((await walk(drv, '', 0, [], () => true)).length).toBe(0);
  });
  it('тысяча файлов', async () => {
    const files = {}; for (let i = 0; i < 1000; i++) files['f' + i + '.cho'] = { text: cho('П' + i, 'А', 'т' + i), mtime: 1 };
    const store = mkStore(), t0 = Date.now(), r = await scanSource({ sourceId: 'g', drv: drive(files), store });
    expect(r.added).toBe(1000); expect(Date.now() - t0).toBeLessThan(15000); expect(store.saves).toBe(1);
  });
});
