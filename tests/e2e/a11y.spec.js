// Доступность (WCAG 2.1 AA, axe-core): вкладки и все инструменты на телефоне — без нарушений, кроме принятых
// осознанно (см. ALLOW). Контраст, подписи кнопок и полей, вложенные интерактивные элементы.
import { test, expect } from './melete.js';
import fs from 'fs';
import { createRequire } from 'module';
const AXE = fs.readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
// Осознанно: цвет кнопок аккордов в пэдах (цвет функции аккорда) и шапка окна (компактная рамка, первый принцип)
const ALLOW = [/\.cbtn\[data-x="chor/, /^\.ptitle|\.pane-title|\.phead/];
// bypassCSP: axe встраивается строкой, а политика приложения (index.html) строки не пускает — так и должно быть
test.use({ viewport: { width: 390, height: 844 }, bypassCSP: true });
test('доступность: вкладки и инструменты', async ({ page, melete }) => {
  test.setTimeout(240_000);
  await melete.open();
  const bad = [];
  const run = async (where) => {
    await page.addScriptTag({ content: AXE });
    const v = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } })).violations
      .map((x) => ({ id: x.id, nodes: x.nodes.map((n) => n.target.join(' ')) })));
    v.forEach((x) => x.nodes.filter((n) => !ALLOW.some((r) => r.test(n))).forEach((n) => bad.push(where + ' ' + x.id + ' ' + n)));
  };
  for (const tab of ['home', 'songs', 'calendar', 'tools']) { await melete.tab(tab); await page.waitForTimeout(600); await run(tab); }
  for (const id of await melete.modules()) { await melete.free('F', [id]); await run(id); }
  expect(bad).toEqual([]);
});
