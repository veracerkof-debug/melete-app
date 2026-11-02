// Разборщики чужих файлов (.mid, .flp, .als, .rpp, ProPresenter, ChordPro, OpenLyrics, SoundFont) на мусоре: не виснут
// (испорченный .mid с огромной длиной уводил чтение назад — вечный цикл, 2026-11-02) и не падают переполнением стека
import { it, expect } from 'vitest';
import { readMidi } from '../src/music/midi.js';
import { readMidiSong, readAls, readRpp, readFlp } from '../src/music/daw.js';
import { fromPro7, fromChordPro, fromOpenLyrics, fromPro6 } from '../src/core/songimport.js';
import { parseSf2 } from '../src/audio/sf2.js';
let seed = 7; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const bytes = (n) => Uint8Array.from({ length: n }, () => Math.floor(rnd() * 256));
const midiHdr = (body) => { const h = [0x4d,0x54,0x68,0x64,0,0,0,6,0,1,0,1,1,0xe0, 0x4d,0x54,0x72,0x6b, 0x7f,0xff,0xff,0xff]; return Uint8Array.from([...h, ...body]); };
const flpHdr = (body) => Uint8Array.from([0x46,0x4c,0x68,0x64,6,0,0,0,0,0,1,0,0x60,0, 0x46,0x4c,0x64,0x74,0xff,0xff,0xff,0x7f, ...body]);
const run = (name, fn, input) => {
  const t = performance.now(); let err = null;
  try { const r = fn(input); if (r && r.then) return r.catch(() => {}); } catch (e) { err = e; }
  const dt = performance.now() - t;
  if (dt > 2000) throw new Error(name + ' медленно ' + Math.round(dt) + ' мс');
  if (err && !(err instanceof Error)) throw new Error(name + ' бросил не Error');
  if (err && /Maximum call stack|Invalid array length|out of memory/i.test(err.message)) throw new Error(name + ': ' + err.message);
};
it('разборщики не виснут и не падают странно на мусоре', async () => {
  for (let k = 0; k < 40; k++) {
    const n = Math.floor(rnd() * 4000);
    run('readMidi', readMidi, bytes(n)); run('readMidi hdr', readMidi, midiHdr([...bytes(n)]));
    run('readMidiSong', readMidiSong, midiHdr([...bytes(n)]));
    run('readFlp', readFlp, flpHdr([...bytes(n)])); run('readFlp raw', readFlp, bytes(n));
    run('fromPro7', (u) => fromPro7(u, 'x'), bytes(n));
    run('parseSf2', (u) => parseSf2(u.buffer), Uint8Array.from([0x52,0x49,0x46,0x46,0xff,0xff,0xff,0x7f,0x73,0x66,0x62,0x6b, ...bytes(n)]));
    const txt = String.fromCharCode(...bytes(Math.min(n, 2000)));
    run('readAls', readAls, '<Ableton>' + txt); run('readRpp', readRpp, '<REAPER_PROJECT ' + txt);
    run('chordpro', (s) => fromChordPro(s, 'x'), txt); run('openlyrics', (s) => fromOpenLyrics(s, 'x'), '<song>' + txt); run('pro6', (s) => fromPro6(s, 'x'), '<RVPresentationDocument>' + txt);
  }
  // огромные числа в заголовках
  run('rpp deep', readRpp, '<REAPER_PROJECT\n' + '<TRACK\n'.repeat(20000));
  run('als deep', readAls, '<Ableton>' + '<a>'.repeat(20000));
  expect(true).toBe(true);
}, 120000);
