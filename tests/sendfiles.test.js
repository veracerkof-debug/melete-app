import { describe, it, expect, vi } from 'vitest';

// Android: несколько записей — кусками в папку отправки, следующий файл не стирает прежние, потом один выбор приложения
const calls = [];
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => 'android' },
  registerPlugin: () => ({
    put: async (o) => { calls.push(['put', o.name, o.append, o.keep, atob(o.data).length]); },
    sendMany: async (o) => { calls.push(['sendMany', o.names, o.mime]); },
    send: async () => { calls.push(['send']); },
  }),
}));

describe('медиатека: «Отправить» несколько записей', () => {
  it('кусками, без стирания соседей, одним «Поделиться»; одинаковые имена различаются', async () => {
    const { sendFiles } = await import('../src/core/screens/share.js');
    const big = new Blob([new Uint8Array((3 << 20) + 10)], { type: 'audio/wav' });
    const steps = [];
    const r = await sendFiles([
      { blob: big, name: 'a.wav', type: 'audio/wav' },
      { blob: new Blob([new Uint8Array(5)]), name: 'b.mp3', type: 'audio/mpeg' },
      { blob: new Blob([new Uint8Array(7)]), name: 'b.mp3', type: 'audio/mpeg' },
    ], 'T', (i, n) => steps.push(i + '/' + n));
    expect(r).toBe('shared');
    expect(steps).toEqual(['0/3', '1/3', '2/3']);
    expect(calls).toEqual([
      ['put', 'a.wav', false, false, 3 << 20],
      ['put', 'a.wav', true, false, 10],
      ['put', 'b.mp3', false, true, 5],
      ['put', 'b (3).mp3', false, true, 7],
      ['sendMany', ['a.wav', 'b.mp3', 'b (3).mp3'], 'audio/*'],
    ]);
  });
});
