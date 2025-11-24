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

describe('babel - html`` component transformations', () => {
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

  test('does not wrap event handler function calls in components', () => {
    const code = `html\`<button onClick="\${getHandler()}">Click</button>\``;
    const out = transform(code);
    expect(out).toContain('onClick: getHandler()');
  });

  test('does not wrap event handler references in components', () => {
    const code = `html\`<button onClick="\${handleClick}">Click</button>\``;
    const out = transform(code);
    expect(out).toContain('onClick: handleClick');
  });

  test('does not wrap non-event attribute function calls in components', () => {
    const code = `html\`<div class="\${getClass()}" title="\${getTitle()}">Test</div>\``;
    const out = transform(code);
    expect(out).toContain('class: getClass()');
    expect(out).toContain('title: getTitle()');
  });

  test('handles mixed event and non-event attributes in components', () => {
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
    const htmlCode = `html\`<div id="foo">bar</div>\``;
    const htmlOut = transform(htmlCode);

    expect(htmlOut).toContain('tag: "div"');
    expect(htmlOut).toContain('id: "foo"');
    expect(htmlOut).toContain('"bar"');
  });

  test('parity: html`` matches JSX for component', () => {
    const htmlCode = `html\`<MyComp foo="bar" />\``;
    const htmlOut = transform(htmlCode);

    expect(htmlOut).toContain('MyComp({');
    expect(htmlOut).toContain('foo: "bar"');
  });

  test('parity: html`` matches JSX for no function wrapping', () => {
    const htmlCode = `html\`<div className="\${foo()}">\${bar()}</div>\``;
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

  test('ignores non-html tagged components', () => {
    const code = `css\`color: red;\``;
    const out = transform(code);
    expect(out).toContain('css`');
  });

  test('handles bare expression in component', () => {
    const code = `html\`\${component}\``;
    const out = transform(code);
    expect(out).toContain('component');
    expect(out).not.toContain('tag:');
  });

  test('handles number primitives in component attributes', () => {
    const code = `html\`<div data-count="\${42}" />\``;
    const out = transform(code);
    expect(out).toContain('42');
  });

  test('handles boolean primitives in component attributes', () => {
    const code = `html\`<input disabled="\${true}" />\``;
    const out = transform(code);
    expect(out).toContain('disabled: true');
  });
});

describe('babel - dynamic components', () => {
  test('transforms dynamic component in component syntax', () => {
    const code = `html\`<\${Component} foo="bar" />\``;
    const out = transform(code);
    expect(out).toContain('Component({');
    expect(out).toContain('foo: "bar"');
  });

  test('transforms dynamic component with children', () => {
    const code = `html\`<\${Wrapper}><div>Child</div></\${Wrapper}>\``;
    const out = transform(code);
    expect(out).toContain('Wrapper({');
    expect(out).toContain('children:');
  });
});

describe('babel - component attribute prefixes', () => {
  test('transforms @ prefix to bind in component syntax', () => {
    const code = `html\`<div @class="\${signal}" />\``;
    const out = transform(code);
    expect(out).toContain('bind: {');
    expect(out).toContain('class: signal');
  });

  test('transforms on: prefix in component syntax', () => {
    const code = `html\`<button on:click="\${handleClick}">Click</button>\``;
    const out = transform(code);
    expect(out).toContain('on: {');
    expect(out).toContain('click: handleClick');
  });
});

describe('babel - ForEach transformation', () => {
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

  test('handles ForEach in component component', () => {
    const code = `
      const List = component((props) => html\`
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
