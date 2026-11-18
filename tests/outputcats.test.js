// Вывод на другое устройство: чистая логика интерфейса (порядок целей, подписи, состояние канала, ошибки)
import { describe, it, expect } from 'vitest';
import { CATS, catOfModule, candidates, targetRows, summarize, shortLabel, swapMode, linkStatus, errorKey } from '../src/core/outputcats.js';
import { createOutputStub } from '../src/core/outputstub.js';

const L = { local: 'Этот телефон', remote: 'Другое', both: 'Оба', mixed: 'Разное' };

describe('категории инструментов', () => {
  it('звук, метроном, плеер; остальные — не выводятся', () => {
    expect(catOfModule('piano')).toBe('sound');
    expect(catOfModule('metro')).toBe('click');
    expect(catOfModule('audio')).toBe('media');
    expect(catOfModule('show')).toBe('media');
    ['bible', 'vocal', 'beat', 'tuner', 'ear', 'book', 'spectrum', 'convert'].forEach((id) => expect(catOfModule(id)).toBeNull());
  });
});

describe('цели', () => {
  it('порядок: телефон, устройство, оба; без устройства два последних недоступны', () => {
    expect(targetRows(null).map((r) => [r.mode, r.disabled])).toEqual([['local', false], ['remote', true], ['both', true]]);
    const r = targetRows({ key: 'pc:1', name: 'Студия', kind: 'pc' });
    expect(r.map((x) => x.mode)).toEqual(['local', 'remote', 'both']);
    expect(r.every((x) => !x.disabled)).toBe(true);
    expect(r[1].name).toBe('Студия');
  });
  it('кандидаты: компьютер первым, потом «Мои устройства»', () => {
    const c = candidates({ addr: 'a', name: 'ПК' }, [{ addr: 'b', name: 'Планшет' }, { name: 'без адреса' }]);
    expect(c).toEqual([{ key: 'pc:a', name: 'ПК', kind: 'pc' }, { key: 'dev:b', name: 'Планшет', kind: 'dev' }]);
    expect(candidates(null, [])).toEqual([]);
  });
});

describe('подписи и жест', () => {
  const sum = (m) => summarize((c) => (typeof m === 'string' ? m : m[c] || 'local'));
  it('общий итог и «Разное»', () => {
    expect(sum('local')).toMatchObject({ mixed: false, mode: 'local' });
    expect(sum({ sound: 'remote' }).mixed).toBe(true);
  });
  it('короткая подпись', () => {
    expect(shortLabel(sum('local'), null, L)).toBe('Этот телефон');
    expect(shortLabel(sum('both'), { name: 'ПК' }, L)).toBe('Оба');
    expect(shortLabel(sum('remote'), { name: 'ПК' }, L)).toBe('ПК');
    expect(shortLabel(sum('remote'), null, L)).toBe('Другое');
    expect(shortLabel(sum({ click: 'both' }), null, L)).toBe('Разное');
  });
  it('удержание: телефон → устройство, всё остальное → телефон', () => {
    expect(swapMode(sum('local'))).toBe('remote');
    expect(swapMode(sum('remote'))).toBe('local');
    expect(swapMode(sum('both'))).toBe('local');
    expect(swapMode(sum({ media: 'remote' }))).toBe('local');
  });
});

describe('состояние канала и ошибки', () => {
  it('вид метки', () => {
    expect(linkStatus({ link: 'off' }).kind).toBe('off');
    expect(linkStatus(undefined).kind).toBe('off');
    expect(linkStatus({ link: 'connecting' }).kind).toBe('connecting');
    expect(linkStatus({ link: 'on' })).toEqual({ kind: 'ok', ms: null });
    expect(linkStatus({ link: 'on', rtt: 40.4, jitter: 3 })).toEqual({ kind: 'ok', ms: 40 });
    expect(linkStatus({ link: 'on', rtt: 100, jitter: 30 }).kind).toBe('slow');
    expect(linkStatus({ link: 'on', rtt: 500, jitter: 0 }).kind).toBe('bad');
  });
  it('ошибки понятными ключами', () => {
    const t = { key: 'pc:a' };
    expect(errorKey({ target: null, state: {}, usesRemote: true })).toBe('noDevice');
    expect(errorKey({ target: null, state: {}, usesRemote: false })).toBeNull();
    expect(errorKey({ target: t, state: { link: 'off' }, usesRemote: true })).toBe('noLink');
    expect(errorKey({ target: t, state: { link: 'off' }, usesRemote: false })).toBeNull();
    expect(errorKey({ target: t, state: { link: 'connecting' }, usesRemote: true })).toBe('connecting');
    expect(errorKey({ target: t, state: { link: 'on', rtt: 600 }, usesRemote: true })).toBe('bad');
    expect(errorKey({ target: t, state: { link: 'on', rtt: 20 }, usesRemote: true, ping: { ok: false } })).toBe('noAnswer');
    expect(errorKey({ target: t, state: { link: 'on', rtt: 20 }, usesRemote: true, ping: { ok: true } })).toBeNull();
  });
});

describe('временный адаптер (контракт)', () => {
  const mk = () => { const app = { device: {}, saveDevice() {} }; return createOutputStub(app); };
  it('по умолчанию всё на этом устройстве; без сопряжённого остаётся local', () => {
    const o = mk();
    CATS.forEach((c) => expect(o.get(c)).toBe('local'));
    o.set('sound', 'both');
    expect(o.get('sound')).toBe('local');
    expect(o.target).toBeNull();
    expect(o.state.link).toBe('off');
  });
  it('режимы устройства и подписка', () => {
    const o = mk(); let n = 0;
    const off = o.subscribe(() => n++);
    expect(o.mode('pc:a')).toEqual({ control: false, sync: false });
    o.setMode('pc:a', { control: true });
    expect(o.mode('pc:a')).toEqual({ control: true, sync: false });
    expect(n).toBe(1);
    off(); o.setMode('pc:a', { sync: true });
    expect(n).toBe(1);
  });
});
