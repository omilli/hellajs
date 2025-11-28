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

describe('babel - import management', () => {
  describe('componentScope imports', () => {
    test('adds componentScope import for JSX components', () => {
      const code = `<MyComponent />`;
      const out = transform(code);
      expect(out).toContain('import { componentScope } from "@hellajs/dom"');
    });

    test('adds componentScope import for html`` components', () => {
      const code = `html\`<MyComponent />\``;
      const out = transform(code);
      expect(out).toContain('import { componentScope } from "@hellajs/dom"');
    });

    test('does not duplicate componentScope import', () => {
      const code = `import { componentScope } from "@hellajs/dom"; <MyComponent />`;
      const out = transform(code);
      const matches = out?.match(/import.*componentScope.*from "@hellajs\/dom"/g) || [];
      expect(matches.length).toBe(1);
    });
  });

  describe('ForEach imports', () => {
    test('adds ForEach import for JSX ForEach usage', () => {
      const code = `<ForEach for={items} each={item => <div>{item}</div>} />`;
      const out = transform(code);
      expect(out).toContain('import { ForEach } from "@hellajs/dom"');
    });

    test('adds ForEach import for html`` ForEach usage', () => {
      const code = `html\`<ForEach for="\${items}" each="\${item => item}" />\``;
      const out = transform(code);
      expect(out).toContain('import { ForEach } from "@hellajs/dom"');
    });

    test('adds ForEach to existing @hellajs/dom import', () => {
      const code = `import { mount } from "@hellajs/dom"; <ForEach for={items} each={item => <div />} />`;
      const out = transform(code);
      expect(out).toContain('ForEach');
      // Should add to existing import, not create new one
      const domImports = out?.match(/from "@hellajs\/dom"/g) || [];
      expect(domImports.length).toBe(1);
    });

    test('does not duplicate ForEach import', () => {
      const code = `import { ForEach } from "@hellajs/dom"; <ForEach for={items} each={item => <div />} />`;
      const out = transform(code);
      const matches = out?.match(/ForEach/g) || [];
      // One in import, one in call
      expect(matches.length).toBe(2);
    });
  });

  describe('Portal imports', () => {
    test('adds Portal import for JSX Portal usage', () => {
      const code = `<Portal target="#modal"><div>Content</div></Portal>`;
      const out = transform(code);
      expect(out).toContain('import { Portal } from "@hellajs/dom"');
    });

    test('adds Portal import for html`` Portal usage', () => {
      const code = `html\`<Portal target="#modal"><div>Content</div></Portal>\``;
      const out = transform(code);
      expect(out).toContain('import { Portal } from "@hellajs/dom"');
    });

    test('adds Portal to existing @hellajs/dom import', () => {
      const code = `import { mount } from "@hellajs/dom"; <Portal target="#modal"><div /></Portal>`;
      const out = transform(code);
      expect(out).toContain('Portal');
      // Should add to existing import, not create new one
      const domImports = out?.match(/from "@hellajs\/dom"/g) || [];
      expect(domImports.length).toBe(1);
    });

    test('does not duplicate Portal import', () => {
      const code = `import { Portal } from "@hellajs/dom"; <Portal target="#modal"><div /></Portal>`;
      const out = transform(code);
      const matches = out?.match(/Portal/g) || [];
      // One in import, one in call
      expect(matches.length).toBe(2);
    });
  });

  describe('css imports', () => {
    test('adds css import for style tag', () => {
      const code = `<style>{{ color: "red" }}</style>`;
      const out = transform(code);
      expect(out).toContain('import { css } from "@hellajs/css"');
    });

    test('does not duplicate css import', () => {
      const code = `import { css } from "@hellajs/css"; <style>{{ color: "red" }}</style>`;
      const out = transform(code);
      const matches = out?.match(/import { css } from "@hellajs\/css"/g) || [];
      expect(matches.length).toBe(1);
    });
  });

  describe('mixed imports', () => {
    test('handles ForEach and Portal together', () => {
      const code = `<><ForEach for={items} each={item => <div />} /><Portal target="#modal"><span /></Portal></>`;
      const out = transform(code);
      expect(out).toContain('ForEach');
      expect(out).toContain('Portal');
    });

    test('handles multiple passthrough components with existing dom import', () => {
      const code = `import { html } from "@hellajs/dom"; <ForEach for={items} each={item => <Portal target="#modal"><div /></Portal>} />`;
      const out = transform(code);
      expect(out).toContain('ForEach');
      expect(out).toContain('Portal');
      // Only one dom import statement
      const domImports = out?.match(/from "@hellajs\/dom"/g) || [];
      expect(domImports.length).toBe(1);
    });
  });
});
