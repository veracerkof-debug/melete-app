// Студия и нейросеть (слово автора 26.11.2026): кнопка ИИ в студии, разрешение, ручной режим (копировать запрос, вставить ответ любой
// нейросети), прямой чат (сеть подменена), «Применить» кладёт ударные и бас клипами и играет, «Отменить» возвращает как было.
import { test, expect } from './melete.js';

const REPLY = 'Вот простой рок.\n```melete-studio\n' + JSON.stringify([
  { op: 'add', at: 1, bars: 2, fam: 'drums', name: 'Рок', lanes: { kick: ['x.......x.x.....', 'x.......x.x...x.'], snare: ['....x.......x...'], hat: ['x.x.x.x.x.x.x.x.'] } },
  { op: 'add', at: 1, bars: 2, fam: 'bass', ev: [[[0, 2, 'r'], [2, 2, 'r'], [4, 2, '5']], [[0, 4, 'r'], [8, 4, 'a']]] },
]) + '\n```';

const openStudio = async (page, melete) => {
  await melete.open();
  await page.evaluate(async () => {
    const P = await import('/src/music/project.js');
    const p = P.newProject(); p.name = 'ИИ'; p.clips = [];
    const s = JSON.parse(localStorage.getItem('practice.v1')); (s.projects ||= []).push(p); localStorage.setItem('practice.v1', JSON.stringify(s));
  });
  await page.reload(); await page.waitForTimeout(1200);
  await melete.tab('tools');
  await melete.click('[data-open-tool="studio"]'); await page.waitForTimeout(1200);
  await melete.click('.tview .stproj'); await page.waitForTimeout(1000);
};
const proj = async (melete) => (await melete.projects()).find((x) => x.name === 'ИИ');

test('студия: ИИ без своего API — копировать запрос, вставить ответ, применить и отменить', async ({ page, melete, errors }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  await openStudio(page, melete);
  if (process.env.SHOTDIR) await page.screenshot({ path: process.env.SHOTDIR + '/studio-bar.png' });
  await page.locator('.tview [data-x="more"]').click(); await page.waitForTimeout(150); await page.locator('.tview .stmore [data-x="ai"]').click(); await page.waitForTimeout(500);
  // сначала — разрешение (один раз)
  await expect(page.locator('.alert, .ask').first()).toContainText('проекте студии');
  await page.getByRole('button', { name: 'Разрешить' }).click(); await page.waitForTimeout(600);
  await expect(page.locator('.aichat')).toBeVisible();
  await expect(page.locator('[data-ai="chip"]').first()).toBeVisible();
  if (process.env.SHOTDIR) await page.screenshot({ path: process.env.SHOTDIR + '/studio-chat.png' });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('melete.ai')).access.studio)).toBe('write');
  // быстрая просьба → копирование запроса: инструкция формата, данные проекта, просьба
  await page.locator('[data-ai="chip"]').first().click();
  await page.locator('[data-ai="copyprompt"]').click(); await page.waitForTimeout(400);
  const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
  if (clip) { expect(clip).toContain('melete-studio'); expect(clip).toContain('СТУДИЯ'); expect(clip).toContain('Рок-ритм'); expect(clip).not.toContain('sk-'); }
  // вставка ответа любой нейросети → предложение с карточкой
  await page.locator('[data-ai="paste"]').click(); await page.waitForTimeout(400);
  await page.locator('[data-pta]').fill(REPLY);
  await page.locator('[data-pgo]').click(); await page.waitForTimeout(500);
  await expect(page.locator('.aip.pend')).toContainText('Ударные'); await expect(page.locator('.aip.pend')).toContainText('Бас');
  if (process.env.SHOTDIR) await page.screenshot({ path: process.env.SHOTDIR + '/studio-card.png' });
  // применить: клипы в проекте; проект сохранён
  await page.locator('[data-ai="apply"]').click(); await page.waitForTimeout(800);
  let p = await proj(melete);
  expect(p.clips.length).toBe(2);
  const kinds = p.clips.map((c) => p.tracks.find((t) => t.id === c.tr).kind).sort();
  expect(kinds).toEqual(['drums', 'notes']);
  await expect(page.locator('[data-ai="undo"]')).toBeVisible();
  // отменить: как было
  await page.locator('[data-ai="undo"]').click(); await page.waitForTimeout(600);
  p = await proj(melete); expect(p.clips.length).toBe(0);
  // ответ без блока — понятная подсказка, ничего не ломается
  await page.locator('[data-ai="paste"]').click(); await page.waitForTimeout(300);
  await page.locator('[data-pta]').fill('Просто совет: играйте тише.');
  await page.locator('[data-pgo]').click(); await page.waitForTimeout(400);
  await expect(page.locator('.toast, #toast').last()).toContainText('не найден блок');
  expect(errors).toEqual([]);
});

test('студия: прямой чат — модель отвечает блоком, видит проект студии; применить', async ({ page, melete, errors }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => { try { if (!localStorage.getItem('melete.ai')) localStorage.setItem('melete.ai', JSON.stringify({ on: true, format: 'openai', url: 'https://api.example.com/v1', model: 'm', key: 'sk-SECRET', access: { studio: 'write' }, auto: false, instruction: '' })); } catch { /* */ } });
  await openStudio(page, melete);
  await page.evaluate((reply) => {
    window.__aiCalls = [];
    window.__melete.ai.__test({ avail: true, post: async (req) => { window.__aiCalls.push(JSON.stringify(req)); return { status: 200, data: JSON.stringify({ choices: [{ message: { content: reply } }] }) }; } });
  }, REPLY);
  await page.locator('.tview [data-x="more"]').click(); await page.waitForTimeout(150); await page.locator('.tview .stmore [data-x="ai"]').click(); await page.waitForTimeout(600);
  await page.locator('[data-aiin]').fill('Простой рок-бит и бас на 2 такта'); await page.locator('[data-ai="send"]').click(); await page.waitForTimeout(900);
  const sent = JSON.stringify(JSON.parse(await page.evaluate(() => window.__aiCalls[0])).body); // тело запроса; ключ — только в заголовке для провайдера
  expect(sent).toContain('melete-studio'); expect(sent).toContain('СТУДИЯ'); expect(sent).not.toContain('sk-SECRET'); expect(sent).not.toContain('не можешь');
  await expect(page.locator('.aip.pend')).toBeVisible();
  await page.locator('[data-ai="apply"]').click(); await page.waitForTimeout(800);
  expect((await proj(melete)).clips.length).toBe(2);
  // автоприменения для студии нет: даже с «Применять правки сразу» предложение ждёт кнопки (проверено юнитом)
  expect(errors).toEqual([]);
});

test('студия: любая партия — аккорды, мелодия, пэды, правка темпа и тональности; откат возвращает как было', async ({ page, melete, errors }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await openStudio(page, melete);
  const ALL = '```melete-studio\n' + JSON.stringify([
    { op: 'project', set: { bpm: 96, key: 'Am', swing: 0.2 } },
    { op: 'add', at: 1, bars: 4, fam: 'chords', chords: [['Am7', 1], ['Dm', 1], ['G7', 1], ['Cmaj7', 1]] },
    { op: 'add', at: 1, bars: 4, fam: 'pads', inst: 'wair', hold: 0 },
    { op: 'add', at: 1, bars: 4, fam: 'keys', inst: 'fmep', ev: [[[2, 2], [6, 2], [10, 2], [14, 2]]] },
    { op: 'add', at: 1, bars: 2, fam: 'notes', inst: 'piano', notes: [['E5', 0, 1, 0.9], ['G5', 1, 0.5], ['A5', 1.5, 0.5], ['C6', 2, 2]] },
  ]) + '\n```';
  await page.locator('.tview [data-x="more"]').click(); await page.waitForTimeout(150); await page.locator('.tview .stmore [data-x="ai"]').click(); await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Разрешить' }).click(); await page.waitForTimeout(600);
  await page.locator('[data-ai="paste"]').click(); await page.waitForTimeout(300);
  await page.locator('[data-pta]').fill('Вот всё сразу.\n' + ALL); await page.locator('[data-pgo]').click(); await page.waitForTimeout(500);
  const card = page.locator('.aip.pend'); await expect(card).toContainText('Аккорды'); await expect(card).toContainText('Мелодия'); await expect(card).toContainText('темп → 96');
  const before = await proj(melete);
  await page.locator('[data-ai="apply"]').click(); await page.waitForTimeout(900);
  const p = await proj(melete);
  expect(p.bpm).toBe(96); expect(p.key).toEqual({ pc: 9, minor: true }); expect(p.swing).toBe(0.2);
  const kinds = p.clips.map((c) => p.tracks.find((t) => t.id === c.tr).kind);
  expect(kinds.filter((k) => k === 'chords').length).toBe(1); expect(kinds.filter((k) => k === 'notes').length).toBe(3); // пэды, клавиши, мелодия
  const chords = p.clips.find((c) => p.tracks.find((t) => t.id === c.tr).kind === 'chords');
  expect(chords.data.chords.map((x) => x.pc)).toEqual([9, 2, 7, 0]);
  await page.locator('[data-ai="undo"]').click(); await page.waitForTimeout(700);
  const q = await proj(melete);
  expect(q.bpm).toBe(before.bpm); expect(q.key).toEqual(before.key); expect(q.clips.length).toBe(0); expect(q.tracks.length).toBe(before.tracks.length);
  expect(errors).toEqual([]);
});

test('чат: ИИ просит данные записи — приложение отвечает само, модель получает темп и тональность', async ({ page, melete, errors }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => { try { if (!localStorage.getItem('melete.ai')) localStorage.setItem('melete.ai', JSON.stringify({ on: true, format: 'openai', url: 'https://api.example.com/v1', model: 'm', key: 'sk-SECRET', access: { media: 'read' }, auto: false, instruction: '' })); } catch { /* */ } });
  await melete.open({ settings: { home: { off: [] } } });
  await page.evaluate(() => {
    window.__aiCalls = []; const answers = ['Смотрю запись.\n```melete-query\n[{"q":"recordings"}]\n```', 'Темп уточнить нечем: у записи нет разбора.'];
    window.__melete.ai.__test({ avail: true, post: async (req) => { window.__aiCalls.push(JSON.stringify(req.body)); return { status: 200, data: JSON.stringify({ choices: [{ message: { content: answers[window.__aiCalls.length - 1] } }] }) }; } });
    window.__melete.render();
  });
  await page.waitForTimeout(500);
  await page.locator('.topbar .hai[data-act="aichat"]').click(); await page.waitForTimeout(500);
  await page.locator('[data-aiin]').fill('Какой темп у моих записей?'); await page.locator('[data-ai="send"]').click(); await page.waitForTimeout(1200);
  const calls = await page.evaluate(() => window.__aiCalls);
  expect(calls.length).toBe(2); expect(calls[1]).toContain('ОТВЕТ ПРИЛОЖЕНИЯ НА ЗАПРОСЫ'); expect(calls[0]).toContain('melete-query');
  await expect(page.locator('.aim.t')).toContainText('recordings');
  await expect(page.locator('.aim.a').last()).toContainText('нет разбора');
  expect(errors).toEqual([]);
});

// студия: ничего не уходит за край (полоса транспорта и панель выделения), второстепенное — в меню «⋯», полотно продолжается при прокрутке
test('студия: всё помещается, «⋯» с остальным, полотно продолжается за правый край', async ({ page, melete, errors }) => {
  test.setTimeout(120_000);
  for (const w of [360, 390, 413]) {
    await page.setViewportSize({ width: w, height: 844 });
    await openStudio(page, melete);
    const bad = await page.evaluate((vw) => [...document.querySelectorAll('.tview .sttop button')].filter((b) => b.getBoundingClientRect().width && (b.getBoundingClientRect().left < -0.5 || b.getBoundingClientRect().right > vw + 0.5)).map((b) => b.dataset.x), w);
    expect(bad).toEqual([]);
    const ov = await page.evaluate(() => { const w = document.querySelector('.tview .stwrap'); return w.scrollWidth - w.clientWidth; }); expect(ov).toBeLessThanOrEqual(1); // блок студии не шире экрана — вбок не уезжает
    expect(await page.locator('.tview .sttop > .ic, .tview .sttop > button').count()).toBeLessThanOrEqual(7);
    await page.locator('.tview [data-x="more"]').click(); await page.waitForTimeout(200);
    for (const x of ['back', 'mixer', 'loops', 'ai', 'click', 'looper', 'redo', 'settings']) await expect(page.locator('.tview .stmore [data-x="' + x + '"]')).toHaveCount(1);
    const m = await page.locator('.tview .stmore').boundingBox(); expect(m.x).toBeGreaterThanOrEqual(0); expect(m.x + m.width).toBeLessThanOrEqual(w + 0.5);
    await page.mouse.click(w / 2, 500); await page.waitForTimeout(200); await expect(page.locator('.tview .stmore')).toBeHidden(); // касание мимо закрывает
  }
  // полотно продолжается: тянем влево далеко за конец содержимого — сетка не заканчивается, упора нет
  const cv = page.locator('.tview .plcv'); const b = await cv.boundingBox();
  for (let k = 0; k < 8; k++) { await page.mouse.move(b.x + b.width - 40, b.y + 160); await page.mouse.down(); await page.mouse.move(b.x + 80, b.y + 160, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(60); }
  const lines = await page.evaluate(() => { const c = document.querySelector('.tview .plcv'), g = c.getContext('2d'), y = Math.floor(c.height * 0.28), w = c.width, d = g.getImageData(0, y, w, 1).data; let n = 0, prev = -1; for (let x = Math.floor(w * 0.35); x < w; x++) { const v = d[x * 4] + d[x * 4 + 1] * 256 + d[x * 4 + 2] * 65536; if (prev >= 0 && v !== prev) n++; prev = v; } return n; });
  expect(lines).toBeGreaterThan(6); // в правой части кадра по-прежнему линии сетки, а не пустота
  expect(errors).toEqual([]);
});

test('студия: панель выделения клипа — главное в строке, остальное под «⋯»', async ({ page, melete, errors }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 360, height: 844 });
  await melete.open();
  await page.evaluate(async () => {
    const P = await import('/src/music/project.js'); const L = await import('/src/music/studioai.js');
    const p = P.newProject(); p.name = 'Выделение'; p.clips = [];
    L.applyStudioOps(p, L.cleanStudioOps([{ op: 'add', at: 1, bars: 2, fam: 'drums', lanes: { kick: ['x.......x.x.....'] }, len: 8 }]).ops);
    const s = JSON.parse(localStorage.getItem('practice.v1')); (s.projects ||= []).push(p); localStorage.setItem('practice.v1', JSON.stringify(s));
  });
  await page.reload(); await page.waitForTimeout(1200);
  await melete.tab('tools'); await melete.click('[data-open-tool="studio"]'); await page.waitForTimeout(1200); await melete.click('.tview .stproj'); await page.waitForTimeout(1000);
  const b = await page.locator('.tview .plcv').boundingBox();
  await page.mouse.click(b.x + 160, b.y + 62); await page.waitForTimeout(400);
  await expect(page.locator('.tview #stsel')).toBeVisible();
  const r = await page.locator('.tview #stsel').boundingBox(); expect(r.x).toBeGreaterThanOrEqual(0); expect(r.x + r.width).toBeLessThanOrEqual(360.5);
  for (const k of ['edit', 'split', 'dup', 'del', 'more', 'none']) await expect(page.locator('.tview #stsel > [data-sb="' + k + '"]')).toHaveCount(1);
  await page.locator('.tview #stsel > [data-sb="more"]').click(); await page.waitForTimeout(250);
  for (const k of ['loop', 'mute', 'copy', 'cut']) await expect(page.locator('.tview #stsel .stmore [data-sb="' + k + '"]')).toBeVisible();
  await page.locator('.tview #stsel .stmore [data-sb="loop"]').click(); await page.waitForTimeout(300);
  await expect(page.locator('.tview #stsel .stmore')).toBeHidden(); // выбрали пункт — меню закрылось
  expect(errors).toEqual([]);
});
