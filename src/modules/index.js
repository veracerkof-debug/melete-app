// Реестр модулей. Контракт — MODULE_SPEC.md.
// Модули подключаются сами: любая папка с index.js в src/modules/ (встроенные) и src/modules-local/ (личные модули,
// в репозиторий не попадают — см. .gitignore). Новый модуль = новая папка; правок в ядре не нужно.
// id встроенных совпадают с прототипом (metro, tuner, timer, audio, piano, drone, theory, ear, notes),
// чтобы сохранённые раскладки окон и настройки переносились без миграции.
// Загрузка по требованию: при запуске грузится только лёгкое описание модуля (meta.js — название, значок, цвет,
// размеры, переводы); сам модуль (index.js) — при первом открытии: load() дописывает его в ту же запись реестра.
// Личные модули (modules-local) грузятся целиком при запуске, как раньше: их мало и они свои.

const metas = import.meta.glob('./*/meta.js', { eager: true });
const lazy = import.meta.glob('./*/index.js');
const local = import.meta.glob('../modules-local/*/index.js', { eager: true });

// Обязательные поля: описание — сразу, mount/resize/unmount — у загруженного модуля; без них модуль не подключается
// (и не ломает приложение)
const META = { id: 'string', name: 'object', icon: 'string', sizes: 'object' };
const BODY = { mount: 'function', resize: 'function', unmount: 'function' };
const check = (m, req) => { for (const [k, type] of Object.entries(req)) if (typeof m[k] !== type) return 'field "' + k + '" must be ' + type; return null; };

export function validateMeta(m) {
  if (!m || typeof m !== 'object') return 'no default export';
  const e = check(m, META); if (e) return e;
  if (!/^[a-z][a-z0-9-]*$/.test(m.id)) return 'id must be latin lowercase';
  if (!m.name.ru && !m.name.en) return 'name needs ru or en';
  return null;
}
export const validate = (m) => validateMeta(m) || check(m, BODY);

const list = [], skipped = [];
const dirOf = (p) => p.replace(/\/(meta|index)\.js$/, '');

// Модули грузятся по очереди, по одному: несколько окон сессии сразу не запрашивают сотни файлов одновременно
let queue = Promise.resolve();

// Запись реестра: описание + load() — догрузить модуль (один раз; ошибка — запись остаётся описанием, повтор можно)
function entry(meta, path, loader) {
  const m = { ...meta };
  let p = null;
  Object.defineProperty(m, 'load', {
    enumerable: false,
    value: () => p || (p = (queue = queue.catch(() => {}).then(loader)).then((mod) => {
      const full = mod.default, err = validate(full) || (full.id !== m.id ? 'id differs from meta.js' : null);
      if (err) throw new Error('[modules] ' + path + ': ' + err);
      // дописать только то, чего нет в описании: поля описания ядро могло поменять на ходу (цвет палитры — palettes.js)
      Object.keys(full).forEach((k) => { if (!(k in meta)) m[k] = full[k]; });
      m.loaded = true;
      return m;
    }).catch((e) => { p = null; throw e; })),
  });
  return m;
}

function add(m, path) {
  if (list.some((x) => x.id === m.id)) { skipped.push({ path, err: 'duplicate id "' + m.id + '"' }); return; }
  m.local = path.includes('modules-local');
  list.push(m);
}

Object.entries(metas).forEach(([path, mod]) => {
  const dir = dirOf(path), m = mod.default, err = validateMeta(m), loader = lazy[dir + '/index.js'];
  if (err || !loader) { skipped.push({ path, err: err || 'no index.js' }); return; }
  add(entry(m, dir + '/index.js', loader), path);
});
Object.keys(lazy).forEach((path) => { if (!metas[dirOf(path) + '/meta.js']) skipped.push({ path, err: 'no meta.js' }); });
Object.entries(local).forEach(([path, mod]) => {
  const m = mod.default, err = validate(m);
  if (err) { skipped.push({ path, err }); return; }
  const e = entry(m, path, () => Promise.resolve(mod));
  e.loaded = true;
  add(e, path);
});
skipped.forEach((s) => console.warn('[modules] пропущен ' + s.path + ': ' + s.err));

// Порядок — по полю order (встроенные — как на экране «Инструменты» прототипа), затем по id
list.sort((a, b) => (a.order ?? 1000) - (b.order ?? 1000) || a.id.localeCompare(b.id));

export const modules = list;
export const skippedModules = skipped;
export const moduleById = (id) => modules.find((m) => m.id === id);
// Сервер разработки (npm run dev, сквозные проверки) отдаёт каждый файл отдельно — сотни запросов на модуль; когда окна
// сессии догружают модули на ходу между частыми перезагрузками, Chromium в проверках срывается (ERR_INSUFFICIENT_RESOURCES).
// Поэтому там модули догружаются сразу после запуска, по очереди; путь тот же (load()). Сборки (APK, Windows, веб) — по
// требованию.
if (import.meta.env && import.meta.env.DEV && import.meta.env.MODE !== 'test') list.forEach((m) => { if (!m.loaded) m.load().catch(() => {}); });

// Догрузить модуль по id (уже загруженный — сразу); ошибка загрузки — в skippedModules для «Модулей и функций»
export async function loadModule(id) {
  const m = moduleById(id);
  if (!m) return null;
  if (m.loaded) return m;
  try { return await m.load(); } catch (e) {
    if (!skipped.some((s) => s.path === id)) skipped.push({ path: id, err: String(e && e.message) });
    throw e;
  }
}
