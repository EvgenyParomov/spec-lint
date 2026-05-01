# specward

[![npm version](https://img.shields.io/npm/v/specward.svg)](https://www.npmjs.com/package/specward)
[![CI](https://github.com/EvgenyParomov/specward/actions/workflows/ci.yml/badge.svg)](https://github.com/EvgenyParomov/specward/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

CLI-утилита для валидации spec YAML файлов против тестовых файлов. Анализирует тесты через AST (SWC) — без их запуска.

## Зачем

Альтернатива [spec-box](https://github.com/spec-box) — без внешней инфраструктуры (Postgres, Web UI). Работает локально, мгновенно, встраивается в CI как lint-шаг.

## Как работает

1. Находит `*.spec.yaml` файлы (спецификации)
2. Находит `*.spec.ts` файлы (тесты)
3. Парсит тесты через SWC AST — извлекает `describe` / `it` иерархию
4. Сверяет: **category + assert** из YAML = **последний describe + it title** в тесте
5. Выводит результат:
   - **ERROR** — спек без теста (exit code 1)
   - **WARNING** — тест без спека

## Установка

```bash
npm install --save-dev specward
# или
yarn add -D specward
```

## Использование

```bash
# Весь проект
npx specward

# Один пакет
npx specward --cwd packages/feature-flags

# Кастомные паттерны
npx specward --specs "*.spec.yaml" --tests "src/__tests__/*.spec.ts"
```

### Опции

| Флаг | По умолчанию | Описание |
|------|-------------|----------|
| `--specs <glob>` | `**/*.spec.yaml` | Glob для spec-файлов |
| `--tests <glob>` | `**/src/**/*.spec.ts` | Glob для тестовых файлов |
| `--cwd <path>` | `.` | Рабочая директория |
| `-h, --help` | | Справка |

## Формат spec YAML

```yaml
feature: feature-flags module
code: feature-flags
description: Описание модуля

specs-unit:
  Регистрация модуля:
    - assert: forRoot регистрирует модуль и предоставляет Client через DI
    - assert: forRootAsync с фабрикой регистрирует модуль

  Кэширование:
    - assert: Запросы кэшируются по flagKeys + entity

specs-e2e:
  Полный сценарий:
    - assert: Пользователь создаёт объект и видит его в списке
```

### Маппинг на тесты

```
YAML                              Test file
─────────────────────────────────  ──────────────────────────────────
specs-unit:                        (любая секция specs-*)
  Регистрация модуля:        →    describe('Регистрация модуля', () => {
    - assert: forRoot...     →      it('forRoot...', () => {});
```

Ключ матчинга: `"feature/code > path > assert"` = `"describes... > it title"`.

## Программное использование

```typescript
import { parseSpecFile, parseTestFile, match, report } from 'specward';

const spec = await parseSpecFile('feature.spec.yaml');
const tests = await parseTestFile('feature.spec.ts');
const result = match([spec], tests);
const passed = report(result, process.cwd());
```

## Архитектура

```
src/
├── cli.ts            # Точка входа CLI
├── spec-parser.ts    # Парсинг YAML → SpecFile[]
├── test-parser.ts    # SWC AST → TestAssertion[]
├── matcher.ts        # Кросс-сверка specs ↔ tests
├── reporter.ts       # Вывод в консоль (chalk)
└── index.ts          # Публичные экспорты
```

### Почему AST, а не test report

|  | AST (SWC) | Test report (`vitest --reporter=json`) |
|---|---|---|
| Скорость | ~100ms на 200 файлов | Минуты (поднимает контейнеры, БД) |
| Зависимости | Не нужны | Нужна вся инфраструктура тестов |
| CI | Рядом с lint / check-types | Только после полного прогона |
| Точность | 100% для статических строк | 100% |

## Контрибьютинг

Изменения версионируются через [Changesets](https://github.com/changesets/changesets):

```bash
npx changeset       # описать изменение
git commit -am "feat: ..."
# когда коммит улетит в main, бот откроет "Version Packages" PR
```

## License

MIT © Evgeny Paromov
