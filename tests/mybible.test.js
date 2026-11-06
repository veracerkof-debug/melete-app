// MyBible для изучения (вид «Минимал»): теги стиха, очистка HTML статей, ссылки, модули всех типов
import { describe, it, expect } from 'vitest';
import initSqlJs from 'sql.js';
import { resolve } from 'node:path';
import { setSqlWasm } from '../src/core/songimport.js';
import { renderVerse, sanitizeHTML, parseBRef, parseCRef, openModule, abbrOf, strongPrefix, subheadingHTML } from '../src/core/mybible-study.js';

const WASM = resolve('node_modules/sql.js/dist/sql-wasm.wasm');
setSqlWasm(WASM);
const db = async (sql, ...rows) => { const SQL = await initSqlJs({ locateFile: () => WASM }); const d = new SQL.Database(); d.run(sql); rows.forEach(([q, a]) => d.run(q, a)); return d.export(); };

describe('стих: теги MyBible', () => {
  it('Стронг — цифрой после слова с буквой по Завету; сноска, слова Христа, добавленные слова', () => {
    const h = renderVerse('In the beginning<S>7225</S> God <i>was</i> <J>said</J><f>[1]</f>', { prefix: 'H' });
    expect(h).toBe('In the beginning<sup class="bs" data-s="H7225">7225</sup> God <span class="bins">was</span> <span class="bj">said</span><sup class="bfn" data-fn="[1]">[1]</sup>');
  });
  it('без Стронга номера скрыты; разметка не пропускает HTML из модуля', () => {
    expect(renderVerse('слово<S>12</S> <script>x</script>&amp;', { strong: false })).toBe('слово x&amp;');
    expect(strongPrefix('MAT')).toBe('G');
    expect(strongPrefix('GEN')).toBe('H');
  });
});

describe('статьи и ссылки', () => {
  it('HTML статьи: только безопасные теги; ссылки B:/S:/C:@ — переходы, внешние — без адреса', () => {
    const h = sanitizeHTML("<p onclick='x'>a <a href='S:H352'>H352</a> <a href='https://evil'>e</a><script>alert(1)</script><img src=x onerror=1><font color='1'>r</font></p>");
    expect(h).toBe('<p>a <a class="blink" data-href="S:H352">H352</a> <a class="bext">e</a><span class="fc1">r</span></p>');
  });
  it('B: и C:@', () => {
    expect(parseBRef('B:10 3:8')).toEqual({ code: 'GEN', ch: 3, v: 8 });
    expect(parseBRef('B:500 1')).toEqual({ code: 'JOH', ch: 1, v: null });
    expect(parseCRef('C:@470 5:3')).toEqual({ code: 'MAT', ch: 5, v: 3 });
    expect(abbrOf('RST+.commentaries.SQLite3')).toBe('RST+');
    expect(subheadingHTML('см. <x>480 3:5</x>')).toContain('data-href="B:480 3:5"');
  });
});

describe('модули', () => {
  it('лексикон Стронга', async () => {
    const m = await openModule(await db("CREATE TABLE info (name TEXT, value TEXT); INSERT INTO info VALUES ('type','strong lexicon'),('description','Strong'); CREATE TABLE dictionary (topic TEXT, definition TEXT, short_definition TEXT, lexeme TEXT, transliteration TEXT, pronunciation TEXT); INSERT INTO dictionary VALUES ('H7225','<b>начало</b>','начало','רֵאשִׁית','reshith','ray-sheeth');"), 'Strong.dictionary.SQLite3');
    expect(m).toMatchObject({ type: 'dictionary', strong: true, abbr: 'Strong' });
    expect(m.get('H7225').lexeme).toBe('רֵאשִׁית');
    expect(m.get('h7225')).toBeTruthy();
    m.close();
  });
  it('комментарии: метка в конце отрывка (или в начале), статьи к стиху; сноски', async () => {
    const m = await openModule(await db('CREATE TABLE info (name TEXT, value TEXT); CREATE TABLE commentaries (book_number NUMERIC, chapter_number_from NUMERIC, verse_number_from NUMERIC, chapter_number_to NUMERIC, verse_number_to NUMERIC, is_preceding NUMERIC, marker TEXT, text TEXT)',
      ['INSERT INTO commentaries VALUES (10,1,1,1,3,0,NULL,?)', ['О творении']], ['INSERT INTO commentaries VALUES (10,1,5,NULL,NULL,1,NULL,?)', ['О дне']]), 'X.commentaries.SQLite3');
    const ch = m.chapter('GEN', 1);
    expect(ch.map((x) => x.at)).toEqual([3, 5]);
    expect(m.verse('GEN', 1, 2).map((x) => x.text)).toEqual(['О творении']);
    m.close();
  });
  it('перекрёстные ссылки — по голосам; подзаголовки', async () => {
    const x = await openModule(await db('CREATE TABLE info (name TEXT, value TEXT); CREATE TABLE cross_references (book NUMERIC, chapter NUMERIC, verse NUMERIC, verse_end NUMERIC, book_to NUMERIC, chapter_to NUMERIC, verse_to_start NUMERIC, verse_to_end NUMERIC, votes NUMERIC); INSERT INTO cross_references VALUES (10,1,1,0,500,1,1,3,50),(10,1,1,0,650,11,3,0,90);'), 'X.crossreferences.SQLite3');
    expect(x.chapter('GEN', 1).get(1).map((r) => r.code)).toEqual(['HEB', 'JOH']);
    x.close();
    const s = await openModule(await db("CREATE TABLE info (name TEXT, value TEXT); CREATE TABLE subheadings (book_number NUMERIC, chapter NUMERIC, verse NUMERIC, order_if_several NUMERIC, subheading TEXT); INSERT INTO subheadings VALUES (10,1,1,NULL,'Сотворение мира');"), 'X.subheadings.SQLite3');
    expect(s.chapter('GEN', 1).get(1)).toEqual(['Сотворение мира']);
    s.close();
  });
  it('перевод: сырые стихи с тегами, номер Стронга по параметрам модуля', async () => {
    const b = await openModule(await db("CREATE TABLE info (name TEXT, value TEXT); INSERT INTO info VALUES ('strong_numbers','true'); CREATE TABLE verses (book_number NUMERIC, chapter NUMERIC, verse NUMERIC, text TEXT); INSERT INTO verses VALUES (10,1,1,'В начале<S>7225</S>');"), 'RST+.SQLite3');
    expect(b).toMatchObject({ type: 'bible', strong: true, abbr: 'RST+', books: { GEN: 1 } });
    expect(b.raw('GEN', 1)).toEqual([{ v: 1, t: 'В начале<S>7225</S>' }]);
    b.close();
  });
});

// Настоящие модули (06.11.2026, сверено на RST+, VINT+, «Стронг», «Лексикон», Strong): разметка лексиконов, морфология, номера
import { decodeMorph, strongAlt } from '../src/core/mybible-study.js';
describe('модули Стронга', () => {
  it('теги лексиконов: слово оригинала, поля, номера значений', () => {
    expect(sanitizeHTML('<he>אָב</he> <br/><nm>1.</nm> <df>Оригинал:</df> <bi>x</bi>')).toBe('<span class="bhe" lang="he" dir="rtl">אָב</span> <br><span class="bnm">1.</span> <span class="bdf">Оригинал:</span> <span class="bbi">x</span>');
    expect(sanitizeHTML('<el>βίβλος</el>')).toBe('<span class="bgr" lang="el">βίβλος</span>');
  });
  it('номер в стихе: с буквой Завета или без; код формы касается', () => {
    expect(renderVerse('книга<S>G976</S> <m>N-NSF</m>', { prefix: 'H' })).toBe('книга<sup class="bs" data-s="G976">976</sup> <sup class="bmo" data-m="N-NSF">N-NSF</sup>');
  });
  it('морфология: целиком, часть речи и окончания с applicable_to', () => {
    const rows = [{ i: 'V', a: null, m: 'гл.' }, { i: '-PAI', a: 'V', m: 'наст. вр.' }, { i: '-3S', a: null, m: '3 л., ед. ч.' }, { i: 'N-PRI', a: null, m: 'нескл. имя' }];
    expect(decodeMorph('V-PAI-3S', rows)).toEqual(['гл.', 'наст. вр.', '3 л., ед. ч.']);
    expect(decodeMorph('N-PRI', rows)).toEqual(['нескл. имя']);
  });
  it('G976 ↔ G0976', () => {
    expect(strongAlt('G976')).toBe('G0976');
    expect(strongAlt('G0976')).toBe('G976');
    expect(strongAlt('слово')).toBeNull();
  });
  it('словарь: однокоренные и морфология из таблиц модуля', async () => {
    const u8 = await db("CREATE TABLE info(name,value); CREATE TABLE dictionary(topic,definition,lexeme,transliteration,pronunciation,short_definition); CREATE TABLE cognate_strong_numbers(group_id INTEGER, strong_number TEXT); CREATE TABLE morphology_indications(indication TEXT, applicable_to TEXT, meaning TEXT); CREATE TABLE morphology_topics(indication TEXT, topic TEXT);",
      ["INSERT INTO info VALUES ('is_strong','true')"], ["INSERT INTO dictionary VALUES ('G0976','книга','βίβλος','','','')"], ["INSERT INTO cognate_strong_numbers VALUES (1,'G976'),(1,'G975')"],
      ["INSERT INTO morphology_indications VALUES ('N',NULL,'сущ.'),('-NSF',NULL,'им. п., ед. ч., ж. р.')"], ["INSERT INTO morphology_topics VALUES ('N-NSF','G5000')"]);
    const d = await openModule(u8, 'Стронг.dictionary.SQLite3');
    expect(d.get('G976').definition).toBe('книга'); // номер без нулей находит запись с нулями
    expect(d.cognates('G976')).toEqual(['G975']);
    expect(d.morph('N-NSF')).toEqual({ parts: ['сущ.', 'им. п., ед. ч., ж. р.'], topic: 'G5000' });
  });
});
