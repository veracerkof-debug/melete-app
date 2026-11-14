// Итог проверки экранов (tests/e2e/screens.spec.js): screens-out/r-*.json → сводка по инструментам и размерам окна
// (в консоль) и screens-out/index.html — снимки с найденным. Запуск: node build/screens-report.mjs [--md]
import fs from 'node:fs';
import path from 'node:path';

const OUT = 'screens-out';
const KIND = { small: 'мелкая кнопка (< 30 px)', small40: 'кнопка меньше 40 px', cut: 'кнопка за краем окна', overlap: 'кнопки друг на друге', textover: 'надписи друг на друге', textcut: 'надпись за краем', textclip: 'надпись обрезана', many: 'кнопок больше, чем помещается' };
const rows = fs.readdirSync(OUT).filter((f) => /^r-.*\.json$/.test(f)).flatMap((f) => JSON.parse(fs.readFileSync(path.join(OUT, f), 'utf8')));
// окно — один раз на (положение, раскладка, инструмент, размер): одно и то же окно встречается в разных сочетаниях
const seen = new Map();
const CHROME = /^(Окно: нажатие|Полный экран)/; // рамка окна — общая, в счёт инструмента не идёт
rows.forEach((r) => r.panes.forEach((p) => {
  const old = p.issues.some(([, a]) => CHROME.test(a || '')); // прежние замеры считали рамку окна кнопками
  p.issues = p.issues.filter(([, a]) => !CHROME.test(a || ''));
  if (old) { p.targets -= 2; p.issues = p.issues.filter(([k]) => k !== 'many'); if (r.layout !== 'F' && p.targets > p.max) p.issues.push(['many', p.targets + ' > ' + p.max]); }
  const k = [r.ori, r.layout, p.id, p.size, p.w + 'x' + p.h].join('|');
  if (!seen.has(k)) seen.set(k, { ...p, ori: r.ori, layout: r.layout, file: r.file });
}));
const byMod = {};
for (const p of seen.values()) {
  const m = (byMod[p.id] ||= { n: 0, bad: 0, kinds: {}, worst: [] });
  m.n++;
  const own = p.issues.filter(([k]) => k !== 'small40' && k !== 'textclip');
  if (own.length) { m.bad++; m.worst.push(p); }
  p.issues.forEach(([k]) => { m.kinds[k] = (m.kinds[k] || 0) + 1; });
}
const md = process.argv.includes('--md');
const lines = [];
Object.entries(byMod).sort((a, b) => b[1].bad - a[1].bad).forEach(([id, m]) => {
  lines.push((md ? '- **' + id + '**' : id.padEnd(10)) + ' окон ' + m.n + ', с ошибками ' + m.bad + ': ' + Object.entries(m.kinds).sort((a, b) => b[1] - a[1]).map(([k, n]) => KIND[k] + ' ×' + n).join(', '));
});
console.log(lines.join('\n'));
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
const html = '<!doctype html><meta charset="utf-8"><title>Экраны</title><style>body{font:14px system-ui;margin:16px;background:#f4f2ee}figure{display:inline-block;margin:8px;vertical-align:top;max-width:480px;background:#fff;padding:8px;border-radius:8px}img{max-width:100%;max-height:520px}li{font-size:12px}</style>' +
  Object.entries(byMod).map(([id, m]) => '<h2>' + esc(id) + ' — ' + m.bad + ' из ' + m.n + '</h2>' + m.worst.map((p) => '<figure><img loading="lazy" src="' + esc(p.file) + '"><figcaption>' + esc(p.ori + ' ' + p.layout + ' · ' + p.size + ' ' + p.w + '×' + p.h + ' (x ' + p.x + ', y ' + p.y + ') · кнопок ' + p.targets + '/' + p.max) + '<ul>' +
    p.issues.slice(0, 12).map(([k, a, b]) => '<li>' + esc(KIND[k] + ': ' + (a || '') + (b ? ' ' + b : '')) + '</li>').join('') + '</ul></figcaption></figure>').join('')).join('');
fs.writeFileSync(path.join(OUT, 'index.html'), html);
