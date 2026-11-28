// Сцены и сценарии (слово автора 28.11.2026: «сцена запоминает всё»; пресеты и сценарии под разные устройства и ситуации).
// Сцена — снимок настроек инструментов на этом устройстве: пианино, пэды, теория, тюнер и другие разделы настроек (device.*), метроном
// (темп, размер, звук, акценты, тренер…), уровни громкости и эквалайзер шин (audio/profiles.js). Применяется ПАРАМЕТРАМИ: микшер — плавно,
// метроном — на лету (его планировщик читает настройки каждый шаг), пэд — плавным переходом, если звучит; узлы не создаются и не
// переподключаются (правило надёжности звука). Не входят: нагрузка и качество звука (буфер, движок, реверберация), выбор устройства вывода (это
// профили вывода), данные и содержимое (записи, песни, лупер, студия, пульт), счётчики занятий и раскладка окон. Сценарий — упорядоченный
// список сцен; «дальше / назад» листает. Хранится на устройстве (device.scenes), не синхронизируется. Без DOM.
import { capture as capMix, restore as restoreMix } from '../audio/profiles.js';

export const SCENES_MAX = 40, SCENARIOS_MAX = 12, SCENARIO_ITEMS_MAX = 40;
// Разделы настроек устройства, которые сцена не трогает
export const SKIP = ['scenes', 'profiles', 'mix', 'metro', 'watch', 'timer', 'pomo', 'audio', 'lastAudio', 'tab', 'notes', 'ws', 'wsMap', 'ui', 'output', 'show', 'looper', 'studio', 'bridge', 'bg', 'bgAsked'];
const clone = (o) => JSON.parse(JSON.stringify(o));
const canon = (v) => (Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])])) : v);
const same = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
const id = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const str = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, n);

export const defaults = () => ({ scenes: [], scenarios: [], cur: '', scn: '', pos: 0 });
export function normalize(s) {
  const o = s && typeof s === 'object' ? s : {};
  const scenes = (Array.isArray(o.scenes) ? o.scenes : []).filter((x) => x && typeof x.id === 'string' && x.snap && typeof x.snap === 'object').slice(0, SCENES_MAX).map((x) => ({ id: x.id, name: str(x.name, 40) || 'Сцена', at: +x.at || 0, snap: x.snap }));
  const have = new Set(scenes.map((x) => x.id));
  const scenarios = (Array.isArray(o.scenarios) ? o.scenarios : []).filter((x) => x && typeof x.id === 'string').slice(0, SCENARIOS_MAX).map((x) => ({ id: x.id, name: str(x.name, 40) || 'Сценарий', items: (Array.isArray(x.items) ? x.items : []).filter((i) => have.has(i)).slice(0, SCENARIO_ITEMS_MAX) }));
  return { scenes, scenarios, cur: have.has(o.cur) ? o.cur : '', scn: scenarios.some((x) => x.id === o.scn) ? o.scn : '', pos: Math.max(0, +o.pos || 0) };
}

// Снимок: app — { device, audio }
export function snapshot(app) {
  const dev = {};
  for (const k of Object.keys(app.device)) if (!SKIP.includes(k) && app.device[k] && typeof app.device[k] === 'object') dev[k] = clone(app.device[k]);
  const m = app.audio && app.audio.metro ? clone(app.audio.metro.cfg) : null;
  return { v: 1, device: dev, mix: capMix(app.device.mix), metro: m };
}
// Заменить содержимое объекта на месте (ссылки модулей на раздел остаются верными)
function replaceInPlace(target, src) { Object.keys(target).forEach((k) => delete target[k]); Object.assign(target, clone(src)); }

// Применить снимок; → { n: изменено разделов, drone: пэд переведён }
export function applySnapshot(app, snap) {
  let n = 0, drone = false;
  for (const [k, v] of Object.entries(snap.device || {})) {
    if (SKIP.includes(k) || !v || typeof v !== 'object') continue;
    if (!app.device[k] || typeof app.device[k] !== 'object') app.device[k] = {};
    if (!same(app.device[k], v)) { replaceInPlace(app.device[k], v); n++; }
  }
  if (snap.mix) n += restoreMix(app.audio.mixer, app.device.mix, snap.mix) ? 1 : 0;
  const m = app.audio && app.audio.metro;
  if (m && snap.metro) {
    const { bpm, ...rest } = snap.metro;
    if (!same(m.cfg, snap.metro)) {
      Object.assign(m.cfg, clone(rest)); if (bpm) m.setBpm(bpm); if (m.save) m.save(); n++;
    }
  }
  // пэд звучит — плавный переход на новые настройки (swap — кроссфейд); не звучит — ничего не запускаем
  const d = app.audio && app.audio.drone;
  if (d && d.on && snap.device && snap.device.drone && d.swap) { try { d.swap(); drone = true; } catch { /* настройки применятся при следующем запуске */ } }
  return { n, drone };
}

export function saveScene(S, app, name, now = Date.now()) {
  if (S.scenes.length >= SCENES_MAX) return null;
  const sc = { id: id('sc'), name: str(name, 40) || 'Сцена ' + (S.scenes.length + 1), at: now, snap: snapshot(app) };
  S.scenes.push(sc); S.cur = sc.id; return sc;
}
export function updateScene(S, app, sid, now = Date.now()) { const sc = S.scenes.find((x) => x.id === sid); if (sc) { sc.snap = snapshot(app); sc.at = now; } return sc || null; }
export function renameScene(S, sid, name) { const sc = S.scenes.find((x) => x.id === sid), nm = str(name, 40); if (sc && nm) sc.name = nm; return sc || null; }
export function removeScene(S, sid) {
  S.scenes = S.scenes.filter((x) => x.id !== sid);
  S.scenarios.forEach((c) => { c.items = c.items.filter((i) => i !== sid); });
  if (S.cur === sid) S.cur = '';
}
export function useScene(S, app, sid) {
  const sc = S.scenes.find((x) => x.id === sid); if (!sc) return null;
  const r = applySnapshot(app, sc.snap); S.cur = sid; return { scene: sc, ...r };
}

// Сценарии
export function addScenario(S, name) { if (S.scenarios.length >= SCENARIOS_MAX) return null; const c = { id: id('sn'), name: str(name, 40) || 'Сценарий ' + (S.scenarios.length + 1), items: [] }; S.scenarios.push(c); return c; }
export function removeScenario(S, cid) { S.scenarios = S.scenarios.filter((c) => c.id !== cid); if (S.scn === cid) { S.scn = ''; S.pos = 0; } }
export function scenarioAdd(S, cid, sid) { const c = S.scenarios.find((x) => x.id === cid); if (!c || !S.scenes.some((x) => x.id === sid) || c.items.length >= SCENARIO_ITEMS_MAX) return false; c.items.push(sid); return true; }
export function scenarioDrop(S, cid, index) { const c = S.scenarios.find((x) => x.id === cid); if (c && index >= 0 && index < c.items.length) c.items.splice(index, 1); }
export function scenarioMove(S, cid, index, dir) { const c = S.scenarios.find((x) => x.id === cid); const j = index + dir; if (!c || index < 0 || j < 0 || index >= c.items.length || j >= c.items.length) return false; [c.items[index], c.items[j]] = [c.items[j], c.items[index]]; return true; }
// Запустить сценарий с первой сцены
export function startScenario(S, app, cid) { const c = S.scenarios.find((x) => x.id === cid); if (!c || !c.items.length) return null; S.scn = cid; S.pos = 0; return useScene(S, app, c.items[0]); }
// Шаг по сценарию: +1 дальше, −1 назад (по краям остаётся на месте)
export function stepScenario(S, app, dir) {
  const c = S.scenarios.find((x) => x.id === S.scn); if (!c || !c.items.length) return null;
  const p = Math.max(0, Math.min(c.items.length - 1, S.pos + dir)); if (p === S.pos) return null;
  S.pos = p; return useScene(S, app, c.items[p]);
}
