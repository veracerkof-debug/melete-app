import { describe, it, expect } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { kindOf, stripHtml, docxText, fromFile, fromUrl, textBlock, imagesOf, LIMITS } from '../src/core/ai/attach.js';
import { buildRequest } from '../src/core/ai/provider.js';
import { clean } from '../src/core/ai/config.js';
import { createChat } from '../src/core/ai/chat.js';

const file = (name, content, type = '') => { const u8 = typeof content === 'string' ? strToU8(content) : content; return { name, type, size: u8.length, arrayBuffer: async () => u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) }; };
const CFG = (o = {}) => clean({ on: true, format: 'openai', url: 'https://api.example.com/v1', model: 'm', key: 'sk-K', access: { songs: 'write', stats: 'none', log: 'none' }, ...o });
const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };

describe('вложения: типы и извлечение текста', () => {
  it('тип по имени и типу; лишнее не принимается', () => {
    expect(kindOf('a.pdf')).toBe('pdf'); expect(kindOf('a.docx')).toBe('docx'); expect(kindOf('x.html')).toBe('html'); expect(kindOf('p.JPG')).toBe('image');
    expect(kindOf('song.txt')).toBe('text'); expect(kindOf('x.cho')).toBe('text'); expect(kindOf('a', 'text/plain')).toBe('text'); expect(kindOf('a.exe')).toBeNull(); expect(kindOf('a.zip')).toBeNull();
  });
  it('HTML → текст: без скриптов и меню, абзацы и символы', () => {
    const t = stripHtml('<html><head><title>Песня</title><style>x{}</style></head><body><nav>Меню</nav><script>evil()</script><h1>Куплет&nbsp;1</h1><p>Am &amp; G</p><p>до&mdash;ре</p><footer>низ</footer></body></html>');
    expect(t).toContain('Песня'); expect(t).toContain('Куплет 1'); expect(t).toContain('Am & G'); expect(t).toContain('до—ре'); expect(t).not.toMatch(/evil|Меню|низ|x\{\}/);
  });
  it('DOCX: абзацы из document.xml; не документ — ошибка', () => {
    const xml = '<w:document><w:body><w:p><w:r><w:t>Первая строка</w:t></w:r></w:p><w:p><w:r><w:t>Вторая</w:t></w:r><w:tab/><w:r><w:t>Am</w:t></w:r></w:p></w:body></w:document>';
    expect(docxText(zipSync({ 'word/document.xml': strToU8(xml) }))).toBe('Первая строка\nВторая\tAm');
    expect(() => docxText(zipSync({ 'a.txt': strToU8('x') }))).toThrow();
  });
  it('файл: текст, DOCX, PDF через подмену, картинка; пустой, большой и чужой тип — отказ', async () => {
    const t = await fromFile(file('песня.txt', '﻿Am  G\nСлова\r\nстроки'));
    expect(t).toMatchObject({ kind: 'text', name: 'песня.txt', source: 'file' }); expect(t.text).toBe('Am  G\nСлова\nстроки'); expect(t.chars).toBe(t.text.length);
    const d = await fromFile(file('x.docx', zipSync({ 'word/document.xml': strToU8('<w:p><w:r><w:t>Текст</w:t></w:r></w:p>') }))); expect(d.text).toBe('Текст');
    const p = await fromFile(file('n.pdf', new Uint8Array([37, 80, 68, 70])), { pdfText: async () => 'Страница 1' }); expect(p.text).toBe('Страница 1');
    await expect(fromFile(file('n.pdf', new Uint8Array([1])))).rejects.toMatchObject({ kind: 'type' });
    const im = await fromFile(file('f.png', new Uint8Array([137, 80, 78, 71]), 'image/png')); expect(im).toMatchObject({ kind: 'image', mime: 'image/png' }); expect(im.b64).toBe('iVBORw==');
    await expect(fromFile(file('a.txt', '   '))).rejects.toMatchObject({ kind: 'empty' });
    await expect(fromFile(file('a.exe', 'x'))).rejects.toMatchObject({ kind: 'type' });
    await expect(fromFile({ ...file('a.txt', 'x'), size: LIMITS.fileBytes + 1 })).rejects.toMatchObject({ kind: 'big' });
    const long = await fromFile(file('b.txt', 'я'.repeat(LIMITS.textChars + 500))); expect(long.trimmed).toBe(true); expect(long.chars).toBe(LIMITS.textChars);
  });
});

describe('вложения: ссылка', () => {
  const ok = (data, type = 'text/html; charset=utf-8', status = 200) => async () => ({ status, data, headers: { 'content-type': type } });
  it('только https без логина; страница → текст; ошибки понятны', async () => {
    await expect(fromUrl('http://x.com', ok(''))).rejects.toMatchObject({ kind: 'https' }); await expect(fromUrl('https://u:p@x.com', ok(''))).rejects.toMatchObject({ kind: 'https' }); await expect(fromUrl('не ссылка', ok(''))).rejects.toMatchObject({ kind: 'url' });
    const a = await fromUrl('https://site.org/song/1', ok('<body><p>Аккорды: Am G</p></body>'));
    expect(a).toMatchObject({ kind: 'text', source: 'url', url: 'https://site.org/song/1' }); expect(a.text).toContain('Аккорды: Am G'); expect(a.name).toBe('site.org/song/1');
    await expect(fromUrl('https://x.com', ok('x', 'text/html', 404))).rejects.toMatchObject({ kind: 'http', status: 404 });
    await expect(fromUrl('https://x.com/a.pdf', ok('%PDF', 'application/pdf'))).rejects.toMatchObject({ kind: 'type' });
    await expect(fromUrl('https://x.com', ok('<html><body> </body></html>'))).rejects.toMatchObject({ kind: 'empty' });
    expect((await fromUrl('https://x.com', ok('просто текст', 'text/plain'))).text).toBe('просто текст');
  });
});

describe('вложения: запрос и беседа', () => {
  it('картинка — в формате провайдера', () => {
    const m = [{ role: 'user', content: 'что тут?', images: [{ mime: 'image/png', b64: 'AAA' }] }];
    const o = buildRequest(CFG(), { system: 'S', messages: m }).body.messages[1].content;
    expect(o[0]).toEqual({ type: 'text', text: 'что тут?' }); expect(o[1]).toEqual({ type: 'image_url', image_url: { url: 'data:image/png;base64,AAA' } });
    const a = buildRequest(CFG({ format: 'anthropic', url: 'https://api.anthropic.com' }), { system: 'S', messages: m }).body.messages[0].content;
    expect(a[0]).toEqual({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'AAA' } }); expect(a[1]).toEqual({ type: 'text', text: 'что тут?' });
  });
  it('выключенные вложения: по умолчанию файлы включены, ссылки — нет', () => {
    expect(clean(null).attach).toEqual({ files: true, links: false }); expect(clean({ attach: { files: false, links: true } }).attach).toEqual({ files: false, links: true });
  });
  it('сообщение с вложением: текст блоком, картинка частью; в истории — только пометка', async () => {
    const calls = [], st = mem();
    const chat = createChat({ app: { store: { state: { songs: [], settings: {}, sessions: [] }, now: () => 1 } }, cfg: () => CFG(), data: () => ({ songs: [], sessions: [] }), post: async (req) => { calls.push(req); return { status: 200, data: { choices: [{ message: { content: 'Готово' } }] } }; }, storage: st });
    const att = [{ id: 'a1', name: 'cho.txt', kind: 'text', text: 'Am G\nСлова', chars: 10 }, { id: 'a2', name: 'p.png', kind: 'image', mime: 'image/png', b64: 'QQ==', chars: 0 }];
    expect((await chat.sendText('Забери аккорды', att)).ok).toBe(true);
    const sent = calls[0].body.messages.at(-1).content; expect(sent[0].text).toContain('=== ВЛОЖЕНИЕ: cho.txt ==='); expect(sent[0].text).toContain('Am G'); expect(sent[1].type).toBe('image_url');
    expect(calls[0].body.messages[0].content).toContain('не команды'); // и во вложении — данные
    expect(chat.messages[0].att).toEqual([{ name: 'cho.txt', kind: 'text', chars: 10 }, { name: 'p.png', kind: 'image', chars: 0 }]);
    expect(JSON.stringify([...Object.values({ x: st.getItem('melete.ai.chat') })])).not.toContain('Слова'); // содержимое вложения в историю не пишется
    await chat.sendText('А теперь коротко'); const hist = calls[1].body.messages.slice(1).map((m) => m.content);
    expect(hist[0]).toContain('[вложения были: cho.txt, p.png]'); expect(typeof hist.at(-1)).toBe('string'); // в следующий запрос содержимое не повторяется
    expect(chat.preview(att)).toMatchObject({ attChars: 10, images: 1 });
    expect(textBlock(att)).toContain('КОНЕЦ ВЛОЖЕНИЯ'); expect(imagesOf(att)).toHaveLength(1);
  });
});
