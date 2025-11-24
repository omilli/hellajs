import { describe, expect, test } from 'bun:test';
import babel from '@babel/core';
import plugin from '../index.mjs';

function transform(code: string): string | undefined {
  return babel.transformSync(code, {
    plugins: [plugin],
    filename: 'test.js',
    babelrc: false,
    configFile: false,
  })?.code ?? undefined;
}

describe('babel - style transformations', () => {
  test('transforms <style> with boolean string options', () => {
    const code = `<style scoped="false">{ { color: 'blue' } }</style>`;
    const out = transform(code);
    expect(out).toContain('scoped: false');
    expect(out).toContain('css({');
    expect(out).toContain('color:');
  });

  test('transforms <style> with no options', () => {
    const code = `<style>{ { color: 'green' } }</style>`;
    const out = transform(code);
    expect(out).toContain('css({');
    expect(out).toContain('color:');
  });

  test('transforms <style> with non-string-literal attribute', () => {
    const code = `<style scoped={true}>{ { color: 'red' } }</style>`;
    const out = transform(code);
    // Should not include scoped at all, since only string literals are handled
    expect(out).toContain('css({');
    expect(out).not.toContain('scoped:');
  });

  test('transforms <style> to css()', () => {
    const code = `<style>{{ color: "red" }}</style>`;
    const out = transform(code);
    expect(out).toContain(`import { css } from "@hellajs/css"`);
    expect(out).toContain(`css({`);
  });

  test('transforms <style> with options', () => {
    const code = `<style scoped="true">{ { color: "red" } }</style>`;
    const out = transform(code);
    expect(out).toContain(`css({`);
    expect(out).toContain(`scoped: true`);
  });

  test('does not duplicate css import', () => {
    const code = `import { css } from "@hellajs/css"; <style>{{}}</style>`;
    const out = transform(code);
    const matches = out?.match(/import { css } from "@hellajs\/css"/g) || [];
    expect(matches.length).toBe(1);
  });
});
