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

describe('babel - component() transformation', () => {
  test('transforms component call to just the function', () => {
    const code = `const MyComp = component((props) => html\`<div>\${props.text}</div>\`)`;
    const out = transform(code);
    expect(out).toContain('const MyComp = props => (');
    expect(out).toContain('tag: "div"');
    expect(out).not.toContain('component(');
  });

  test('transforms html inside component function', () => {
    const code = `const Button = component((props) => html\`<button class="\${getClass()}">\${props.text}</button>\`)`;
    const out = transform(code);
    expect(out).toContain('const Button = props => (');
    expect(out).toContain('tag: "button"');
    expect(out).toContain('class: getClass()');
    expect(out).toContain('props.text');
  });

  test('transforms component with pre-defined function', () => {
    const code = `
      function renderButton(props) {
        return html\`<button>\${props.text}</button>\`;
      }
      const Button = component(renderButton);
    `;
    const out = transform(code);
    expect(out).toContain('const Button = renderButton');
    expect(out).not.toContain('component(');
  });
});
