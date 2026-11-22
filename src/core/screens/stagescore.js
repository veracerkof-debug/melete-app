// Табы и ноты на сцене (слово автора 22.11.2026): панель в экране сцены, без ухода в «Ноты». Свой лёгкий просмотр alphaTab
// (без плеера — звук на сцене свой): файлы Guitar Pro / MusicXML рисуются как есть, текстовые табы (ASCII) — через alphaTex,
// просто текст — моноширинно, PDF — только в «Нотах». Библиотека грузится при первом открытии панели. Поверхность живёт между
// перерисовками сцены (её переносят на новое место), масштаб — щипком.
import BRAVURA from '@coderline/alphatab/font/Bravura.woff2?url';
import { sniffScore } from '../../modules/notes/sniff.js';
import { asciiToTex } from '../../music/asciitab.js';

export function createScoreView({ scale = 0.85, onFail = () => {} } = {}) {
  const el = document.createElement('div');
  el.className = 'sgsurf';
  let lib = null, api = null, sc = scale, id = '';
  const ensure = async () => {
    if (api) return api;
    lib = await import('@coderline/alphatab');
    api = new lib.AlphaTabApi(el, {
      core: { smuflFontSources: new Map([[lib.FontFileFormat.Woff2, BRAVURA]]) },
      player: { enablePlayer: false },
      display: { scale: sc, layoutMode: lib.LayoutMode.Page, staveProfile: lib.StaveProfile.Default },
    });
    api.error.on((e) => onFail(e));
    return api;
  };
  return {
    el,
    get id() { return id; },
    get scale() { return sc; },
    // → { kind: 'score' } | { kind: 'text', text } | { kind: 'pdf' } | { kind: 'error' }
    async open(rec) {
      id = rec.id;
      try {
        const bytes = new Uint8Array(await rec.blob.arrayBuffer());
        const det = rec.det || sniffScore(bytes, rec.name + (rec.ext ? '.' + rec.ext : '')) || '';
        if (det === 'pdf' || rec.fmt === 'pdf') return { kind: 'pdf' };
        const a = await ensure();
        if (det === 'ascii' || det === 'text') {
          const text = new TextDecoder().decode(bytes), tex = det === 'ascii' ? asciiToTex(text, { title: rec.name }) : null;
          if (!tex) return { kind: 'text', text };
          a.tex(tex);
          return { kind: 'score' };
        }
        a.load(bytes);
        return { kind: 'score' };
      } catch (e) { onFail(e); return { kind: 'error' }; }
    },
    // Масштаб стана (щипок): живо — только переотрисовка
    setScale(v) {
      sc = Math.max(0.4, Math.min(2.5, v));
      if (!api) return;
      try { api.settings.display.scale = sc; api.updateSettings(); api.render(); } catch (e) { onFail(e); }
    },
    // Окно изменило размер: стан перекладывается по ширине
    relayout() { if (api) { try { api.render(); } catch { /* */ } } },
    destroy() { try { if (api) api.destroy(); } catch { /* */ } api = null; el.remove(); },
  };
}
