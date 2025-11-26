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

describe('babel - attribute handling', () => {
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

  test('handles namespace attributes (xml:lang, etc)', () => {
    const code = `<div xml:lang="en" xmlns:custom="http://example.com" data:value="test">Content</div>`;
    const out = transform(code);
    expect(out).toContain(`xml:lang: "en"`);
    expect(out).toContain(`xmlns:custom: "http://example.com"`);
    expect(out).toContain(`data:value: "test"`);
  });

  test('handles null attribute values in JSX', () => {
    const code = '<input disabled />';
    const out = transform(code);
    expect(out).toContain('disabled: true');
  });

  test('handles mixed static and dynamic content in attributes', () => {
    const code = 'html`<div class="prefix-${dynamic}-suffix" />`';
    const out = transform(code);
    expect(out).toContain('class:');
    expect(out).toContain('"prefix-"');
    expect(out).toContain('dynamic');
    expect(out).toContain('"-suffix"');
  });
});

describe('babel - function call handling', () => {
  test('does not wrap function calls', () => {
    const code = `<div className={foo()} />`;
    const out = transform(code);
    expect(out).toContain('className: foo()');
    expect(out).not.toContain('() => foo()');
  });

  test('does not wrap function calls in components', () => {
    const code = `<MyComponent on:click={handleClick()} title={getTitle()} />`;
    const out = transform(code);
    expect(out).toContain('click: handleClick()');
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
    const code = `<button on:click={getHandler()}>Click</button>`;
    const out = transform(code);
    expect(out).toContain('click: getHandler()');
  });

  test('does not wrap event handler references in JSX', () => {
    const code = `<button on:click={handleClick}>Click</button>`;
    const out = transform(code);
    expect(out).toContain('click: handleClick');
  });

  test('does not wrap non-event attribute function calls in JSX', () => {
    const code = `<div class={getClass()} title={getTitle()}>Test</div>`;
    const out = transform(code);
    expect(out).toContain('class: getClass()');
    expect(out).toContain('title: getTitle()');
  });

  test('handles mixed event and non-event attributes in JSX', () => {
    const code = `<button on:click={getHandler()} class={getClass()}>Click</button>`;
    const out = transform(code);
    expect(out).toContain('click: getHandler()');
    expect(out).toContain('class: getClass()');
  });

  test('handles forEach calls in attributes', () => {
    const code = `<button on:click={items.forEach(item => console.log(item))}>Click</button>`;
    const out = transform(code);
    expect(out).toContain('click: items.forEach(item => console.log(item))');
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
    expect(out).toContain("className: items.filter(predicate()).map(transform()).join(', ')");
  });

  test('handles complex nested expressions with function calls', () => {
    const code = `<div data-value={compute(a, b) + calculate(x, y)}>Result</div>`;
    const out = transform(code);
    expect(out).toContain('"data-value": compute(a, b) + calculate(x, y)');
  });

  test('preserves non-function expressions', () => {
    const code = `<div className={isActive ? 'active' : 'inactive'} data-count={items.length}>Content</div>`;
    const out = transform(code);
    expect(out).toContain("className: isActive ? 'active' : 'inactive'");
    expect(out).toContain('"data-count": items.length');
  });

  test('handles function calls in deeply nested expressions', () => {
    const code = `<div class={func(nested(call()), another(inner()))}>Content</div>`;
    const out = transform(code);
    expect(out).toContain('class: func(nested(call()), another(inner()))');
  });
});

describe('babel - JSX attribute prefixes', () => {
  test('transforms bind: prefix to bind object in JSX', () => {
    const code = `<div bind:class={signal} bind:id={otherId} />`;
    const out = transform(code);
    expect(out).toContain('bind: {');
    expect(out).toContain('class: signal');
    expect(out).toContain('id: otherId');
  });

  test('transforms hooks: prefix to hooks object in JSX', () => {
    const code = `<div hooks:mount={handleMount} hooks:beforeDestroy={cleanup} />`;
    const out = transform(code);
    expect(out).toContain('hooks: {');
    expect(out).toContain('mount: handleMount');
    expect(out).toContain('beforeDestroy: cleanup');
  });

  test('transforms on: prefix to on object in JSX', () => {
    const code = `<button on:click={handleClick}>Click</button>`;
    const out = transform(code);
    expect(out).toContain('on: {');
    expect(out).toContain('click: handleClick');
  });

  test('combines props, bind, on, and hooks in JSX', () => {
    const code = `<div id="test" bind:class={cls} on:click={handler} hooks:mount={init} />`;
    const out = transform(code);
    expect(out).toContain('props: {');
    expect(out).toContain('id: "test"');
    expect(out).toContain('bind: {');
    expect(out).toContain('class: cls');
    expect(out).toContain('on: {');
    expect(out).toContain('click: handler');
    expect(out).toContain('hooks: {');
    expect(out).toContain('mount: init');
  });

  test('transforms bind: prefix to props in component JSX', () => {
    const code = `<MyComp bind:value={state} />`;
    const out = transform(code);
    expect(out).toContain('componentScope(MyComp,');
    expect(out).toContain('value: state');
  });

  test('transforms hooks: prefix to props in component JSX', () => {
    const code = `<MyComp hooks:mount={setup} />`;
    const out = transform(code);
    expect(out).toContain('componentScope(MyComp,');
    expect(out).toContain('mount: setup');
  });
});

