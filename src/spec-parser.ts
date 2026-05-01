import { readFile } from 'node:fs/promises';
import { parse as parseYaml } from 'yaml';

export interface SpecAssertion {
  feature: string;
  code: string;
  specType: string;
  path: string[];
  assert: string;
}

export interface SpecFile {
  filePath: string;
  feature: string;
  code: string;
  assertions: SpecAssertion[];
}

function collectAssertions(
  value: unknown,
  currentPath: string[],
  base: { feature: string; code: string; specType: string },
  out: SpecAssertion[],
): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'object' && item !== null && 'assert' in item) {
        out.push({
          ...base,
          path: [...currentPath],
          assert: String((item as { assert: unknown }).assert),
        });
      }
    }
    return;
  }

  if (typeof value === 'object' && value !== null) {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      collectAssertions(child, [...currentPath, key], base, out);
    }
  }
}

export async function parseSpecFile(filePath: string): Promise<SpecFile> {
  const content = await readFile(filePath, 'utf-8');
  const doc = parseYaml(content) as Record<string, unknown>;

  const feature = String(doc.feature ?? '');
  const code = String(doc.code ?? '');
  const assertions: SpecAssertion[] = [];

  for (const [key, value] of Object.entries(doc)) {
    if (!key.startsWith('specs-')) {
      continue;
    }
    collectAssertions(value, [], { feature, code, specType: key }, assertions);
  }

  return { filePath, feature, code, assertions };
}
