import { describe, expect, test } from 'bun:test';
import babel from '@babel/core';
import plugin from './index.mjs';

function transform(code) {
  return babel.transformSync(code, {
    plugins: [plugin],
    filename: 'test.js',
    babelrc: false,
    configFile: false,
  }).code;
}

describe('babel plugin', () => {
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
  test('transforms HTML JSX to VNode object', () => {
    const code = `<div id="foo">bar</div>`;
    const out = transform(code);
    expect(out).toContain(`tag: "div"`);
    expect(out).toContain(`props: {`);
    expect(out).toContain(`children: [`);
    expect(out).toContain(`"bar"`);
  });

  test('transforms component JSX to function call', () => {
    const code = `<MyComp foo="bar" />`;
    const out = transform(code);
    expect(out).toContain(`MyComp({`);
  });

  test('transforms JSXMemberExpression', () => {
    const code = `<UserSelect.Provider foo="bar" />`;
    const out = transform(code);
    expect(out).toContain(`UserSelect.Provider({`);
  });

  test('handles children for components', () => {
    const code = `<MyComp>child</MyComp>`;
    const out = transform(code);
    expect(out).toContain(`children: "child"`);
  });

  test('handles multiple children for components', () => {
    const code = `<MyComp><span /><span /></MyComp>`;
    const out = transform(code);
    expect(out).toContain(`children: [`);
  });

  test('handles data/aria kebab-case', () => {
    const code = `<div dataFoo="bar" ariaLabel="baz" />`;
    const out = transform(code);
    expect(out).toContain(`"data-foo"`);
    expect(out).toContain(`"aria-label"`);
  });

  test('handles spread attributes', () => {
    const code = `<div {...props} />`;
    const out = transform(code);
    expect(out).toContain(`...props`);
  });

  test('handles props with JSX expressions', () => {
    const code = `<div id={myId} />`;
    const out = transform(code);
    expect(out).toContain('id: myId');
  });

  test('ignores whitespace-only text nodes', () => {
    const code = `<div>  <span/>  </div>`;
    const out = transform(code);
    expect(out).not.toContain('\" \"');
    expect(out).toContain('children: [{');
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
    expect(out.match(/import { css } from "@hellajs\/css"/g).length).toBe(1);
  });

  test('throws on unsupported JSXNamespacedName tag type', () => {
    const code = `<namespace:tag />`;
    expect(() => transform(code)).toThrow("Unsupported JSX tag type");
  });

  test('transforms JSX fragments to VNode fragment object', () => {
    const code = `<><span>foo</span></>`;
    const out = transform(code);
    expect(out).toContain(`tag: "$"`);
    expect(out).toContain(`props: {}`);
    expect(out).toContain(`children: [`);
    expect(out).toContain(`tag: "span"`);
  });

  test('throws on unsupported JSX tag type', () => {
    // Simulate a custom node type
    const code = `<div />`;
    const pluginWithPatch = () => ({
      ...plugin(),
      visitor: {
        ...plugin().visitor,
        JSXElement(path) {
          // Patch to pass an unsupported node
          function getTagCallee(nameNode) {
            throw new Error("Unsupported JSX tag type");
          }
          getTagCallee({ type: "Unknown" });
        }
      }
    });
    expect(() => {
      babel.transformSync(code, {
        plugins: [pluginWithPatch],
        filename: 'test.js',
        babelrc: false,
        configFile: false,
      });
    }).toThrow("Unsupported JSX tag type");
  });

  test('ignores JSX comments in elements', () => {
    const code = `<div>{/* comment */}foo{/* bar */}</div>`;
    const out = transform(code);
    expect(out).toContain('"foo"');
    expect(out).not.toContain('comment');
    expect(out).not.toContain('bar');
  });

  test('ignores JSX comments in fragments', () => {
    const code = `<>foo{/* comment */}<span />{/* bar */}</>`;
    const out = transform(code);
    expect(out).toContain('"foo"');
    expect(out).toContain(`tag: "$"`);
    expect(out).not.toContain('comment');
    expect(out).not.toContain('bar');
  });
});