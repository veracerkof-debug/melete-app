import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// Сырые ключи в интерфейсе: t('ключ') без строки в словаре — человек видит «stems.cleanSuffix» вместо слова.
// Ядро и общие элементы — словарь ядра (src/i18n/ru.json); модуль (ctx.t) — свой словарь или словарь ядра.
// Ключи с точкой в конце — префиксы (t('cal.' + x)), их не проверить по тексту — пропускаются.
const ALLOW = new Set([
  'src/ui/scalepick.js notes', 'src/ui/scalepick.js chrom', // получает переводчик модуля параметром
]);
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.js') ? [path.join(d, e.name)] : []));
const dict = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

describe('словари: у каждого ключа в коде есть строка', () => {
  const langs = ['ru', 'uz', 'en'], core = Object.fromEntries(langs.map((l) => [l, dict(`src/i18n/${l}.json`)]));
  it('ядро и общие элементы', () => {
    const miss = [];
    for (const f of [...walk('src/core'), ...walk('src/ui')]) {
      const s = fs.readFileSync(f, 'utf8'), rel = f.split(path.sep).join('/');
      for (const m of s.matchAll(/(?<![\w.])t\('([a-zA-Z0-9_.]+)'/g)) {
        const k = m[1];
        if (k.endsWith('.') || ALLOW.has(rel + ' ' + k)) continue;
        for (const l of langs) if (!(k in core[l])) miss.push(l + ': ' + rel + ' ' + k);
      }
    }
    expect([...new Set(miss)]).toEqual([]);
  });
  it('модули (ctx.t)', () => {
    const miss = [];
    for (const mod of fs.readdirSync('src/modules')) {
      if (!fs.existsSync(`src/modules/${mod}/i18n/ru.json`)) continue;
      const md = Object.fromEntries(langs.map((l) => [l, fs.existsSync(`src/modules/${mod}/i18n/${l}.json`) ? dict(`src/modules/${mod}/i18n/${l}.json`) : {}]));
      for (const f of walk('src/modules/' + mod)) {
        const s = fs.readFileSync(f, 'utf8'), rel = f.split(path.sep).join('/');
        for (const m of s.matchAll(/ctx\.t\('([a-zA-Z0-9_.]+)'/g)) {
          const k = m[1];
          if (k.endsWith('.') || ALLOW.has(rel + ' ' + k)) continue;
          for (const l of langs) if (!(k in md[l]) && !(k in core[l])) miss.push(l + ': ' + rel + ' ' + k);
        }
      }
    }
    expect([...new Set(miss)]).toEqual([]);
  });
});
