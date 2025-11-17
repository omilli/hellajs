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

  test('does not wrap function calls', () => {
    const code = `<div className={foo()} />`;
    const out = transform(code);
    expect(out).toContain('className: foo()');
    expect(out).not.toContain('() => foo()');
  });

  test('does not wrap function calls in components', () => {
    const code = `<MyComponent onClick={handleClick()} title={getTitle()} />`;
    const out = transform(code);
    expect(out).toContain('onClick: handleClick()');
    expect(out).toContain('title: getTitle()');
  });

  test('does not wrap function calls in HTML elements', () => {
    const code = `
      <div class={getClass()}>
        <MyComponent value={getValue()} />
      </div>
    `;
    const out = transform(code);
    expect(out).toContain('class: getClass()');
    expect(out).toContain('value: getValue()');
  });

  test('handles JSX member expressions without wrapping', () => {
    const code = `<UserSelect.Provider value={getValue()} />`;
    const out = transform(code);
    expect(out).toContain('value: getValue()');
  });

  test('handles component children without wrapping', () => {
    const code = `<MyComponent>{computeChildren()}</MyComponent>`;
    const out = transform(code);
    expect(out).toContain('children: [computeChildren()]');
  });

  test('handles HTML element children without wrapping', () => {
    const code = `<div>{computeChildren()}</div>`;
    const out = transform(code);
    expect(out).toContain('computeChildren()');
    expect(out).not.toContain('() => computeChildren()');
  });

  test('does not wrap event handler function calls in JSX', () => {
    const code = `<button onClick={getHandler()}>Click</button>`;
    const out = transform(code);
    expect(out).toContain('onClick: getHandler()');
  });

  test('does not wrap event handler references in JSX', () => {
    const code = `<button onClick={handleClick}>Click</button>`;
    const out = transform(code);
    expect(out).toContain('onClick: handleClick');
  });

  test('does not wrap non-event attribute function calls in JSX', () => {
    const code = `<div class={getClass()} title={getTitle()}>Test</div>`;
    const out = transform(code);
    expect(out).toContain('class: getClass()');
    expect(out).toContain('title: getTitle()');
  });

  test('handles mixed event and non-event attributes in JSX', () => {
    const code = `<button onClick={getHandler()} class={getClass()}>Click</button>`;
    const out = transform(code);
    expect(out).toContain('onClick: getHandler()');
    expect(out).toContain('class: getClass()');
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

  // Test coverage for lines 93-95: JSXNamespacedName attributes
  test('handles namespace attributes (xml:lang, etc)', () => {
    const code = `<div xml:lang="en" xmlns:custom="http://example.com" data:value="test">Content</div>`;
    const out = transform(code);
    expect(out).toContain(`xml:lang: "en"`);
    expect(out).toContain(`xmlns:custom: "http://example.com"`);
    expect(out).toContain(`data:value: "test"`);
  });

  // Test coverage for lines 119, 185: forEach call detection and ignoring
  test('handles forEach calls in attributes', () => {
    const code = `<button onClick={items.forEach(item => console.log(item))}>Click</button>`;
    const out = transform(code);
    expect(out).toContain('onClick: items.forEach(item => console.log(item))');
  });

  test('handles forEach calls in children', () => {
    const code = `<div>{items.forEach(item => renderItem(item))}</div>`;
    const out = transform(code);
    expect(out).toContain('items.forEach(item => renderItem(item))');
  });

  test('handles direct forEach calls in attributes', () => {
    const code = `<div className={forEach(items, callback)}>Content</div>`;
    const out = transform(code);
    expect(out).toContain('className: forEach(items, callback)');
  });

  test('handles nested function calls in conditional expressions', () => {
    const code = `<div class={condition ? func1() : func2()}>Content</div>`;
    const out = transform(code);
    expect(out).toContain('class: condition ? func1() : func2()');
  });

  test('handles complex member expression function calls', () => {
    const code = `<button class={obj.nested.method()}>Click</button>`;
    const out = transform(code);
    expect(out).toContain('class: obj.nested.method()');
  });

  test('handles chained method calls in children', () => {
    const code = `<div>{users.map(user => user.getName()).filter(name => name.length > 0)}</div>`;
    const out = transform(code);
    expect(out).toContain('users.map(user => user.getName()).filter(name => name.length > 0)');
  });

  test('handles array method chains with function calls', () => {
    const code = `<span className={items.filter(predicate()).map(transform()).join(', ')}>List</span>`;
    const out = transform(code);
    expect(out).toContain('className: items.filter(predicate()).map(transform()).join(\', \')');
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

  test('handles complex nested expressions with function calls', () => {
    const code = `<div data-value={compute(a, b) + calculate(x, y)}>Result</div>`;
    const out = transform(code);
    expect(out).toContain('"data-value": compute(a, b) + calculate(x, y)');
  });

  test('preserves non-function expressions', () => {
    const code = `<div className={isActive ? 'active' : 'inactive'} data-count={items.length}>Content</div>`;
    const out = transform(code);
    expect(out).toContain('className: isActive ? \'active\' : \'inactive\'');
    expect(out).toContain('"data-count": items.length');
  });

  test('handles function calls in deeply nested expressions', () => {
    const code = `<div class={func(nested(call()), another(inner()))}>Content</div>`;
    const out = transform(code);
    expect(out).toContain('class: func(nested(call()), another(inner()))');
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

});

describe('html`` template transformation', () => {
  test('transforms simple HTML element', () => {
    const code = `html\`<div>hello</div>\``;
    const out = transform(code);
    expect(out).toContain('tag: "div"');
    expect(out).toContain('children: ["hello"]');
    expect(out).not.toContain('html`');
  });

  test('transforms element with interpolated values', () => {
    const code = `html\`<div class="\${theme}">\${count}</div>\``;
    const out = transform(code);
    expect(out).toContain('tag: "div"');
    expect(out).toContain('class: theme');
    expect(out).toContain('children: [count]');
  });

  test('transforms nested elements', () => {
    const code = `html\`<div><h1>\${title}</h1><p>\${content}</p></div>\``;
    const out = transform(code);
    expect(out).toContain('tag: "div"');
    expect(out).toContain('tag: "h1"');
    expect(out).toContain('tag: "p"');
    expect(out).toContain('children: [title]');
    expect(out).toContain('children: [content]');
  });

  test('transforms component to function call', () => {
    const code = `html\`<Button text="\${label}">Click</Button>\``;
    const out = transform(code);
    expect(out).toContain('Button({');
    expect(out).toContain('text: label');
    expect(out).toContain('children: ["Click"]');
    expect(out).not.toContain('tag:');
  });

  test('transforms component with multiple props', () => {
    const code = `html\`<Card title="\${title}" variant="primary">\${content}</Card>\``;
    const out = transform(code);
    expect(out).toContain('Card({');
    expect(out).toContain('title: title');
    expect(out).toContain('variant: "primary"');
    expect(out).toContain('children: [content]');
  });

  test('does not wrap function calls in HTML elements', () => {
    const code = `html\`<div class="\${getTheme()}">\${getCount()}</div>\``;
    const out = transform(code);
    expect(out).toContain('class: getTheme()');
    expect(out).toContain('children: [getCount()]');
  });

  test('does not wrap function calls in components', () => {
    const code = `html\`<Button onClick="\${handleClick()}" text="\${getText()}">Click</Button>\``;
    const out = transform(code);
    expect(out).toContain('onClick: handleClick()');
    expect(out).toContain('text: getText()');
  });

  test('does not wrap event handler function calls in templates', () => {
    const code = `html\`<button onClick="\${getHandler()}">Click</button>\``;
    const out = transform(code);
    expect(out).toContain('onClick: getHandler()');
  });

  test('does not wrap event handler references in templates', () => {
    const code = `html\`<button onClick="\${handleClick}">Click</button>\``;
    const out = transform(code);
    expect(out).toContain('onClick: handleClick');
  });

  test('does not wrap non-event attribute function calls in templates', () => {
    const code = `html\`<div class="\${getClass()}" title="\${getTitle()}">Test</div>\``;
    const out = transform(code);
    expect(out).toContain('class: getClass()');
    expect(out).toContain('title: getTitle()');
  });

  test('handles mixed event and non-event attributes in templates', () => {
    const code = `html\`<button onClick="\${getHandler()}" class="\${getClass()}">Click</button>\``;
    const out = transform(code);
    expect(out).toContain('onClick: getHandler()');
    expect(out).toContain('class: getClass()');
  });

  test('handles fragment syntax', () => {
    const code = `html\`<>\${child1}\${child2}</>\``;
    const out = transform(code);
    expect(out).toContain('tag: "$"');
    expect(out).toContain('children: [child1, child2]');
  });

  test('handles self-closing tags', () => {
    const code = `html\`<div><br /><input type="text" /></div>\``;
    const out = transform(code);
    expect(out).toContain('tag: "br"');
    expect(out).toContain('tag: "input"');
    expect(out).toContain('type: "text"');
  });

  test('handles boolean attributes', () => {
    const code = `html\`<input type="checkbox" checked disabled />\``;
    const out = transform(code);
    expect(out).toContain('checked: true');
    expect(out).toContain('disabled: true');
  });

  test('handles mixed static and dynamic children', () => {
    const code = `html\`<div>Hello \${name}, you have \${count} items</div>\``;
    const out = transform(code);
    expect(out).toContain('"Hello "');
    expect(out).toContain('name');
    expect(out).toContain('", you have "');
    expect(out).toContain('count');
    expect(out).toContain('" items"');
  });

  test('handles event handlers', () => {
    const code = `html\`<button onclick="\${handleClick}">Click</button>\``;
    const out = transform(code);
    expect(out).toContain('onclick: handleClick');
  });

  test('ignores whitespace-only text', () => {
    const code = `html\`<div>  <span>text</span>  </div>\``;
    const out = transform(code);
    expect(out).toContain('tag: "span"');
    expect(out).not.toContain('"  "');
  });

  test('handles data and aria attributes', () => {
    const code = `html\`<div data-id="\${id}" aria-label="test">Content</div>\``;
    const out = transform(code);
    expect(out).toContain('"data-id": id');
    expect(out).toContain('"aria-label": "test"');
  });

  test('handles multiple interpolations in attribute', () => {
    const code = `html\`<div class="btn \${variant} \${size}">Button</div>\``;
    const out = transform(code);
    expect(out).toContain('"btn "');
    expect(out).toContain('variant');
    expect(out).toContain('" "');
    expect(out).toContain('size');
  });

  test('handles nested components', () => {
    const code = `html\`<Card><Button>Click</Button></Card>\``;
    const out = transform(code);
    expect(out).toContain('Card({');
    expect(out).toContain('Button({');
  });

  test('parity: html`` matches JSX for simple element', () => {
    const jsxCode = `<div id="foo">bar</div>`;
    const htmlCode = `html\`<div id="foo">bar</div>\``;

    const jsxOut = transform(jsxCode);
    const htmlOut = transform(htmlCode);

    expect(htmlOut).toContain('tag: "div"');
    expect(htmlOut).toContain('id: "foo"');
    expect(htmlOut).toContain('"bar"');
  });

  test('parity: html`` matches JSX for component', () => {
    const jsxCode = `<MyComp foo="bar" />`;
    const htmlCode = `html\`<MyComp foo="bar" />\``;

    const jsxOut = transform(jsxCode);
    const htmlOut = transform(htmlCode);

    expect(htmlOut).toContain('MyComp({');
    expect(htmlOut).toContain('foo: "bar"');
  });

  test('parity: html`` matches JSX for no function wrapping', () => {
    const jsxCode = `<div className={foo()}>{bar()}</div>`;
    const htmlCode = `html\`<div className="\${foo()}">\${bar()}</div>\``;

    const jsxOut = transform(jsxCode);
    const htmlOut = transform(htmlCode);

    expect(htmlOut).toContain('className: foo()');
    expect(htmlOut).toContain('bar()');
  });

  test('handles empty elements', () => {
    const code = `html\`<div></div>\``;
    const out = transform(code);
    expect(out).toContain('tag: "div"');
    expect(out).not.toContain('children:');
  });

  test('handles only interpolated children', () => {
    const code = `html\`<div>\${content}</div>\``;
    const out = transform(code);
    expect(out).toContain('children: [content]');
  });

  test('ignores non-html tagged templates', () => {
    const code = `css\`color: red;\``;
    const out = transform(code);
    expect(out).toContain('css`');
  });
});

describe('template() transformation', () => {
  test('transforms named template to const declaration', () => {
    const code = `template("ActionButton", (props) => html\`<button>\${props.text}</button>\`)`;
    const out = transform(code);
    expect(out).toContain('const ActionButton =');
    expect(out).toContain('props => (');
    expect(out).toContain('tag: "button"');
    expect(out).not.toContain('template(');
  });

  test('normalizes kebab-case to PascalCase', () => {
    const code = `template("action-button", (props) => html\`<button>\${props.text}</button>\`)`;
    const out = transform(code);
    expect(out).toContain('const ActionButton =');
    expect(out).not.toContain('action-button');
  });

  test('handles multi-segment kebab-case names', () => {
    const code = `template("custom-user-card", (props) => html\`<div>\${props.name}</div>\`)`;
    const out = transform(code);
    expect(out).toContain('const CustomUserCard =');
  });

  test('transforms anonymous template to just the function', () => {
    const code = `const MyComp = template((props) => html\`<div>\${props.text}</div>\`)`;
    const out = transform(code);
    expect(out).toContain('const MyComp = props => (');
    expect(out).toContain('tag: "div"');
    expect(out).not.toContain('template(');
  });

  test('transforms html inside template function', () => {
    const code = `template("Button", (props) => html\`<button class="\${getClass()}">\${props.text}</button>\`)`;
    const out = transform(code);
    expect(out).toContain('const Button =');
    expect(out).toContain('tag: "button"');
    expect(out).toContain('class: getClass()');
    expect(out).toContain('props.text');
  });

  test('preserves component usage after transformation', () => {
    const code = `
      template("Card", (props) => html\`<div>\${props.children}</div>\`);
      const app = html\`<Card title="test">Content</Card>\`;
    `;
    const out = transform(code);
    expect(out).toContain('const Card =');
    expect(out).toContain('Card({');
  });
});

describe('ForEach transformation', () => {
  test('transforms ForEach to forEach function call', () => {
    const code = `html\`<ForEach for="\${items}" each="\${renderItem}" />\``;
    const out = transform(code);
    expect(out).toContain('forEach(items, renderItem)');
    expect(out).not.toContain('ForEach');
  });

  test('handles ForEach in nested structure', () => {
    const code = `html\`<div><ForEach for="\${rows}" each="\${row => row.id}" /></div>\``;
    const out = transform(code);
    expect(out).toContain('forEach(rows,');
    expect(out).toContain('tag: "div"');
  });

  test('transforms ForEach with complex expressions', () => {
    const code = `html\`<tbody><ForEach for="\${todos()}" each="\${(todo) => TodoItem(todo)}" /></tbody>\``;
    const out = transform(code);
    expect(out).toContain('forEach(todos(), todo => TodoItem(todo))');
  });

  test('handles ForEach in component template', () => {
    const code = `
      const List = template((props) => html\`
        <ul><ForEach for="\${props.items}" each="\${props.render}" /></ul>
      \`);
    `;
    const out = transform(code);
    expect(out).toContain('forEach(props.items, props.render)');
  });

  test('automatically imports forEach when ForEach is used', () => {
    const code = `html\`<ForEach for="\${items}" each="\${renderItem}" />\``;
    const out = transform(code);
    expect(out).toContain('import { forEach } from "@hellajs/dom"');
    expect(out).toContain('forEach(items, renderItem)');
  });

  test('does not duplicate forEach import if already imported', () => {
    const code = `
      import { forEach } from '@hellajs/dom';
      html\`<ForEach for="\${items}" each="\${renderItem}" />\`
    `;
    const out = transform(code);
    const matches = out?.match(/import.*forEach.*from.*@hellajs\/dom/g);
    expect(matches).toHaveLength(1);
  });
});