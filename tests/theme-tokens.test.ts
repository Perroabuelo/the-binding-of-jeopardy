import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const UI_DIR = join(import.meta.dirname, '..', 'src', 'ui');
const TOKENS_FILE = join(UI_DIR, 'theme', 'tokens.css');
const COLOR_LITERAL = /#[0-9a-f]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\s*\(/i;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

describe('tema', () => {
  it('no hay colores literales fuera de tokens.css', () => {
    const offenders = walk(UI_DIR)
      .filter((file) => /\.(css|tsx?)$/.test(file) && !/\.test\.tsx?$/.test(file))
      .filter((file) => file !== TOKENS_FILE)
      .filter((file) => COLOR_LITERAL.test(readFileSync(file, 'utf8')))
      .map((file) => relative(UI_DIR, file));
    expect(offenders).toEqual([]);
  });
});
