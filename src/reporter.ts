import path from 'node:path';
import chalk from 'chalk';

import type { MatchResult } from './matcher.js';

export function report(result: MatchResult, cwd: string): boolean {
  const { specsWithoutTests, testsWithoutSpecs, matchedCount, totalSpecs, totalTests } = result;

  const rel = (p: string) => path.relative(cwd, p);

  console.log();
  console.log(chalk.bold('specward Results'));
  console.log(chalk.gray('─'.repeat(60)));

  if (specsWithoutTests.length > 0) {
    console.log();
    console.log(chalk.red.bold(`ERRORS: ${specsWithoutTests.length} spec(s) without tests`));
    console.log();

    let currentFile = '';
    let currentPath = '';

    for (const { spec, specFilePath } of specsWithoutTests) {
      if (specFilePath !== currentFile) {
        currentFile = specFilePath;
        currentPath = '';
        console.log(chalk.red(`  ${rel(specFilePath)}`));
      }
      const pathStr = `[${spec.specType}] ${spec.path.join(' > ')}`;
      if (pathStr !== currentPath) {
        currentPath = pathStr;
        console.log(chalk.red(`    ${pathStr}`));
      }
      console.log(chalk.red(`      - ${spec.assert}`));
    }
  }

  if (testsWithoutSpecs.length > 0) {
    console.log();
    console.log(chalk.yellow.bold(`WARNINGS: ${testsWithoutSpecs.length} test(s) without specs`));
    console.log();

    let currentFile = '';

    for (const { test } of testsWithoutSpecs) {
      if (test.filePath !== currentFile) {
        currentFile = test.filePath;
        console.log(chalk.yellow(`  ${rel(test.filePath)}`));
      }
      console.log(chalk.yellow(`    - ${[...test.describes, test.title].join(' > ')}`));
    }
  }

  console.log();
  console.log(chalk.gray('─'.repeat(60)));
  console.log(
    `  Specs: ${chalk.bold(String(totalSpecs))}  ` +
      `Tests: ${chalk.bold(String(totalTests))}  ` +
      `Matched: ${chalk.green.bold(String(matchedCount))}  ` +
      `Errors: ${chalk[specsWithoutTests.length > 0 ? 'red' : 'green'].bold(String(specsWithoutTests.length))}  ` +
      `Warnings: ${chalk[testsWithoutSpecs.length > 0 ? 'yellow' : 'green'].bold(String(testsWithoutSpecs.length))}`,
  );
  console.log();

  return specsWithoutTests.length === 0;
}
