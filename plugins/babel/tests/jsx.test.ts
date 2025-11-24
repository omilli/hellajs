import { describe, expect, test } from 'bun:test';
import babel from '@babel/core';
import plugin, { preprocessJSX } from '../index.mjs';

function transform(code: string): string | undefined {
  const preprocessed = preprocessJSX(code);
  return babel.transformSync(preprocessed, {
    plugins: [plugin],
    filename: 'test.js',
    babelrc: false,
    configFile: false,
  })?.code ?? undefined;
}

describe('babel - JSX transformations', () => {
  test('transforms HTML JSX to HellaNode object', () => {
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
    expect(out).toContain(`children: ["child"]`);
  });

  test('handles multiple children for components', () => {
    const code = `<MyComp><span /><span /></MyComp>`;
    const out = transform(code);
    expect(out).toContain(`children: [`);
  });

  test('handles props with JSX expressions', () => {
    const code = `<div id={myId} />`;
    const out = transform(code);
    expect(out).toContain('id: myId');
  });

  test('ignores whitespace-only text nodes', () => {
    const code = `<div>  <span/>  </div>`;
    const out = transform(code);
    expect(out).not.toContain('" "');
    expect(out).toContain('children: [{');
  });

  test('throws on unsupported JSXNamespacedName tag type', () => {
    const code = `<namespace:tag />`;
    expect(() => transform(code)).toThrow("Unsupported JSX tag type");
  });

  test('transforms JSX fragments to HellaNode fragment object', () => {
    const code = `<><span>foo</span></>`;
    const out = transform(code);
    expect(out).toContain(`tag: "$"`);
    expect(out).toContain(`children: [`);
    expect(out).toContain(`tag: "span"`);
  });

  test('throws on unsupported JSX tag type', () => {
    const code = `<div />`;
    const pluginWithPatch = () => ({
      ...plugin(),
      visitor: {
        ...plugin().visitor,
        JSXElement() {
          function getTagCallee(_: any) {
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

  test('bypasses props when no attributes present', () => {
    const code = `<div>hello</div>`;
    const out = transform(code);
    expect(out).toContain(`tag: "div"`);
    expect(out).not.toContain(`props:`);
    expect(out).toContain(`children: ["hello"]`);
  });

  test('includes props only when attributes exist', () => {
    const code = `<div id="test">hello</div>`;
    const out = transform(code);
    expect(out).toContain(`tag: "div"`);
    expect(out).toContain(`props: {`);
    expect(out).toContain(`id: "test"`);
    expect(out).toContain(`children: ["hello"]`);
  });

  test('fragments bypass empty props entirely', () => {
    const code = `<><span>foo</span></>`;
    const out = transform(code);
    expect(out).toContain(`tag: "$"`);
    expect(out).not.toContain(`props:`);
    expect(out).toContain(`children: [`);
  });

  test('strips empty children from HTML elements', () => {
    const code = `<div>  {/* comment */}  </div>`;
    const out = transform(code);
    expect(out).toContain(`tag: "div"`);
    expect(out).not.toContain(`children:`);
    expect(out).not.toContain(`comment`);
  });

  test('strips empty children from fragments', () => {
    const code = `<>  {/* comment */}  </>`;
    const out = transform(code);
    expect(out).toContain(`tag: "$"`);
    expect(out).not.toContain(`children:`);
    expect(out).not.toContain(`comment`);
  });

  test('strips empty children from components', () => {
    const code = `<MyComponent>  {/* comment */}  </MyComponent>`;
    const out = transform(code);
    expect(out).toContain(`MyComponent({})`);
    expect(out).not.toContain(`children:`);
    expect(out).not.toContain(`comment`);
  });

  test('handles mixed empty and valid children', () => {
    const code = `<div>  {/* comment */}  foo  {/* another comment */}  </div>`;
    const out = transform(code);
    expect(out).toContain(`tag: "div"`);
    expect(out).toContain(`children: [" foo "]`);
    expect(out).not.toContain(`comment`);
  });

  test('preserves spaces in inline HTML text', () => {
    const code = `<p>Foo <span>Bar</span></p>`;
    const out = transform(code);
    expect(out).toContain('"Foo "');
    expect(out).toContain('"Bar"');
  });

  test('normalizes multiple spaces to single space', () => {
    const code = `<p>Foo    <span>Bar</span></p>`;
    const out = transform(code);
    expect(out).toContain('children: ["Foo "');
  });

  test('processes fragments with mixed content types', () => {
    const code = `<>
      <header>Title</header>
      {/* This comment gets filtered */}
      {userName}
      <main>Content</main>
    </>`;
    const out = transform(code);
    expect(out).toContain(`tag: "$"`);
    expect(out).toContain('tag: "header"');
    expect(out).toContain('tag: "main"');
    expect(out).toContain('userName');
    expect(out).not.toContain('comment');
  });

  test('handles fragments with conditional expressions', () => {
    const code = `<>
      {userName}
      {isLoggedIn ? 'Welcome' : 'Please login'}
      <footer>Footer</footer>
    </>`;
    const out = transform(code);
    expect(out).toContain(`tag: "$"`);
    expect(out).toContain('userName');
    expect(out).toContain("isLoggedIn ? 'Welcome' : 'Please login'");
    expect(out).toContain('tag: "footer"');
  });

  test('filters empty strings and whitespace in fragments', () => {
    const code = `<>
      {someVar}
      <span>Real content</span>
    </>`;
    const out = transform(code);
    expect(out).toContain(`tag: "$"`);
    expect(out).toContain('tag: "span"');
    expect(out).toContain('"Real content"');
    expect(out).toContain('someVar');
  });
});

describe('babel - JSX children spreading', () => {
  test('spreads props.children in JSX', () => {
    const code = `<Wrapper>{props.children}</Wrapper>`;
    const out = transform(code);
    expect(out).toContain('children: [...props.children]');
  });

  test('combines static and spread children', () => {
    const code = `<div><span>Static</span>{props.children}</div>`;
    const out = transform(code);
    expect(out).toContain('...props.children');
  });
});
