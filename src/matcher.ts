import type { SpecFile } from './spec-parser.js';
import type { TestAssertion } from './test-parser.js';

export interface SpecWithoutTest {
  spec: { specType: string; path: string[]; assert: string };
  specFilePath: string;
}

export interface TestWithoutSpec {
  test: TestAssertion;
}

export interface MatchResult {
  specsWithoutTests: SpecWithoutTest[];
  testsWithoutSpecs: TestWithoutSpec[];
  matchedCount: number;
  totalSpecs: number;
  totalTests: number;
}

function normalize(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

function buildKey(segments: string[]): string {
  return segments.map(normalize).join(' > ');
}

export function match(specFiles: SpecFile[], testAssertions: TestAssertion[]): MatchResult {
  const testKeys = new Set<string>();
  for (const test of testAssertions) {
    testKeys.add(buildKey([...test.describes, test.title]));
  }

  const matchedSpecKeys = new Set<string>();
  const specsWithoutTests: SpecWithoutTest[] = [];
  let matchedCount = 0;

  for (const specFile of specFiles) {
    for (const assertion of specFile.assertions) {
      const featureKey = buildKey([assertion.feature, ...assertion.path, assertion.assert]);
      const codeKey = buildKey([assertion.code, ...assertion.path, assertion.assert]);

      if (testKeys.has(featureKey)) {
        matchedCount++;
        matchedSpecKeys.add(featureKey);
      } else if (testKeys.has(codeKey)) {
        matchedCount++;
        matchedSpecKeys.add(codeKey);
      } else {
        specsWithoutTests.push({
          spec: { specType: assertion.specType, path: assertion.path, assert: assertion.assert },
          specFilePath: specFile.filePath,
        });
      }
    }
  }

  const allSpecKeys = new Set<string>();
  for (const specFile of specFiles) {
    for (const assertion of specFile.assertions) {
      allSpecKeys.add(buildKey([assertion.feature, ...assertion.path, assertion.assert]));
      allSpecKeys.add(buildKey([assertion.code, ...assertion.path, assertion.assert]));
    }
  }

  const testsWithoutSpecs: TestWithoutSpec[] = [];
  for (const test of testAssertions) {
    const testKey = buildKey([...test.describes, test.title]);
    if (!allSpecKeys.has(testKey)) {
      testsWithoutSpecs.push({ test });
    }
  }

  return {
    specsWithoutTests,
    testsWithoutSpecs,
    matchedCount,
    totalSpecs: specFiles.reduce((sum, f) => sum + f.assertions.length, 0),
    totalTests: testAssertions.length,
  };
}
