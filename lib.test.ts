import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import * as lib from './lib';

function createContainer(id = "app") {
  const container = document.createElement("div");
  container.id = id;
  document.body.appendChild(container);
  return container;
}

function removeContainer(id = "app") {
  const container = document.getElementById(id);
  if (container) {
    document.body.removeChild(container);
  }
}

function getContainer(id = "app") {
  return document.getElementById(id)!;
}

describe("DOM diffing and Diffing", () => {
  beforeEach(() => {
    createContainer();
  });

  afterEach(() => {
    removeContainer();
  });


  // Helper to wait for reactive updates (microtask queue)
  async function waitForMicrotasks() {
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  describe('Reactive Library Tests', () => {
    test('renders static VNode', async () => {
      const { render, html } = lib;
      render(html.div({ id: 'test' }, 'Hello World'), '#app');
      const div = document.querySelector('#app #test');
      expect(div).not.toBeNull();
      expect(div?.textContent).toBe('Hello World');
      expect(div?.getAttribute('id')).toBe('test');
    });

    test('updates text reactively with Signal', async () => {
      const { render, html, signal } = lib;
      const count = signal(0);
      render(html.div({}, () => count()), '#app');
      const div = document.querySelector('#app div');
      expect(div?.textContent).toBe('0');
      count.set(42);
      await waitForMicrotasks(); // Wait for reactivity
      expect(div?.textContent).toBe('42');
    });

    test('handles click events with EventDelegator', async () => {
      const { render, html, signal } = lib;
      const clicked = signal(false);
      render(
        html.button({ id: 'btn', onclick: () => clicked.set(true) }, () => (clicked() ? 'Clicked' : 'Click Me')),
        '#app'
      );
      const button = document.querySelector('#app #btn');
      expect(button?.textContent).toBe('Click Me');
      button?.dispatchEvent(new globalThis.Event('click'));
      await waitForMicrotasks();
      expect(button?.textContent).toBe('Clicked');
    });

    test('manages dynamic list with For', async () => {
      const { render, html, signal, For } = lib;
      const items = signal([{ id: 1, text: 'Item 1' }, { id: 2, text: 'Item 2' }]);
      render(
        For(items, (item, index) => html.div({ key: item.id }, `${item.text} (#${index})`)),
        '#app'
      );
      const divs = document.querySelectorAll('#app div');
      expect(divs.length).toBe(2);
      expect(divs[0].textContent).toBe('Item 1 (#0)');
      expect(divs[1].textContent).toBe('Item 2 (#1)');
      items.set([{ id: 2, text: 'Item 2' }, { id: 3, text: 'Item 3' }]);
      await waitForMicrotasks();
      const updatedDivs = document.querySelectorAll('#app div');
      expect(updatedDivs.length).toBe(2);
      expect(updatedDivs[0].textContent).toBe('Item 2 (#0)');
      expect(updatedDivs[1].textContent).toBe('Item 3 (#1)');
    });

    test('executes component lifecycle hooks', async () => {
      const { render, html, Component, signal } = lib;
      const titles: string[] = [];
      const count = signal(0);
      const MyComponent = Component(() => {
        MyComponent.onMount = () => titles.push('Mounted');
        MyComponent.onUpdate = () => titles.push('Updated');
        MyComponent.onUnmount = () => titles.push('Unmounted');
        return html.div({}, () => count());
      });
      const { cleanup } = render(MyComponent(), '#app');
      expect(titles).toEqual(['Mounted']);
      count.set(1);
      await waitForMicrotasks();
      expect(titles).toEqual(['Mounted', 'Updated']);
      cleanup();
      await waitForMicrotasks();
      expect(titles).toEqual(['Mounted', 'Updated', 'Unmounted']);
    });

    test('handles nested components with reactivity', async () => {
      const { render, html, Component, signal } = lib;
      const count = signal(0);
      const Child = Component(() => html.span({}, () => `Count: ${count()}`));
      const Parent = Component(() => html.div({}, Child()));
      render(Parent(), '#app');
      const span = document.querySelector('#app span');
      expect(span?.textContent).toBe('Count: 0');
      count.set(5);
      await waitForMicrotasks();
      expect(span?.textContent).toBe('Count: 5');
    });

    test('cleans up resources properly', async () => {
      const { render, html, signal } = lib;
      const count = signal(0);
      const { cleanup } = render(
        html.div({ onclick: () => count.set(count() + 1) }, () => count()),
        '#app'
      );
      const div = document.querySelector('#app div');
      div?.dispatchEvent(new globalThis.Event('click'));
      await waitForMicrotasks();
      expect(div?.textContent).toBe('1');
      cleanup();
      await waitForMicrotasks();
      div?.dispatchEvent(new globalThis.Event('click')); // Should not increment
      await waitForMicrotasks();
      expect(document.querySelector('#app div')).toBeNull(); // DOM should be cleared
    });
  });
});