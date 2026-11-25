// Нейросеть → программа выступления (src/core/ai/showops.js, блок ```melete-show)
import { describe, it, expect } from 'vitest';
import { extract, apply, undo } from '../src/core/ai/proposals.js';
import { cleanShowOp, showContext } from '../src/core/ai/showops.js';
import { normalizeNumber, normalizePad } from '../src/music/show.js';

const cfg = { access: { songs: 'write', media: 'write' } };
const mkApp = () => {
  const show = { events: [{ id: 'e1', numbers: [normalizeNumber({ id: 'n1', title: 'Фон', kind: 'track', file: 'f1', level: 80 })] }], banks: [{ id: 'b', pads: [normalizePad({ id: 'p1', file: 'f2', name: 'Аплодисменты' })] }] };
  return { app: { device: { show }, saveDevice() { this.saved = (this.saved || 0) + 1; }, store: { state: { songs: [] }, save() {} } }, show };
};
describe('нейросеть и программа выступления', () => {
  it('очистка: чужие поля и пресеты отбрасываются, программа нормализуется', () => {
    const o = cleanShowOp({ op: 'number', ref: 'n1', set: { eq: 'warm', tempo: '0.9', evil: 1, level: 'x' }, prog: [{ t: 30, key: 2, ramp: 4 }, { t: 5 }] });
    expect(o.set).toEqual({ eq: 'warm', tempo: 0.9 }); expect(o.prog.length).toBe(1);
    expect(cleanShowOp({ op: 'number', ref: 'n1', set: { eq: 'нет' } })).toBeNull();
    expect(cleanShowOp({ op: 'zzz', ref: 'x', set: { level: 1 } })).toBeNull();
  });
  it('блок разбирается, применяется и откатывается', async () => {
    const { app, show } = mkApp();
    const ex = extract('Сделал.\n```melete-show\n[{"op":"number","ref":"n1","set":{"level":30,"eq":"vocal"},"prog":[{"t":60,"key":2,"tempo":1.1,"ramp":4}]},{"op":"pad","ref":"p1","set":{"speed":1.5,"mode":"loop"}}]\n```', cfg);
    expect(ex.proposals.length).toBe(1); expect(ex.proposals[0].kind).toBe('show'); expect(ex.proposals[0].status).toBe('pending');
    const r = await apply(app, ex.proposals[0]);
    expect(r.ok).toBe(true); expect(r.n).toBe(2);
    const n = show.events[0].numbers[0];
    expect(n.level).toBe(30); expect(n.eq).toBe('vocal'); expect(n.prog[0].key).toBe(2); expect(show.banks[0].pads[0].speed).toBe(1.5); expect(show.banks[0].pads[0].mode).toBe('loop');
    expect(undo(app, r.undo)).toBe(true);
    expect(n.level).toBe(80); expect(n.eq).toBe(''); expect(n.prog).toEqual([]); expect(show.banks[0].pads[0].speed).toBe(1);
  });
  it('нет доступа на запись — заблокировано; мусор — invalid; контекст содержит номера', () => {
    const ro = { access: { songs: 'write', media: 'read' } };
    expect(extract('```melete-show\n[{"op":"number","ref":"n1","set":{"level":1}}]\n```', ro).proposals[0].status).toBe('blocked');
    expect(extract('```melete-show\nне json\n```', cfg).proposals[0].status).toBe('invalid');
    expect(showContext(mkApp().show, [])).toContain('n1 | Фон');
  });
});
