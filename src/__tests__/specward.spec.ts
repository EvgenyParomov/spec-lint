import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { match } from '../matcher.js';
import { parseSpecFile } from '../spec-parser.js';
import { parseTestFile } from '../test-parser.js';

const fixtures = path.resolve(import.meta.dirname, 'fixtures');
const fixture = (name: string) => path.join(fixtures, name);

describe('specward', () => {
  describe('parseSpecFile', () => {
    it('парсит feature, code и assertions из YAML', async () => {
      const result = await parseSpecFile(fixture('sample.spec.yaml'));

      expect(result.feature).toBe('sample module');
      expect(result.code).toBe('sample');
      expect(result.assertions).toHaveLength(7);
    });

    it('разделяет assertions по specType и path', async () => {
      const result = await parseSpecFile(fixture('sample.spec.yaml'));

      const unit = result.assertions.filter((a) => a.specType === 'specs-unit');
      const e2e = result.assertions.filter((a) => a.specType === 'specs-e2e');

      expect(unit).toHaveLength(6);
      expect(e2e).toHaveLength(1);
    });

    it('поддерживает вложенные категории', async () => {
      const result = await parseSpecFile(fixture('sample.spec.yaml'));

      const redis = result.assertions.find((a) => a.assert === 'Подключается к Redis');
      expect(redis?.path).toEqual(['Хранилище', 'Redis']);

      const memory = result.assertions.find((a) => a.assert === 'Хранит данные в памяти');
      expect(memory?.path).toEqual(['Хранилище', 'Memory']);
    });

    it('возвращает пустой массив assertions если нет specs- секций', async () => {
      const result = await parseSpecFile(fixture('empty.spec.yaml'));

      expect(result.feature).toBe('empty module');
      expect(result.assertions).toHaveLength(0);
    });

    it('отклоняется с YAMLParseError на битом YAML — CLI ловит per-file и продолжает', async () => {
      await expect(parseSpecFile(fixture('invalid.spec.yaml'))).rejects.toThrow(/Nested mappings/);
    });
  });

  describe('parseTestFile', () => {
    it('извлекает describe/it иерархию из тестового файла', async () => {
      const results = await parseTestFile(fixture('sample.spec.ts'));

      expect(results[0]).toEqual({
        filePath: fixture('sample.spec.ts'),
        describes: ['sample module', 'Регистрация'],
        title: 'Создаёт инстанс через конструктор',
      });
    });

    it('извлекает глубоко вложенные describe блоки', async () => {
      const results = await parseTestFile(fixture('sample.spec.ts'));
      const redis = results.find((r) => r.title === 'Подключается к Redis');

      expect(redis?.describes).toEqual(['sample module', 'Хранилище', 'Redis']);
    });

    it('обрабатывает файлы с декораторами (NestJS)', async () => {
      const results = await parseTestFile(fixture('decorators.spec.ts'));

      const titles = results.map((r) => r.title);
      expect(titles).toContain('handles decorators in test files');
    });

    it('обрабатывает describe.skip и it.only', async () => {
      const results = await parseTestFile(fixture('decorators.spec.ts'));
      const titles = results.map((r) => r.title);

      expect(titles).toContain('skipped test');
      expect(titles).toContain('focused test');
    });

    it('извлекает строки из template literals без выражений', async () => {
      const results = await parseTestFile(fixture('template-literal.spec.ts'));
      const titles = results.map((r) => r.title);

      expect(titles).toContain('использует template literal');
      expect(titles).toContain('обычная строка');
    });
  });

  describe('match', () => {
    it('матчит по полному пути [feature, ...path, assert]', async () => {
      const specFile = await parseSpecFile(fixture('sample.spec.yaml'));
      const tests = await parseTestFile(fixture('sample.spec.ts'));

      const result = match([specFile], tests);

      expect(result.matchedCount).toBe(5);
      expect(result.totalSpecs).toBe(7);
    });

    it('матчит вложенные категории с вложенными describe', async () => {
      const specFile = await parseSpecFile(fixture('sample.spec.yaml'));
      const tests = await parseTestFile(fixture('sample.spec.ts'));

      const result = match([specFile], tests);
      const missingAsserts = result.specsWithoutTests.map((s) => s.spec.assert);

      expect(missingAsserts).not.toContain('Подключается к Redis');
      expect(missingAsserts).not.toContain('Хранит данные в памяти');
    });

    it('находит спеки без тестов (errors)', async () => {
      const specFile = await parseSpecFile(fixture('sample.spec.yaml'));
      const tests = await parseTestFile(fixture('sample.spec.ts'));

      const result = match([specFile], tests);
      const missingAsserts = result.specsWithoutTests.map((s) => s.spec.assert);

      expect(missingAsserts).toContain('Инвалидирует кэш по TTL');
      expect(missingAsserts).toContain('Пользователь создаёт объект и видит его в списке');
      expect(result.specsWithoutTests).toHaveLength(2);
    });

    it('находит тесты без спеков (warnings)', async () => {
      const specFile = await parseSpecFile(fixture('sample.spec.yaml'));
      const tests = await parseTestFile(fixture('sample.spec.ts'));

      const result = match([specFile], tests);
      const extraTitles = result.testsWithoutSpecs.map((t) => t.test.title);

      expect(extraTitles).toContain('Работает с пустыми данными');
      expect(result.testsWithoutSpecs).toHaveLength(1);
    });

    it('матчит по code если feature не совпадает', () => {
      const specFile = {
        filePath: 'test.yaml',
        feature: 'Длинное название модуля',
        code: 'short',
        assertions: [
          {
            feature: 'Длинное название модуля',
            code: 'short',
            specType: 'specs-unit',
            path: ['Cat'],
            assert: 'works',
          },
        ],
      };
      const tests = [{ filePath: 'test.spec.ts', describes: ['short', 'Cat'], title: 'works' }];

      const result = match([specFile], tests);

      expect(result.matchedCount).toBe(1);
      expect(result.specsWithoutTests).toHaveLength(0);
    });

    it('возвращает нули если нет ни спеков ни тестов', () => {
      const result = match([], []);

      expect(result.matchedCount).toBe(0);
      expect(result.totalSpecs).toBe(0);
      expect(result.totalTests).toBe(0);
    });

    it('нормализует пробелы при сравнении', () => {
      const specFile = {
        filePath: 'test.yaml',
        feature: 'f',
        code: 'c',
        assertions: [
          {
            feature: 'f',
            code: 'c',
            specType: 'specs-unit',
            path: ['Категория'],
            assert: 'текст   с   пробелами',
          },
        ],
      };
      const tests = [
        { filePath: 'test.spec.ts', describes: ['f', 'Категория'], title: 'текст с пробелами' },
      ];

      const result = match([specFile], tests);

      expect(result.matchedCount).toBe(1);
    });
  });
});
