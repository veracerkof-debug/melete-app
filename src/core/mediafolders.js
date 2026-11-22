// Папки-категории медиатеки (слово автора 22.11.2026): разное аудио не перемешивается. Папки плоские.
// Авто-папки считаются по записи и не хранятся (задним числом работают для старых файлов): «Песни» (всё остальное), «Инструменты»
// (записи из инструментов, лупер, вокал), «Практика» (записи, сделанные в сессии «Свободная практика»), «Диктофон», «Видео».
// Свои папки — settings.mediaFolders: [{ id, name }]; у записи — поле folder (id своей папки). Запись в своей папке авто-папкой не считается.
export const AUTO = ['songs', 'instr', 'free', 'dict', 'video'];
export const MAX_FOLDERS = 40;

export const isVideoRec = (x) => !!(x && (x.video || /^video\//.test(x.type || '')));
export const foldersOf = (settings) => (settings && Array.isArray(settings.mediaFolders) ? settings.mediaFolders.filter((f) => f && f.id && typeof f.name === 'string') : []);

export function autoOf(x) {
  if (!x) return 'songs';
  if (x.dict) return 'dict';
  if (isVideoRec(x)) return 'video';
  if (x.rtool) return x.ses === 'free' ? 'free' : 'instr';
  if (/^(lp|vc)/.test(x.id || '') && !x.conv) return 'instr'; // лупер и вокал: прежние записи без пометки
  return 'songs';
}
// Папка записи: своя (если ещё существует) или авто
export function catOf(x, folders = []) {
  if (x && x.folder && folders.some((f) => f.id === x.folder)) return x.folder;
  return autoOf(x);
}
export const inCat = (x, cat, folders = []) => !cat || cat === 'all' || catOf(x, folders) === cat;

// Полоса папок: «Все», авто-папки, где что-то есть, и все свои (даже пустые)
export function catsFor(files, folders = []) {
  const n = new Map();
  for (const x of files) { const c = catOf(x, folders); n.set(c, (n.get(c) || 0) + 1); }
  return [{ id: 'all', n: files.length }, ...AUTO.filter((a) => n.get(a)).map((a) => ({ id: a, auto: true, n: n.get(a) })), ...folders.map((f) => ({ id: f.id, name: f.name, n: n.get(f.id) || 0 }))];
}

const uid = () => 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
export function addFolder(settings, name) {
  const nm = String(name || '').trim().slice(0, 40);
  if (!nm) return null;
  const list = foldersOf(settings);
  if (list.length >= MAX_FOLDERS || list.some((f) => f.name.toLowerCase() === nm.toLowerCase())) return null;
  const f = { id: uid(), name: nm };
  settings.mediaFolders = [...list, f];
  return f.id;
}
export function renameFolder(settings, id, name) {
  const nm = String(name || '').trim().slice(0, 40);
  const list = foldersOf(settings), f = list.find((x) => x.id === id);
  if (!f || !nm || list.some((x) => x.id !== id && x.name.toLowerCase() === nm.toLowerCase())) return false;
  f.name = nm; settings.mediaFolders = list; return true;
}
// Удалить папку: записи не удаляются, а возвращаются в свои авто-папки; → список записей, у которых сняли папку (их нужно сохранить)
export function removeFolder(settings, id, files) {
  settings.mediaFolders = foldersOf(settings).filter((f) => f.id !== id);
  const moved = files.filter((x) => x.folder === id);
  moved.forEach((x) => { delete x.folder; });
  return moved;
}
// Положить записи в папку (id своей папки; '' или null — вернуть в авто-папку)
export function setFolder(x, id) { if (id) x.folder = id; else delete x.folder; return x; }
