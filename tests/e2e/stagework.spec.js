// «Сцена — один экран» (слово автора 22.11.2026): без события, сет-лист на экране, темп, барабанные пэды с залом и эхом, замок, «стоп всё»
import { test, expect } from './melete.js';

test('рабочая сцена: без события, список песен, темп, пэды, замок, стоп всё', async ({ page, melete, errors }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  const songs = [{ id: 's1', title: 'Первая', key: 'C', targetBpm: 96, notes: 'C   G\nСлова раз', created: Date.now() }, { id: 's2', title: 'Вторая', key: 'G', targetBpm: 120, notes: 'G   D\nСлова два', created: Date.now() }, { id: 's3', title: 'Третья', created: Date.now() }];
  await melete.open({ songs });
  await page.locator('.hstage').scrollIntoViewIfNeeded();
  await page.locator('.hstage').click(); await page.waitForTimeout(600);
  // событий нет — выбор состава рабочего сет-листа
  await page.click('[data-sgw="s1"]'); await page.click('[data-sgw="s2"]'); await page.waitForTimeout(200);
  await page.click('[data-sgwgo]'); await page.waitForTimeout(800);
  await expect(page.locator('.stage')).toHaveCount(1);
  expect(await melete.text('.sghead b')).toBe('Первая');
  await page.waitForTimeout(3000); // плашка веб-версии уходит
  // сет-лист на экране: касание названия — список, прыжок к песне
  await page.click('.sghead'); await page.waitForTimeout(400);
  await page.click('[data-sgj="1"]'); await page.waitForTimeout(500);
  expect(await melete.text('.sghead b')).toBe('Вторая');
  // темп: +5 и TAP
  const bpm = () => page.evaluate(() => +document.querySelector('.sgbpm b').textContent);
  const b0 = await bpm(); expect(b0).toBe(120);
  await page.click('[data-sgbpm="5"]'); await page.waitForTimeout(200);
  expect(await bpm()).toBe(125);
  // барабанные пэды: восемь, касание — удар (подсветка), ползунки пространства и эха
  await expect(page.locator('.sgpad')).toHaveCount(8);
  await page.locator('.sgpad.p-kickw').dispatchEvent('pointerdown', { pointerId: 7, isPrimary: true });
  await page.waitForTimeout(150);
  await expect(page.locator('.sgpad.p-kickw.hit')).toHaveCount(1);
  for (const i of [1, 2, 4, 7]) { await page.locator('.sgpad[data-pad="' + i + '"]').dispatchEvent('pointerdown', { pointerId: 7, isPrimary: true }); await page.waitForTimeout(60); }
  await page.locator('[data-fx="space"]').fill('90'); await page.locator('[data-fx="echo"]').fill('70');
  expect(await page.evaluate(() => sessionStorage.getItem('melete.stage.space'))).toBe('0.9');
  const shot = process.env.ED_SHOTS; if (shot) await page.screenshot({ path: shot + '/stage.png' });
  // пэды — свернуть и вернуть
  await page.click('[data-sgt="pads"]'); await page.waitForTimeout(200);
  await expect(page.locator('.sgpad')).toHaveCount(0);
  await page.click('[data-sgt="pads"]'); await page.waitForTimeout(200);
  // замок: касания игнорируются, снимается удержанием
  await page.click('[data-sg="lock"]'); await page.waitForTimeout(200);
  await expect(page.locator('.sglock')).toHaveCount(1);
  await page.click('.sglock', { force: true, position: { x: 20, y: 20 } }); // игнорируется
  expect(await melete.text('.sghead b')).toBe('Вторая');
  await melete.hold('[data-sgunlock]', 900); await page.waitForTimeout(300);
  await expect(page.locator('.sglock')).toHaveCount(0);
  // старт и «стоп всё» удержанием ■
  await page.click('[data-sg="play"]'); await page.waitForTimeout(800);
  await expect(page.locator('.sgbtn.main.on')).toHaveCount(1);
  await melete.hold('.sgbtn.main.on', 1000); await page.waitForTimeout(400);
  await expect(page.locator('.sgbtn.main.on')).toHaveCount(0);
  // состав рабочего сет-листа сохранён в настройках
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('practice.v1')).settings.stageWork.songs)).toEqual(['s1', 's2']);
  expect(errors).toEqual([]);
});
