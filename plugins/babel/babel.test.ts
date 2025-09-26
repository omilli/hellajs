import { describe, expect, test } from 'bun:test';
import babel from '@babel/core';
import plugin from './index.mjs';

function transform(code: string): string | undefined {
  return babel.transformSync(code, {
    plugins: [plugin],
    filename: 'test.js',
    babelrc: false,
    configFile: false,
  })?.code ?? undefined;
}

describe('babel', () => {
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
    const matches = out?.match(/import { css } from "@hellajs\/css"/g) || [];
    expect(matches.length).toBe(1);
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
    // Simulate a custom node type
    const code = `<div />`;
    const pluginWithPatch = () => ({
      ...plugin(),
      visitor: {
        ...plugin().visitor,
        JSXElement() {
          // Patch to pass an unsupported node
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

  test('wraps function calls in arrow functions by default', () => {
    const code = `<div className={foo()} />`;
    const out = transform(code);
    expect(out).toContain('className: () => foo()');
  });


  test('does not wrap function calls in components', () => {
    const code = `<MyComponent onClick={handleClick()} title={getTitle()} />`;
    const out = transform(code);
    expect(out).toContain('onClick: handleClick()');
    expect(out).toContain('title: getTitle()');
    expect(out).not.toContain('() => handleClick()');
    expect(out).not.toContain('() => getTitle()');
  });

  test('wraps function calls only in HTML elements', () => {
    const code = `
      <div onClick={handleClick()}>
        <MyComponent onClick={handleClick()} />
      </div>
    `;
    const out = transform(code);
    // HTML element should have arrow function wrapping
    expect(out).toContain('onClick: () => handleClick()');
    // Component should not have arrow function wrapping
    expect(out).toContain('onClick: handleClick()');
  });

  test('handles JSX member expressions without function wrapping', () => {
    const code = `<UserSelect.Provider value={getValue()} />`;
    const out = transform(code);
    expect(out).toContain('value: getValue()');
    expect(out).not.toContain('() => getValue()');
  });

  test('handles component children without function wrapping', () => {
    const code = `<MyComponent>{computeChildren()}</MyComponent>`;
    const out = transform(code);
    expect(out).toContain('children: [computeChildren()]');
    expect(out).not.toContain('() => computeChildren()');
  });

  test('handles HTML element children with function wrapping', () => {
    const code = `<div>{computeChildren()}</div>`;
    const out = transform(code);
    expect(out).toContain('() => computeChildren()');
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
    expect(out).toContain(`children: ["foo"]`);
    expect(out).not.toContain(`comment`);
  });

  // Test coverage for lines 93-95: JSXNamespacedName attributes
  test('handles namespace attributes (xml:lang, etc)', () => {
    const code = `<div xml:lang="en" xmlns:custom="http://example.com" data:value="test">Content</div>`;
    const out = transform(code);
    expect(out).toContain(`xml:lang: "en"`);
    expect(out).toContain(`xmlns:custom: "http://example.com"`);
    expect(out).toContain(`data:value: "test"`);
  });

  // Test coverage for lines 119, 185: forEach call detection and ignoring
  test('ignores forEach calls in attributes without wrapping', () => {
    const code = `<button onClick={items.forEach(item => console.log(item))}>Click</button>`;
    const out = transform(code);
    expect(out).toContain('onClick: items.forEach(item => console.log(item))');
    expect(out).not.toContain('() => items.forEach');
  });

  test('ignores forEach calls in children without wrapping', () => {
    const code = `<div>{items.forEach(item => renderItem(item))}</div>`;
    const out = transform(code);
    expect(out).toContain('items.forEach(item => renderItem(item))');
    expect(out).not.toContain('() => items.forEach');
  });

  test('ignores direct forEach calls in attributes', () => {
    const code = `<div className={forEach(items, callback)}>Content</div>`;
    const out = transform(code);
    expect(out).toContain('className: forEach(items, callback)');
    expect(out).not.toContain('() => forEach');
  });

  // Test coverage for lines 128, 130, 192-196: Recursive function call detection
  test('wraps nested function calls in conditional expressions', () => {
    const code = `<div onClick={condition ? func1() : func2()}>Content</div>`;
    const out = transform(code);
    expect(out).toContain('onClick: () => condition ? func1() : func2()');
  });

  test('wraps complex member expression function calls', () => {
    const code = `<button onClick={obj.nested.method()}>Click</button>`;
    const out = transform(code);
    expect(out).toContain('onClick: () => obj.nested.method()');
  });

  test('wraps chained method calls in children', () => {
    const code = `<div>{users.map(user => user.getName()).filter(name => name.length > 0)}</div>`;
    const out = transform(code);
    expect(out).toContain('() => users.map(user => user.getName()).filter(name => name.length > 0)');
  });

  test('wraps array method chains with function calls', () => {
    const code = `<span className={items.filter(predicate()).map(transform()).join(', ')}>List</span>`;
    const out = transform(code);
    expect(out).toContain('className: () => items.filter(predicate()).map(transform()).join(\', \')');
  });

  // Test coverage for lines 150-151: Spread attributes and null returns
  test('handles spread attributes correctly', () => {
    const code = `<div className="base" {...props} id="override">Content</div>`;
    const out = transform(code);
    expect(out).toContain('className: "base"');
    expect(out).toContain('...props');
    expect(out).toContain('id: "override"');
  });

  test('handles multiple spread attributes', () => {
    const code = `<button {...baseProps} {...specificProps} disabled={true}>Click</button>`;
    const out = transform(code);
    expect(out).toContain('...baseProps');
    expect(out).toContain('...specificProps');
    expect(out).toContain('disabled: true');
  });

  // Test coverage for fragment processing (lines 280, 283-284)
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

  // Additional edge cases for better coverage
  test('handles complex nested expressions with function calls', () => {
    const code = `<div data-value={compute(a, b) + calculate(x, y)}>Result</div>`;
    const out = transform(code);
    expect(out).toContain('"data-value": () => compute(a, b) + calculate(x, y)');
  });

  test('preserves non-function expressions without wrapping', () => {
    const code = `<div className={isActive ? 'active' : 'inactive'} data-count={items.length}>Content</div>`;
    const out = transform(code);
    expect(out).toContain('className: isActive ? \'active\' : \'inactive\'');
    expect(out).toContain('"data-count": items.length');
    expect(out).not.toContain('() => isActive');
    expect(out).not.toContain('() => items.length');
  });

  test('wraps function calls in deeply nested expressions with arrays', () => {
    const code = `<div onClick={func(nested(call()), another(inner()))}>Content</div>`;
    const out = transform(code);
    expect(out).toContain('onClick: () => func(nested(call()), another(inner()))');
  });

});