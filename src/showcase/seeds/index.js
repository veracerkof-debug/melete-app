// Витрина не бывает пустой (слово автора 15.11.2026): у каждого инструмента — демонстрационные данные, чтобы всегда была
// «бурная деятельность». ПРАВИЛО ПРОЕКТА (CLAUDE.md, правило 13): новый инструмент — сразу запись здесь: либо посев в SEEDS,
// либо в NO_DEMO с причиной, почему данных у него быть не может. Это проверяет tests/showcase-seeds.test.js: без записи тесты красные.
// Посев идёт один раз на инструмент (признак `showcase.seed.<id>.v1`): добавили инструмент или посев — у зашедших раньше
// он добавится при следующем заходе.
import { earDemo, beatDemo, vocalDemo } from './builders.js';
import { SOUNDS, EXTRA, melodyTrack, showData, studioSong } from '../showdemo.js';
import { projectFromSong } from '../../music/project.js';
import { DEMO_PREFIX } from '../../core/demo.js';
import { uid } from '../../core/time.js';

const T = {
  ru: { loop: 'Лупер — блюзовая петля (демо)', idea: 'Идея для куплета (диктофон, демо)', rehearsal: 'Репетиция — Братец Яков (диктофон, демо)',
    tracks: { ode: 'Ода к радости (демо)', jingle: 'Бубенцы (демо)', twinkle: 'Мерцай, звёздочка (демо)' } },
  en: { loop: 'Looper — blues loop (demo)', idea: 'Verse idea (recorder, demo)', rehearsal: 'Rehearsal — Frère Jacques (recorder, demo)',
    tracks: { ode: 'Ode to Joy (demo)', jingle: 'Jingle Bells (demo)', twinkle: 'Twinkle, Twinkle (demo)' } },
  uz: { loop: 'Looper — blyuz sikli (demo)', idea: 'Band uchun g‘oya (diktofon, demo)', rehearsal: 'Mashq — Jak aka (diktofon, demo)',
    tracks: { ode: 'Shodlik qasidasi (demo)', jingle: 'Qo‘ng‘iroqchalar (demo)', twinkle: 'Yulduzcha (demo)' } },
};
const tr = (lang) => T[lang] || T.en;
const settings = (env, id) => (env.app.store.state.settings[id] ??= {});
const putSettings = (env, id, data) => { Object.assign(settings(env, id), data); env.app.store.settingsChanged(); };

// env: { app, lang, now, addFile(data, name, extra) → id } — собирает showcase/main.js
export const SEEDS = {
  // Слух, ритм, вокал: статистика, курс и дневник за ~80 дней
  ear: async (env) => putSettings(env, 'ear', earDemo(env.now)),
  beat: async (env) => putSettings(env, 'beat', beatDemo(env.now)),
  vocal: async (env) => putSettings(env, 'vocal', vocalDemo(env.now)),
  // Лупер сохраняет сведение в медиатеку: готовая петля; диктофон — записи там же
  looper: async (env) => { await env.addFile(EXTRA.loop(), tr(env.lang).loop); },
  voice: async (env) => { await env.addFile(EXTRA.idea(), tr(env.lang).idea); await env.addFile(melodyTrack('jacques'), tr(env.lang).rehearsal); },
  // Студия: проект из «Оды к радости» — мелодия, бас, ударные
  studio: async (env) => {
    const pr = projectFromSong(studioSong(env.lang)); pr.id = DEMO_PREFIX + uid();
    env.app.store.state.projects = [...(env.app.store.state.projects || []).filter((p) => !String(p.id).startsWith(DEMO_PREFIX)), pr];
    env.app.store.save();
  },
  // Пульт выступления: «День студента» — номера, метки, фон, банки падов, шумы; звуки и мелодии синтезируются тут же
  show: async (env) => {
    const f = {};
    for (const k of ['roll', 'fanfare', 'gong', 'applause', 'tick', 'right', 'wrong', 'hall', 'rain', 'wind']) f[k] = await env.addFile(SOUNDS[k](), 'demo ' + k, { show: true });
    for (const k of ['hall', 'rain', 'wind']) f['n_' + k] = await env.addFile(SOUNDS[k](), 'demo noise ' + k, { show: true });
    for (const k of ['ode', 'jingle', 'twinkle']) f['t_' + k] = await env.addFile(melodyTrack(k), tr(env.lang).tracks[k]);
    const dev = env.app.device.show ?? (env.app.device.show = {});
    Object.assign(dev, showData(f, env.lang, env.now));
    env.app.saveDevice();
  },
};

// Инструменты, у которых своих данных нет и быть не может; причина — обязательна (проверяется тестом)
export const NO_DEMO = {
  metro: 'сет-лист метронома строится из событий календаря с песнями — они есть в общем демо-наборе (core/demo.js)',
  tuner: 'только показывает звук с микрофона, хранить нечего',
  piano: 'игра вживую; занятия и привычки — в общей истории занятий витрины',
  glider: 'игра вживую; занятия — в общей истории занятий витрины',
  drone: 'игра вживую; занятия — в общей истории занятий витрины',
  theremin: 'игра вживую перед камерой; занятия — в общей истории занятий витрины',
  theory: 'справочник со встроенным содержанием, пустым не бывает',
  book: 'учебник со встроенным содержанием, пустым не бывает',
  bible: 'встроенное содержание; показывается только в церковном режиме',
  together: 'нужен реальный репозиторий GitHub пары и токен; в витрине без сети и без чужих данных показывать нечего',
  timer: 'помодоро и секундомер: история — в общей истории занятий витрины',
  audio: 'медиатека: демо-записи, видео и звуки добавлены общим посевом (main.js, core/demoaudio.js)',
  notes: 'табы и ноты — из демо-песен (core/demo.js, public/demo/)',
  convert: 'работает с файлами медиатеки, своих данных нет',
  spectrum: 'только показывает звук с микрофона, хранить нечего',
};

const FLAG = (id) => 'showcase.seed.' + id + '.v1';
// Выполнить посевы, которые ещё не делались (на каждый инструмент — отдельный признак); → сколько выполнено
export async function runSeeds(env, storage = globalThis.localStorage) {
  let n = 0;
  for (const [id, fn] of Object.entries(SEEDS)) {
    if (storage.getItem(FLAG(id))) continue;
    try { await fn(env); storage.setItem(FLAG(id), '1'); n++; } catch (e) { console.error('showcase seed ' + id, e); }
  }
  return n;
}
export const seedFlag = FLAG;
