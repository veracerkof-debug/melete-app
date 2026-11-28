// «Источник песен»: подключить папку другой программы (Holyrics и др.) — только чтение, обновление при изменениях (src/core/songsource.js).
import { t, tn } from '../../i18n/index.js';
import { esc, sheet, snav, toast, confirm } from '../../ui/index.js';
import { sourceDriver, folderAvailable } from '../folder.js';
import { scanSource, staleSongs, takeSource, keepMine, loadSources, saveSources, SOURCES_MAX } from '../songsource.js';
import { emptySong } from '../library.js';
import { log, logErr } from '../log.js';

let running = false;
// Прочитать один источник; → итог или null (уже идёт / папки нет)
export async function runSource(app, src, { quiet = false } = {}) {
  if (running) return null;
  const drv = sourceDriver(src.id); if (!drv) return null;
  running = true;
  try {
    const st = await drv.status().catch(() => ({ ok: false }));
    if (!st.ok) { if (!quiet) toast(t('src.gone')); return null; }
    if (!quiet) toast(t('src.reading'));
    const r = await scanSource({ sourceId: src.id, drv, store: app.store, base: emptySong(app.store.state.settings), onProgress: (n, total) => { if (!quiet && total > 200 && n % 100 === 0) toast(t('src.progress', { n, total })); } });
    const list = loadSources(); const me = list.find((x) => x.id === src.id); if (me) { me.at = Date.now(); me.n = r.scanned; saveSources(list); }
    if (r.errors.some((e) => /\.muf[l]?$/i.test(e.name)) && !r.added && !r.updated) toast(t('imp.encrypted'));
    log('import', 'источник ' + src.id + ': файлов ' + r.scanned + ', изменено ' + r.changed + ', новых ' + r.added + ', обновлено ' + r.updated + ', ждут решения ' + r.stale + ', ошибок ' + r.errors.length, r.errors.length ? 'w' : 'i');
    r.errors.slice(0, 20).forEach((e) => log('import', 'источник: не прочитан файл ' + e.name + ' — ' + e.error, 'w'));
    return r;
  } catch (e) { logErr('import', e); if (!quiet) toast(t('src.fail')); return null; }
  finally { running = false; }
}

// Тихое чтение при запуске: без окон, неизменные файлы не читаются; не на сцене — через 45 секунд после старта
export function initSongSources(app) {
  if (!folderAvailable()) return;
  setTimeout(async () => { for (const s of loadSources()) { await runSource(app, s, { quiet: true }); } }, 45000);
}

export function sourceSheet(app, onDone = () => {}) {
  const api = sheet(() => {
    const list = loadSources(), stale = staleSongs(app.store.songs());
    return snav(t('src.title')) +
      (list.length ? '<div class="group">' + list.map((s) => '<div class="cell"><span class="grow"><b>' + esc(s.name || s.id) + '</b><span class="psub">' + esc(s.at ? t('src.last', { n: s.n || 0, when: new Date(s.at).toLocaleString() }) : t('src.never')) + '</span></span>' +
        '<button class="link b" data-src-act="scan" data-id="' + s.id + '">' + t('src.scan') + '</button><button class="link" data-src-act="forget" data-id="' + s.id + '">' + t('src.forget') + '</button></div>').join('') + '</div>' : '<p class="ftr">' + t('src.none') + '</p>') +
      (list.length < SOURCES_MAX ? '<div class="group"><button class="cell act" data-src-act="add">' + t('src.add') + '</button></div>' : '') +
      (stale.length ? '<div class="hdr">' + t('src.stale') + '</div><div class="group">' + stale.map((s) => '<div class="cell"><span class="grow">' + esc(s.title) + '</span><button class="link b" data-src-act="take" data-id="' + s.id + '">' + t('src.take') + '</button><button class="link" data-src-act="keep" data-id="' + s.id + '">' + t('src.keep') + '</button></div>').join('') + '</div><p class="ftr">' + t('src.staleHint') + '</p>' : '') +
      '<p class="ftr">' + t('src.hint') + '</p>';
  }, (el) => {
    el.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-src-act]'); if (!b) return;
      const a = b.dataset.srcAct, id = b.dataset.id, list = loadSources();
      if (a === 'add') {
        const slot = 'p' + Date.now().toString(36), drv = sourceDriver(slot); if (!drv) return;
        try { const r = await drv.pick(); if (!r || !r.ok) return; list.push({ id: slot, name: r.name || '' }); saveSources(list); api.update(); await runSource(app, list[list.length - 1]); onDone(); api.update(); }
        catch (err) { if (!/cancel/i.test(String(err && (err.message || err)))) { logErr('import', err); toast(t('src.fail')); } }
      } else if (a === 'scan') { const s = list.find((x) => x.id === id); if (s) { await runSource(app, s); onDone(); api.update(); } }
      else if (a === 'forget') { const ok = await confirm(t('src.forget'), t('src.forgetAsk'), t('src.forget')); if (!ok) return; try { const d = sourceDriver(id); if (d) await d.forget(); } catch { /* */ } saveSources(list.filter((x) => x.id !== id)); api.update(); }
      else if (a === 'take' || a === 'keep') {
        const s = app.store.songs().find((x) => x.id === id); if (!s) return;
        if (a === 'take') { try { if (app.snapshots && app.snapshots.take) await app.snapshots.take('source'); } catch { /* копия — страховка */ } takeSource(app.store, s); toast(t('src.taken')); } else keepMine(app.store, s);
        onDone(); api.update();
      }
    });
  });
  return api;
}
