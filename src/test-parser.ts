import { readFile } from 'node:fs/promises';
import { parseSync } from '@swc/core';
import type {
  Argument,
  ArrowFunctionExpression,
  CallExpression,
  ExpressionStatement,
  FunctionExpression,
  Identifier,
  MemberExpression,
  Module,
  ModuleItem,
  Statement,
  StringLiteral,
  TemplateLiteral,
} from '@swc/types';

export interface TestAssertion {
  filePath: string;
  describes: string[];
  title: string;
}

const TEST_FN_NAMES = new Set(['it', 'test']);
const DESCRIBE_FN_NAMES = new Set(['describe']);

function getCallName(node: CallExpression): string | null {
  const { callee } = node;
  if (callee.type === 'Identifier') {
    return (callee as Identifier).value;
  }
  if (callee.type === 'MemberExpression') {
    const { object } = callee as MemberExpression;
    if (object.type === 'Identifier') {
      return (object as Identifier).value;
    }
  }
  return null;
}

function getFirstArgString(args: Argument[]): string | null {
  const expr = args[0]?.expression;
  if (!expr) {
    return null;
  }
  if (expr.type === 'StringLiteral') {
    return (expr as StringLiteral).value;
  }
  if (expr.type === 'TemplateLiteral') {
    const tpl = expr as TemplateLiteral;
    if (tpl.expressions.length === 0 && tpl.quasis.length === 1) {
      return tpl.quasis[0]?.cooked ?? null;
    }
  }
  return null;
}

function getCallbackBody(args: Argument[]): Statement[] | null {
  const expr = args[1]?.expression;
  if (!expr) {
    return null;
  }
  if (expr.type === 'ArrowFunctionExpression') {
    const { body } = expr as ArrowFunctionExpression;
    if (body.type === 'BlockStatement') {
      return body.stmts;
    }
  }
  if (expr.type === 'FunctionExpression') {
    return (expr as FunctionExpression).body?.stmts ?? null;
  }
  return null;
}

function visitCall(
  node: CallExpression,
  describeStack: string[],
  results: TestAssertion[],
  filePath: string,
): void {
  const callName = getCallName(node);
  if (!callName) {
    return;
  }

  if (DESCRIBE_FN_NAMES.has(callName)) {
    const title = getFirstArgString(node.arguments);
    const stmts = getCallbackBody(node.arguments);
    if (title !== null && stmts) {
      describeStack.push(title);
      visitStatements(stmts, describeStack, results, filePath);
      describeStack.pop();
    }
    return;
  }

  if (TEST_FN_NAMES.has(callName)) {
    const title = getFirstArgString(node.arguments);
    if (title !== null) {
      results.push({ filePath, describes: [...describeStack], title });
    }
  }
}

function visitStatements(
  stmts: (Statement | ModuleItem)[],
  describeStack: string[],
  results: TestAssertion[],
  filePath: string,
): void {
  for (const stmt of stmts) {
    if (stmt.type === 'ExpressionStatement') {
      const { expression } = stmt as ExpressionStatement;
      if (expression.type === 'CallExpression') {
        visitCall(expression as CallExpression, describeStack, results, filePath);
      }
    }
  }
}

export async function parseTestFile(filePath: string): Promise<TestAssertion[]> {
  const code = await readFile(filePath, 'utf-8');
  const ast: Module = parseSync(code, {
    syntax: 'typescript',
    decorators: true,
    target: 'es2022',
  });

  const results: TestAssertion[] = [];
  visitStatements(ast.body, [], results, filePath);
  return results;
}
