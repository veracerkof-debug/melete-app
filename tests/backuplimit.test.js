import { describe, it, expect } from 'vitest';
import { pickFiles, FILES_LIMIT } from '../src/core/backup.js';

const f = (id, mb, created) => ({ id, size: mb * 1048576, created });

describe('потолок файлов в копии', () => {
  it('свежие — первыми; не влезающий пропускается, меньший после него — берётся', () => {
    const r = pickFiles([f('old', 5, 1), f('big', 20, 3), f('new', 10, 4), f('mid', 4, 2)], 24 * 1048576);
    expect(r.take.map((x) => x.id)).toEqual(['new', 'mid', 'old']);
    expect(r.skip.map((x) => x.id)).toEqual(['big']);
    expect(r.size).toBe(19 * 1048576);
  });
  it('телефон — 24 МБ, компьютер — больше', () => {
    expect(FILES_LIMIT.phone).toBe(24 * 1048576);
    expect(FILES_LIMIT.desktop).toBeGreaterThan(FILES_LIMIT.phone);
  });
});
