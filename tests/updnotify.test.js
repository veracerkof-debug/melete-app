import { describe, it, expect, vi } from 'vitest';
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => 'web', isNativePlatform: () => false }, registerPlugin: () => ({}) }));
vi.mock('../src/core/log.js', () => ({ log: () => {}, logErr: () => {} }));
const { noticeText, showUpdateNotice, UPD_NOTICE_ID } = await import('../src/core/updnotify.js');

describe('уведомление об обновлении', () => {
  it('номер вне диапазона напоминаний (7000…7059, 7099)', () => { expect(UPD_NOTICE_ID).toBeGreaterThan(7099); });
  it('тексты: скачана и доступна', () => {
    expect(noticeText('ready', 12).title).toMatch(/12/);
    expect(noticeText('avail', 13).title).toMatch(/13/);
    expect(noticeText('ready', 1).body).not.toBe(noticeText('avail', 1).body);
  });
  it('не Android — ничего не показывает и не падает', async () => { expect(await showUpdateNotice('ready', 5)).toBe(false); });
});
