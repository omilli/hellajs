import { describe, test, expect, beforeEach, mock } from "bun:test";
import { flush, signal } from "@hellajs/core";
import {resetTestState} from "@utils/test-helpers.js";
import { mount, html } from "@hellajs/dom/bundle";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("direct events", () => {
    test("e:click attaches handler directly to element", () => {
      const clickHandler = mock(() => {});
      mount(html`<button id="btn" e:click=${clickHandler}>Click</button>`);

      const btn = document.getElementById("btn") as HTMLButtonElement;
      btn.click();
      expect(clickHandler).toHaveBeenCalledTimes(1);
    });

    test("e: handlers are cleaned up on removal", () => {
      const clickHandler = mock(() => {});
      const app = mount(html`<div id="container" e:click=${clickHandler}>Content</div>`);

      const container = document.getElementById("container")!;
      container.click();
      expect(clickHandler).toHaveBeenCalledTimes(1);

      app.unmount();

      container.click();
      expect(clickHandler).toHaveBeenCalledTimes(1);
    });

    test("handlers work with reactive children", () => {
      const count = signal(0);
      const clickHandler = mock(() => {});

      mount(html`
        <div id="container" e:click=${clickHandler}>
          ${() => count()}
        </div>
      `);

      const container = document.getElementById("container")!;
      expect(container.textContent).toBe("0");

      count(5);
      flush();
      expect(container.textContent).toBe("5");

      container.click();
      expect(clickHandler).toHaveBeenCalledTimes(1);
    });

    test("e: and on: can coexist on same element", () => {
      const directHandler = mock(() => {});
      const delegatedHandler = mock(() => {});

      mount(html`
        <button
          id="btn"
          e:click=${directHandler}
          on:click=${delegatedHandler}
        >Click</button>
      `);

      const btn = document.getElementById("btn")!;
      btn.click();
      expect(directHandler).toHaveBeenCalledTimes(1);
      expect(delegatedHandler).toHaveBeenCalledTimes(1);
    });

    test("replaces existing e:click handler on re-mount", () => {
      const firstHandler = mock(() => {});
      const secondHandler = mock(() => {});

      mount(html`<div id="test" e:click=${firstHandler}>Test</div>`);

      let el = document.getElementById("test")!;
      el.click();
      expect(firstHandler).toHaveBeenCalledTimes(1);
      expect(secondHandler).not.toHaveBeenCalled();

      mount(html`<div id="test" e:click=${secondHandler}>Test</div>`);

      el = document.getElementById("test")!;
      el.click();
      expect(firstHandler).toHaveBeenCalledTimes(1);
      expect(secondHandler).toHaveBeenCalledTimes(1);
    });

    test("multiple handlers on single element", () => {
      const clickHandler = mock(() => {});
      const mouseEnterHandler = mock(() => {});

      mount(html`
        <div
          id="test"
          e:click=${clickHandler}
          e:mouseenter=${mouseEnterHandler}
        >Test</div>
      `);

      const el = document.getElementById("test")!;
      el.click();
      el.dispatchEvent(new Event("mouseenter"));

      expect(clickHandler).toHaveBeenCalledTimes(1);
      expect(mouseEnterHandler).toHaveBeenCalledTimes(1);
    });

    test("receives event object as argument", () => {
      let receivedEvent!: Event;

      mount(html`
        <button id="btn" e:click=${(event: Event) => { receivedEvent = event; }}>Click</button>
      `);

      const btn = document.getElementById("btn")!;
      btn.dispatchEvent(new Event("click"));

      expect(receivedEvent).not.toBeNull();
      expect(receivedEvent?.type).toBe("click");
    });

    test("stopPropagation prevents parent e:click from firing", () => {
      const parentHandler = mock(() => {});
      const childHandler = mock((event: Event) => { event.stopPropagation(); });

      mount(html`
        <div id="parent" e:click=${parentHandler}>
          <button
            id="child"
            e:click=${childHandler}
          >Click</button>
        </div>
      `);

      const child = document.getElementById("child")!;
      child.click();

      expect(childHandler).toHaveBeenCalledTimes(1);
      expect(parentHandler).not.toHaveBeenCalled();
    });

    test("nested elements with e: handlers", () => {
      const outerHandler = mock(() => {});
      const innerHandler = mock(() => {});

      mount(html`
        <div id="outer" e:click=${outerHandler}>
          <div id="inner" e:click=${innerHandler}>Inner</div>
        </div>
      `);

      const inner = document.getElementById("inner")!;
      inner.click();

      expect(innerHandler).toHaveBeenCalledTimes(1);
      expect(outerHandler).toHaveBeenCalledTimes(1);
    });

    test("html template supports prefix", () => {
      const clickHandler = mock(() => {});
      mount(html`<button e:click=${clickHandler}>Click Me</button>`);

      const btn = document.querySelector("button")!;
      btn.click();
      expect(clickHandler).toHaveBeenCalledTimes(1);
    });

    test("once: true fires the handler exactly once", () => {
      const clickHandler = mock(() => {});
      mount(html`<button id="btn" e:click=${{ handler: clickHandler, options: { once: true } }}>Click</button>`);

      const btn = document.getElementById("btn")!;
      btn.click();
      btn.click();
      expect(clickHandler).toHaveBeenCalledTimes(1);
    });

    test("capture: true fires the parent handler before the target handler", () => {
      const order: string[] = [];
      const parentCapture = mock(() => { order.push("parent"); });
      const childHandler = mock(() => { order.push("child"); });

      mount(html`
        <div id="parent" e:click=${{ handler: parentCapture, options: { capture: true } }}>
          <button id="child" e:click=${childHandler}>Click</button>
        </div>
      `);

      document.getElementById("child")!.click();

      expect(parentCapture).toHaveBeenCalledTimes(1);
      expect(childHandler).toHaveBeenCalledTimes(1);
      expect(order).toEqual(["parent", "child"]);
    });

    test("passive: true is forwarded to addEventListener", () => {
      const original = Element.prototype.addEventListener;
      const addSpy = mock<(type: string, listener: unknown, options?: unknown) => void>(() => {});
      Element.prototype.addEventListener = addSpy as unknown as typeof original;
      try {
        mount(html`<div id="test" e:touchstart=${{ handler: mock(() => {}), options: { passive: true } }}>Test</div>`);

        const call = addSpy.mock.calls.find(([type]) => type === "touchstart");
        expect(call?.[2]).toEqual({ passive: true });
      } finally {
        Element.prototype.addEventListener = original;
      }
    });

    test("cleanup removes the listener with the stored options object", () => {
      const original = Element.prototype.removeEventListener;
      const removeSpy = mock(function (this: Element, ...args: Parameters<Element["removeEventListener"]>) {
        return original.apply(this, args);
      });
      Element.prototype.removeEventListener = removeSpy as unknown as typeof original;
      try {
        const clickHandler = mock(() => {});
        const options = { capture: true };
        const app = mount(html`<div id="test" e:click=${{ handler: clickHandler, options }}>Test</div>`);
        const el = document.getElementById("test")!;

        app.unmount();

        const call = removeSpy.mock.calls.find(([type]) => type === "click");
        expect(call?.[2]).toBe(options);

        el.click();
        expect(clickHandler).not.toHaveBeenCalled();
      } finally {
        Element.prototype.removeEventListener = original;
      }
    });

    test("plain function and spec forms coexist on the same element", () => {
      const plainHandler = mock(() => {});
      const specHandler = mock(() => {});

      mount(html`
        <div
          id="test"
          e:click=${plainHandler}
          e:mouseenter=${{ handler: specHandler, options: { once: true } }}
        >Test</div>
      `);

      const el = document.getElementById("test")!;
      el.click();
      el.dispatchEvent(new Event("mouseenter"));

      expect(plainHandler).toHaveBeenCalledTimes(1);
      expect(specHandler).toHaveBeenCalledTimes(1);
    });
  });
});
