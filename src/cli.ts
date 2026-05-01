#!/usr/bin/env node

import path from 'node:path';
import fg from 'fast-glob';

import { match } from './matcher.js';
import { report } from './reporter.js';
import { parseSpecFile } from './spec-parser.js';
import { parseTestFile, type TestAssertion } from './test-parser.js';

interface CliArgs {
  specs: string;
  tests: string;
  cwd: string;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    specs: '**/*.spec.yaml',
    tests: '**/src/**/*.spec.ts',
    cwd: process.cwd(),
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg) {
      continue;
    }
    if (arg === '--specs' && argv[i + 1]) {
      args.specs = argv[++i] as string;
    } else if (arg === '--tests' && argv[i + 1]) {
      args.tests = argv[++i] as string;
    } else if (arg === '--cwd' && argv[i + 1]) {
      args.cwd = path.resolve(argv[++i] as string);
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
specward - validate spec YAML files against test files

Usage:
  specward [options]

Options:
  --specs <glob>   Glob pattern for spec YAML files (default: "**/*.spec.yaml")
  --tests <glob>   Glob pattern for test files (default: "**/src/**/*.spec.ts")
  --cwd <path>     Working directory (default: current directory)
  -h, --help       Show this help message
`);
      process.exit(0);
    }
  }

  return args;
}

async function run(): Promise<void> {
  const args = parseArgs(process.argv);

  const specPaths = await fg(args.specs, {
    cwd: args.cwd,
    absolute: true,
    ignore: ['**/node_modules/**', '**/dist/**', '**/fixtures/**'],
  });

  if (specPaths.length === 0) {
    console.log('No spec files found matching:', args.specs);
    process.exit(0);
  }

  const testPaths = await fg(args.tests, {
    cwd: args.cwd,
    absolute: true,
    ignore: ['**/node_modules/**', '**/dist/**', '**/fixtures/**'],
  });

  const specFiles = await Promise.all(specPaths.map(parseSpecFile));
  const testResults = await Promise.allSettled(testPaths.map(parseTestFile));
  const testAssertions: TestAssertion[] = [];
  for (let i = 0; i < testResults.length; i++) {
    const result = testResults[i];
    if (result?.status === 'fulfilled') {
      testAssertions.push(...result.value);
    } else {
      console.warn(
        `WARN: failed to parse ${path.relative(args.cwd, testPaths[i] ?? '')}, skipping`,
      );
    }
  }

  const result = match(specFiles, testAssertions);
  const passed = report(result, args.cwd);

  if (!passed) {
    process.exit(1);
  }
}

run().catch((err: unknown) => {
  console.error('specward failed:', err);
  process.exit(1);
});
