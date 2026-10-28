// Пакеты моделей (модульность, шаг 2; DECISIONS 2026-10-28): модели с полем pack из build/models.json не встраиваются
// в APK и установщик, а скачиваются по кнопке из релиза packs (один .tar на пакет).
//   node build/packs.mjs index        — опись build/packs.json: файлы пакета с sha256 и размером (по models.json;
//                                       распакованные наборы — по файлам на диске, нужен npm run models)
//   node build/packs.mjs tar <папка>  — собрать <id>.tar каждого пакета из скачанных моделей, сверив каждый файл с описью
// Устройство проверяет каждый файл по описи при распаковке (src/core/packs.js → PacksPlugin.java / packs.rs).
// Формат — обычный tar (ustar) без сжатия: модели и ogg и так сжаты; порядок и заголовки постоянны.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync, openSync, writeSync, closeSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url)); // не .pathname: на Windows вышло бы /D:/…
const cfg = JSON.parse(readFileSync(join(root, 'build/models.json'), 'utf8'));
const OUT = join(root, 'build/packs.json');
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
// путь на устройстве — от public/ или src-tauri/ (как в сборке): models/piano/A0v1.ogg
const rel = (f) => f.replace(/^(public|src-tauri)\//, '');

export const tarSize = (files) => files.reduce((a, [, , b]) => a + 512 + Math.ceil(b / 512) * 512, 0) + 1024;

function index() {
  const packs = [];
  for (const [id, on] of Object.entries(cfg.packs)) {
    if (id === '_') continue;
    const files = [];
    for (const m of cfg.models.filter((x) => x.pack === id)) {
      if (m.extract) {
        const dir = join(root, m.extract.dir);
        if (!existsSync(join(root, m.file))) throw new Error('нет ' + m.file + ' — сначала npm run models');
        for (const n of readdirSync(dir).sort()) files.push([rel(m.extract.dir + '/' + n), sha(join(dir, n)), statSync(join(dir, n)).size]);
      } else files.push([rel(m.file), m.sha256, m.bytes]);
    }
    files.sort((a, b) => (a[0] < b[0] ? -1 : 1));
    // v — версия описи (меняется вместе с любым файлом): установленный пакет старой версии считается устаревшим
    const v = createHash('sha256').update(JSON.stringify(files)).digest('hex').slice(0, 12);
    const dirs = [...new Set(files.map(([f]) => f.slice(0, f.lastIndexOf('/') + 1)))];
    packs.push({ id, on, v, bytes: tarSize(files), dirs, files });
  }
  // list — лёгкая часть для приложения (в сборку идёт только она), files — опись для скачивания (грузится по требованию)
  const list = packs.map(({ files, ...p }) => p), files = Object.fromEntries(packs.map((p) => [p.id, p.files]));
  writeFileSync(OUT, JSON.stringify({ _: 'Опись пакетов — node build/packs.mjs index (не править руками)', list, files }) + '\n');
  packs.forEach((p) => console.log(p.id + ': ' + p.files.length + ' файлов, ' + Math.round(p.bytes / 1048576) + ' МБ, ' + p.on.join(', ')));
}

// Заголовок ustar: имя (до 100 знаков; длиннее — приставка до 155), 0644, владелец 0, время 0
function header(name, size) {
  const h = Buffer.alloc(512);
  let pre = '';
  if (Buffer.byteLength(name) > 100) { const i = name.lastIndexOf('/'); pre = name.slice(0, i); name = name.slice(i + 1); }
  const put = (s, off, len) => h.write(s, off, len, 'utf8');
  const oct = (n, len) => n.toString(8).padStart(len - 1, '0') + '\0';
  put(name, 0, 100); put(oct(0o644, 8), 100, 8); put(oct(0, 8), 108, 8); put(oct(0, 8), 116, 8);
  put(oct(size, 12), 124, 12); put(oct(0, 12), 136, 12); h.fill(0x20, 148, 156); put('0', 156, 1);
  put('ustar\0', 257, 6); put('00', 263, 2); put(pre, 345, 155);
  let sum = 0; for (const b of h) sum += b;
  put(sum.toString(8).padStart(6, '0') + '\0 ', 148, 8);
  return h;
}
export { header as tarHeader };

function tar(out) {
  const idx = JSON.parse(readFileSync(OUT, 'utf8')), packs = idx.list.map((p) => ({ ...p, files: idx.files[p.id] }));
  mkdirSync(out, { recursive: true });
  const src = (p) => [join(root, 'public', p), join(root, 'src-tauri', p)].find(existsSync);
  for (const p of packs) {
    const fd = openSync(join(out, p.id + '.tar'), 'w');
    let n = 0;
    for (const [path, s, b] of p.files) {
      const f = src(path);
      if (!f) throw new Error('нет файла ' + path);
      const buf = readFileSync(f);
      if (buf.length !== b || createHash('sha256').update(buf).digest('hex') !== s) throw new Error('не сходится с описью: ' + path);
      n += writeSync(fd, header(path, b)) + writeSync(fd, buf) + writeSync(fd, Buffer.alloc((512 - (b % 512)) % 512));
    }
    n += writeSync(fd, Buffer.alloc(1024));
    closeSync(fd);
    if (n !== p.bytes) throw new Error(p.id + ': размер ' + n + ' ≠ ' + p.bytes);
    console.log('собран ' + p.id + '.tar (' + Math.round(n / 1048576) + ' МБ)');
  }
}

// запуск из командной строки (при импорте в тестах — только функции)
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [cmd, arg] = process.argv.slice(2);
  if (cmd === 'index') index();
  else if (cmd === 'tar') tar(arg || join(root, 'packs-out'));
  else { console.error('node build/packs.mjs index | tar <папка>'); process.exit(1); }
}
