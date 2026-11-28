import { describe, it, expect } from 'vitest';
import { snapshot, applySnapshot, normalize, saveScene, useScene, updateScene, removeScene, addScenario, scenarioAdd, scenarioMove, startScenario, stepScenario, SCENES_MAX } from '../src/core/scenes.js';

const mkApp = () => {
  const calls = [];
  const device = { piano: { oct: 4, sound: 'piano' }, drone: { pc: 9, sound: 'soft' }, tuner: { a4: 440 }, watch: { x: 1 }, profiles: { list: [] }, ws: { layout: 'F' }, mix: { piano: 0.9, metro: 1, drone: 1, audio: 1, master: 1, mute: {}, fx: {}, mode: 'smooth' } };
  const metro = { cfg: { bpm: 90, num: 4, den: 4, sound: 'click', accents: [3, 1, 1, 1] }, setBpm(v) { calls.push(['bpm', v]); this.cfg.bpm = v; }, save() { calls.push(['save']); } };
  const mixer = { setMaster: (v) => { device.mix.master = v; calls.push(['master', v]); }, set: (b, v) => { device.mix[b === 'media' ? 'audio' : b] = v; calls.push(['set', b, v]); }, toggleMute: () => {}, setFx: () => {} };
  const drone = { on: false, swap() { calls.push(['swap']); } };
  return { device, audio: { metro, mixer, drone }, calls };
};

describe('сцены', () => {
  it('снимок: разделы настроек и метроном, без служебного', () => {
    const app = mkApp(), s = snapshot(app);
    expect(Object.keys(s.device).sort()).toEqual(['drone', 'piano', 'tuner']); expect(s.metro.bpm).toBe(90); expect(s.mix.levels.piano).toBe(0.9);
  });
  it('сохранить, изменить, вернуть: настройки на месте, ссылки на разделы живы', () => {
    const app = mkApp(), S = normalize(null), ref = app.device.piano;
    const a = saveScene(S, app, 'Репетиция');
    app.device.piano.oct = 2; app.device.drone.pc = 3; app.audio.metro.cfg.bpm = 140; app.device.mix.piano = 0.2;
    const r = useScene(S, app, a.id);
    expect(app.device.piano.oct).toBe(4); expect(app.device.piano).toBe(ref); expect(app.device.drone.pc).toBe(9);
    expect(app.audio.metro.cfg.bpm).toBe(90); expect(app.device.mix.piano).toBe(0.9); expect(r.n).toBeGreaterThan(0);
  });
  it('пэд переводится плавно только если звучит', () => {
    const app = mkApp(), S = normalize(null), a = saveScene(S, app, 'A');
    app.device.drone.pc = 5; expect(useScene(S, app, a.id).drone).toBe(false);
    app.audio.drone.on = true; app.device.drone.pc = 5; expect(useScene(S, app, a.id).drone).toBe(true); expect(app.calls.some((c) => c[0] === 'swap')).toBe(true);
  });
  it('то же состояние — ничего не меняется', () => {
    const app = mkApp(), S = normalize(null), a = saveScene(S, app, 'A'); app.calls.length = 0;
    expect(useScene(S, app, a.id).n).toBe(0); expect(app.calls).toEqual([]);
  });
  it('обновить и удалить сцену; предел', () => {
    const app = mkApp(), S = normalize(null), a = saveScene(S, app, 'A'); app.device.piano.oct = 6; updateScene(S, app, a.id);
    expect(S.scenes[0].snap.device.piano.oct).toBe(6); removeScene(S, a.id); expect(S.scenes.length).toBe(0);
    for (let i = 0; i < SCENES_MAX; i++) saveScene(S, app, 'x'); expect(saveScene(S, app, 'y')).toBe(null);
  });
  it('сценарий: порядок, шаги вперёд и назад, края, удаление сцены вычищает', () => {
    const app = mkApp(), S = normalize(null), A = saveScene(S, app, 'A'); app.device.piano.oct = 5; const B = saveScene(S, app, 'B'); app.device.piano.oct = 6; const C = saveScene(S, app, 'C');
    const sc = addScenario(S, 'Выступление'); [A, B, C].forEach((x) => scenarioAdd(S, sc.id, x.id)); scenarioMove(S, sc.id, 0, 1); expect(sc.items).toEqual([B.id, A.id, C.id]);
    startScenario(S, app, sc.id); expect(app.device.piano.oct).toBe(5);
    stepScenario(S, app, 1); expect(app.device.piano.oct).toBe(4); stepScenario(S, app, 1); expect(app.device.piano.oct).toBe(6);
    expect(stepScenario(S, app, 1)).toBe(null); stepScenario(S, app, -1); expect(app.device.piano.oct).toBe(4);
    removeScene(S, A.id); expect(sc.items).toEqual([B.id, C.id]);
  });
  it('битые данные не ломают загрузку', () => {
    const S = normalize({ scenes: [null, { id: 'a', snap: { v: 1 } }, { id: 'b' }], scenarios: [{ id: 'z', items: ['a', 'нет'] }], cur: 'нет', scn: 'z' });
    expect(S.scenes.length).toBe(1); expect(S.scenarios[0].items).toEqual(['a']); expect(S.cur).toBe(''); expect(normalize('мусор').scenes).toEqual([]);
  });
});
