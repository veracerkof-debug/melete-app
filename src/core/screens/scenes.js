// Сцены и сценарии: окно «Звук → Сцены и сценарии» (логика — src/core/scenes.js). Сцена запоминает настройки всех инструментов и уровни;
// сценарий — порядок сцен, листается «дальше / назад».
import { t } from '../../i18n/index.js';
import { esc, sheet, snav, toast, confirm, icons } from '../../ui/index.js';
import { promptName } from '../../ui/presets.js';
import * as SC from '../scenes.js';

const store = (app) => (app.device.scenes = SC.normalize(app.device.scenes));

export function scenesSheet(app, onDone = () => {}) {
  const S = () => store(app), commit = () => { app.saveDevice(); };
  const use = (sid) => { const r = SC.useScene(S(), app, sid); if (r) { commit(); app.render && app.render(); toast(t('scn.on', { name: r.scene.name })); onDone(); } return r; };
  const step = (dir) => { const r = SC.stepScenario(S(), app, dir); if (r) { commit(); app.render && app.render(); toast(t('scn.on', { name: r.scene.name })); onDone(); } };
  const api = sheet(() => {
    const s = S(), cur = s.scenarios.find((c) => c.id === s.scn);
    const runner = cur && cur.items.length ? '<div class="group"><div class="cell"><button class="ic" data-sc="prev" aria-label="' + esc(t('scn.prev')) + '"' + (s.pos <= 0 ? ' disabled' : '') + '>' + icons.back + '</button><span class="grow" style="text-align:center"><b>' + esc((s.scenes.find((x) => x.id === cur.items[s.pos]) || {}).name || '') + '</b><span class="psub">' + esc(cur.name + ' · ' + (s.pos + 1) + ' / ' + cur.items.length) + '</span></span><button class="ic" data-sc="next" aria-label="' + esc(t('scn.next')) + '"' + (s.pos >= cur.items.length - 1 ? ' disabled' : '') + ' style="transform:scaleX(-1)">' + icons.back + '</button></div></div>' : '';
    return snav(t('scn.title')) + runner +
      '<div class="hdr">' + t('scn.scenes') + '</div><div class="group">' +
      s.scenes.map((x) => '<div class="cell"><button class="grow link" data-sc="use" data-id="' + esc(x.id) + '" style="text-align:left;justify-content:flex-start">' + esc(x.name) + (s.cur === x.id ? ' ✓' : '') + '</button><button class="ic sm plain" data-sc="more" data-id="' + esc(x.id) + '" aria-label="' + esc(t('scn.more')) + '">⋯</button></div>').join('') +
      '<button class="cell act" data-sc="new">' + t('scn.new') + '</button></div><p class="ftr">' + t('scn.hint') + '</p>' +
      '<div class="hdr">' + t('scn.scenarios') + '</div><div class="group">' +
      s.scenarios.map((c) => '<button class="cell act" data-sc="open" data-id="' + esc(c.id) + '"><span class="grow">' + esc(c.name) + (s.scn === c.id ? ' ●' : '') + '</span><span class="val l2">' + c.items.length + '</span></button>').join('') +
      '<button class="cell act" data-sc="newscn">' + t('scn.newScn') + '</button></div><p class="ftr">' + t('scn.scnHint') + '</p>';
  }, (el) => {
    el.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-sc]'); if (!b) return;
      const a = b.dataset.sc, id = b.dataset.id, s = S();
      if (a === 'use') use(id);
      else if (a === 'prev') step(-1); else if (a === 'next') step(1);
      else if (a === 'new') promptName(t('scn.new'), t('scn.defName', { n: s.scenes.length + 1 }), (name) => { const sc = SC.saveScene(S(), app, name); if (!sc) { toast(t('scn.max')); return; } commit(); toast(t('scn.saved', { name: sc.name })); api.update(); });
      else if (a === 'more') moreSheet(id);
      else if (a === 'newscn') promptName(t('scn.newScn'), t('scn.defScn', { n: s.scenarios.length + 1 }), (name) => { const c = SC.addScenario(S(), name); if (!c) { toast(t('scn.max')); return; } commit(); api.update(); scenarioSheet(c.id); });
      else if (a === 'open') scenarioSheet(id);
    });
  });
  const moreSheet = (sid) => {
    const x = S().scenes.find((q) => q.id === sid); if (!x) return;
    const sh = sheet(() => snav(x.name) + '<div class="group"><button class="cell act" data-m="upd">' + esc(t('scn.update')) + '</button><button class="cell act" data-m="ren">' + esc(t('scn.rename')) + '</button><button class="cell act danger" data-m="del">' + esc(t('scn.del')) + '</button></div><p class="ftr">' + t('scn.updHint') + '</p>', (el) => {
      el.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-m]'); if (!b) return; const m = b.dataset.m;
        if (m === 'upd') { SC.updateScene(S(), app, sid); commit(); toast(t('scn.saved', { name: x.name })); sh.close(); api.update(); }
        else if (m === 'ren') { sh.close(); promptName(t('scn.rename'), x.name, (name) => { SC.renameScene(S(), sid, name); commit(); api.update(); }); }
        else if (m === 'del') { if (!(await confirm(t('scn.del'), t('scn.delAsk', { name: x.name }), t('scn.del')))) return; SC.removeScene(S(), sid); commit(); sh.close(); api.update(); }
      });
    });
  };
  const scenarioSheet = (cid) => {
    const body = () => {
      const s = S(), c = s.scenarios.find((q) => q.id === cid); if (!c) return '';
      return snav(c.name) + '<div class="group">' + c.items.map((sid, i) => '<div class="cell"><span class="grow">' + (i + 1) + '. ' + esc((s.scenes.find((x) => x.id === sid) || {}).name || '') + '</span><button class="ic sm plain" data-q="up" data-i="' + i + '" aria-label="↑"' + (i === 0 ? ' disabled' : '') + '>↑</button><button class="ic sm plain" data-q="dn" data-i="' + i + '" aria-label="↓"' + (i === c.items.length - 1 ? ' disabled' : '') + '>↓</button><button class="ic sm plain" data-q="rm" data-i="' + i + '" aria-label="' + esc(t('scn.del')) + '" style="color:var(--red)">×</button></div>').join('') +
        '</div><div class="hdr">' + t('scn.addScene') + '</div><div class="group">' + (s.scenes.map((x) => '<button class="cell act" data-q="add" data-id="' + esc(x.id) + '">+ ' + esc(x.name) + '</button>').join('') || '<p class="ftr">' + t('scn.noScenes') + '</p>') + '</div>' +
        '<div class="group"><button class="cell act" data-q="run"' + (c.items.length ? '' : ' disabled') + '>' + t('scn.run') + '</button><button class="cell act danger" data-q="delscn">' + t('scn.delScn') + '</button></div>';
    };
    const sh = sheet(body, (el) => {
      el.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-q]'); if (!b) return; const q = b.dataset.q, i = +b.dataset.i;
        if (q === 'add') { SC.scenarioAdd(S(), cid, b.dataset.id); commit(); sh.update(); }
        else if (q === 'rm') { SC.scenarioDrop(S(), cid, i); commit(); sh.update(); }
        else if (q === 'up' || q === 'dn') { SC.scenarioMove(S(), cid, i, q === 'up' ? -1 : 1); commit(); sh.update(); }
        else if (q === 'run') { const r = SC.startScenario(S(), app, cid); if (r) { commit(); app.render && app.render(); toast(t('scn.on', { name: r.scene.name })); onDone(); } sh.close(); api.update(); }
        else if (q === 'delscn') { if (!(await confirm(t('scn.delScn'), t('scn.delScnAsk'), t('scn.del')))) return; SC.removeScenario(S(), cid); commit(); sh.close(); api.update(); }
      });
    });
  };
  return api;
}
