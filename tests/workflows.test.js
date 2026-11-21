// Файлы GitHub Actions должны разбираться: 18.11.2026 двоеточие в незакавыченной команде (`run: … "Витрина: сборка"`)
// сломало showcase.yml и web.yml, и обе выкладки молча не шли до 21.11. Без библиотеки YAML — ловим именно эту ошибку.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';

const DIR = '.github/workflows';
// «ключ: значение» с простым (не в кавычках и не блочным) значением, где есть «: » — для YAML это второй ключ в строке
export const plainColonLines = (text) => text.split('\n').map((l, i) => [l, i + 1]).filter(([l]) => {
  const m = /^\s*(?:- )?[\w.-]+:\s+(\S.*)$/.exec(l);
  if (!m) return false;
  const v = m[1];
  if (/^["'|>\[{&*!#]/.test(v)) return false;
  return /: /.test(v.replace(/\s#.*$/, ''));
}).map(([, n]) => n);

describe('workflows', () => {
  it('поиск ошибки ловит сломанную строку', () => {
    expect(plainColonLines('        run: build/x.sh a "Витрина: сборка 1"')).toEqual([1]);
    expect(plainColonLines('        run: |\n          build/x.sh a "Витрина: сборка 1"')).toEqual([]);
    expect(plainColonLines('  name: "A: b"\n  uses: actions/checkout@v4')).toEqual([]);
  });
  for (const f of readdirSync(DIR).filter((x) => x.endsWith('.yml'))) {
    it(f + ': нет простых значений с «: »', () => {
      expect(plainColonLines(readFileSync(DIR + '/' + f, 'utf8'))).toEqual([]);
    });
  }
});
