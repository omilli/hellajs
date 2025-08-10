import { describe, expect, test } from 'bun:test';
import { slot } from '../../packages/dom/lib/slot';
import { html } from '../../packages/dom';
import { forEach } from '../../packages/dom';

describe('slot function', () => {
  test('handles empty arguments', () => {
    const result = slot([]);
    expect(result.props).toEqual({});
    expect(result.children).toEqual([]);
  });

  test('handles children only (no props)', () => {
    const result = slot(['text', html`<span>child</span>`]);
    expect(result.props).toEqual({});
    expect(result.children).toEqual(['text', html`<span>child</span>`]);
  });

  test('handles props and children', () => {
    const props = { id: 'test', class: 'container' };
    const result = slot([props, 'text', html`<span>child</span>`]);
    expect(result.props).toEqual(props);
    expect(result.children).toEqual(['text', html`<span>child</span>`]);
  });

  test('handles props object with no children', () => {
    const props = { id: 'test', class: 'container' };
    const result = slot([props]);
    expect(result.props).toEqual(props);
    expect(result.children).toEqual([]);
  });

  test('handles single child', () => {
    const result = slot(['single child']);
    expect(result.props).toEqual({});
    expect(result.children).toEqual(['single child']);
  });

  test('correctly identifies props vs children', () => {
    // Objects without tag should be treated as props
    const objAsProps = slot([{ id: 'test' }, 'child']);
    expect(objAsProps.props).toEqual({ id: 'test' });
    expect(objAsProps.children).toEqual(['child']);

    // Non-object first argument should be treated as children
    const stringFirst = slot(['not-props', 'child2']);
    expect(stringFirst.props).toEqual({});
    expect(stringFirst.children).toEqual(['not-props', 'child2']);

    // Array first argument should be treated as children
    const arrayFirst = slot([['item1', 'item2'], 'child']);
    expect(arrayFirst.props).toEqual({});
    expect(arrayFirst.children).toEqual([['item1', 'item2'], 'child']);

    // Function first argument should be treated as children
    const funcFirst = slot([() => 'hello', 'child']);
    expect(funcFirst.props).toEqual({});
    expect(funcFirst.children).toHaveLength(2);
    expect(typeof funcFirst.children[0]).toBe('function');
    expect(funcFirst.children[1]).toBe('child');

    // VNode objects should be treated as children, not props
    const vNode = html`<div>test</div>`;
    const vNodeFirst = slot([vNode, 'child']);
    expect(vNodeFirst.props).toEqual({});
    expect(vNodeFirst.children).toEqual([vNode, 'child']);
  });

  test('handles complex children types', () => {
    const complexChildren = [
      'text',
      123,
      true,
      null,
      undefined,
      ['nested', 'array'],
      () => 'function',
      html`<span>template</span>`
    ];

    const result = slot(complexChildren);
    expect(result.props).toEqual({});
    expect(result.children).toEqual(complexChildren);
  });

  test('preserves props object reference when valid', () => {
    const originalProps = { id: 'test', onClick: () => { } };
    const result = slot([originalProps, 'child']);

    expect(result.props).toBe(originalProps);
    expect(result.children).toEqual(['child']);
  });
});

describe('slot with template literals - using forEach pattern', () => {
  test('basic component pattern using forEach for children', () => {
    // Template literal components need to use forEach for multiple children
    const Card = (...args) => {
      const { props, children } = slot(args);
      const cardClass = 'card';
      const cardId = props.id || '';
      return html`<div class="${cardClass}" id="${cardId}">${forEach(children, child => child)}</div>`;
    };

    // Test Card with props and content
    const card = Card({ id: 'mycard' }, 'Card content', html`<span>nested</span>`);

    expect(card.tag).toBe('div');
    expect(card.props.class).toBe('card');
    expect(card.props.id).toBe('mycard');
    // forEach wraps the children, so we check the structure
    expect(card.children[0]).toBeDefined();
    expect(card.children[0].arity).toBe(true); // forEach result
  });

  test('context pattern with forEach', () => {
    function createCounter() {
      let count = 0;

      const Provider = (...args) => {
        const { children } = slot(args);
        const providerClass = 'provider';
        return html`<div class="${providerClass}">${forEach(children, child => child)}</div>`;
      };

      const Button = (...args) => {
        const { children } = slot(args);
        const clickHandler = () => count++;
        return html`<button onclick="${clickHandler}">${forEach(children, child => child)}</button>`;
      };

      const Display = () => {
        const countClass = 'count';
        return html`<span class="${countClass}">${() => count}</span>`;
      };

      return { Provider, Button, Display, getCount: () => count };
    }

    const counter = createCounter();
    const { Provider, Button, Display } = counter;

    // Test the structure
    const app = Provider(
      Button('Increment'),
      Display()
    );

    expect(app.tag).toBe('div');
    expect(app.props.class).toBe('provider');
    expect(app.children).toHaveLength(1);
    expect(app.children[0].arity).toBe(true); // forEach result
  });

  test('single child components work without forEach', () => {
    const Alert = (...args) => {
      const { props, children } = slot(args);
      const type = props.type || 'info';
      const className = `alert alert-${type}`;
      // For single child, can use children[0] or forEach
      return html`<div class="${className}">${children[0] || ''}</div>`;
    };

    const successAlert = Alert({ type: 'success' }, 'Operation successful!');
    const defaultAlert = Alert('Default message');

    expect(successAlert.props.class).toBe('alert alert-success');
    expect(successAlert.children).toEqual(['Operation successful!']);

    expect(defaultAlert.props.class).toBe('alert alert-info');
    expect(defaultAlert.children).toEqual(['Default message']);
  });
});

describe('slot template literal limitations', () => {
  test('demonstrates array nesting issue', () => {
    const Container = (...args) => {
      const { props, children } = slot(args);
      // Passing children array directly creates nested array
      return html`<div class="container">${children}</div>`;
    };

    const result = Container('child1', 'child2');

    // Children array becomes nested
    expect(result.children).toEqual([['child1', 'child2']]);
  });

  test('forEach solution for multiple children', () => {
    const Container = (...args) => {
      const { props, children } = slot(args);
      // Use forEach to properly handle multiple children
      return html`<div class="container">${forEach(children, child => child)}</div>`;
    };

    const result = Container('child1', 'child2');

    // forEach creates proper structure
    expect(result.tag).toBe('div');
    expect(result.props.class).toBe('container');
    expect(result.children[0].arity).toBe(true); // forEach result
  });

  test('string joining for simple text children', () => {
    const TextContainer = (...args) => {
      const { props, children } = slot(args);
      // For text-only children, can join them
      const textContent = children.filter(c => typeof c === 'string').join(' ');
      return html`<div class="text">${textContent}</div>`;
    };

    const result = TextContainer('Hello', 'World', '!');

    expect(result.tag).toBe('div');
    expect(result.props.class).toBe('text');
    expect(result.children).toEqual(['Hello World !']);
  });
});

describe('slot JSX vs template literal patterns', () => {
  test('slot function works the same regardless of usage', () => {
    // The slot function behavior is identical
    const jsxStyle = slot([{ class: 'test' }, 'child1', 'child2']);
    const templateStyle = slot([{ class: 'test' }, 'child1', 'child2']);

    expect(jsxStyle).toEqual(templateStyle);
    expect(jsxStyle.props).toEqual({ class: 'test' });
    expect(jsxStyle.children).toEqual(['child1', 'child2']);
  });

  test('difference is in how children are rendered', () => {
    const { props, children } = slot([{ class: 'test' }, 'child1', 'child2']);

    // JSX would handle children automatically: <div>{children}</div>
    // Template literals need explicit handling:

    // Option 1: forEach for mixed content
    const withForEach = html`<div class="${props.class}">${forEach(children, c => c)}</div>`;
    expect(withForEach.children[0].arity).toBe(true);

    // Option 2: First child only
    const firstOnly = html`<div class="${props.class}">${children[0] || ''}</div>`;
    expect(firstOnly.children).toEqual(['child1']);

    // Option 3: Join strings
    const joined = html`<div class="${props.class}">${children.join(' ')}</div>`;
    expect(joined.children).toEqual(['child1 child2']);
  });
});