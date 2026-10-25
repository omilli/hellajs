import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { flush, signal } from "@hellajs/core";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { mount, hydrate, peekState } from "@hellajs/dom";
import { twoTargetContainer } from "./helpers";
import type { TemplateBuildFn } from "@hellajs/dom";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("direct events", () => {
    test("e:click attaches handler directly to element", () => {
      const clickHandler = vi.fn(() => {});
      mount(
        <button id="btn" e:click={clickHandler}>
          Click
        </button>,
      );

      const btn = document.getElementById("btn") as HTMLButtonElement;
      btn.click();
      expect(clickHandler).toHaveBeenCalledTimes(1);
    });

    test("e: handlers are cleaned up on removal", () => {
      const clickHandler = vi.fn(() => {});
      const app = mount(
        <div id="container" e:click={clickHandler}>
          Content
        </div>,
      );

      const container = document.getElementById("container")!;
      container.click();
      expect(clickHandler).toHaveBeenCalledTimes(1);

      app.unmount();

      container.click();
      expect(clickHandler).toHaveBeenCalledTimes(1);
    });

    test("handlers work with reactive children", () => {
      const count = signal(0);
      const clickHandler = vi.fn(() => {});

      mount(
        <div id="container" e:click={clickHandler}>
          {count}
        </div>,
      );

      const container = document.getElementById("container")!;
      expect(container.textContent).toBe("0");

      count(5);
      flush();
      expect(container.textContent).toBe("5");

      container.click();
      expect(clickHandler).toHaveBeenCalledTimes(1);
    });

    test("e: and on: can coexist on same element", () => {
      const directHandler = vi.fn(() => {});
      const delegatedHandler = vi.fn(() => {});

      mount(
        <button id="btn" e:click={directHandler} on:click={delegatedHandler}>
          Click
        </button>,
      );

      const btn = document.getElementById("btn")!;
      btn.click();
      expect(directHandler).toHaveBeenCalledTimes(1);
      expect(delegatedHandler).toHaveBeenCalledTimes(1);
    });

    test("replaces existing e:click handler on re-mount", () => {
      const firstHandler = vi.fn(() => {});
      const secondHandler = vi.fn(() => {});

      mount(
        <div id="test" e:click={firstHandler}>
          Test
        </div>,
      );

      let el = document.getElementById("test")!;
      el.click();
      expect(firstHandler).toHaveBeenCalledTimes(1);
      expect(secondHandler).not.toHaveBeenCalled();

      mount(
        <div id="test" e:click={secondHandler}>
          Test
        </div>,
      );

      el = document.getElementById("test")!;
      el.click();
      expect(firstHandler).toHaveBeenCalledTimes(1);
      expect(secondHandler).toHaveBeenCalledTimes(1);
    });

    test("re-registering e:click on the same element replaces the listener", async () => {
      // In-source hit counters: the server arm's counter objects belong to its own module
      // scope, so assertions read the CLIENT module's `hits` (the live one hydrate drives).
      const { container, client } = await twoTargetContainer(`
        const hits = { first: 0, second: 0 };
        const First = () => (
          <button id="btn" e:click={() => { hits.first++; }}>
            Go
          </button>
        );
        const Second = () => (
          <button id="btn" e:click={() => { hits.second++; }}>
            Go
          </button>
        );
        const App = First;
        const __out = { App, First, Second, hits };
      `);
      const out = client as unknown as {
        First: TemplateBuildFn;
        Second: TemplateBuildFn;
        hits: { first: number; second: number };
      };

      hydrate(out.First, container);
      const btn = document.getElementById("btn")!;
      btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      expect(out.hits.first).toBe(1);

      hydrate(out.Second, container);
      btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      expect(out.hits.first).toBe(1);
      expect(out.hits.second).toBe(1);

      btn.remove();
      for (let __i = 0; __i < 50; __i++) {
        if (peekState(btn) === undefined) break;
        await delay();
      }
      btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      expect(out.hits.second).toBe(1);
    });

    test("multiple handlers on single element", () => {
      const clickHandler = vi.fn(() => {});
      const mouseEnterHandler = vi.fn(() => {});

      mount(
        <div id="test" e:click={clickHandler} e:mouseenter={mouseEnterHandler}>
          Test
        </div>,
      );

      const el = document.getElementById("test")!;
      el.click();
      el.dispatchEvent(new Event("mouseenter"));

      expect(clickHandler).toHaveBeenCalledTimes(1);
      expect(mouseEnterHandler).toHaveBeenCalledTimes(1);
    });

    test("receives event object as argument", () => {
      let receivedEvent!: Event;

      mount(
        <button
          id="btn"
          e:click={(event: Event) => {
            receivedEvent = event;
          }}
        >
          Click
        </button>,
      );

      const btn = document.getElementById("btn")!;
      btn.dispatchEvent(new Event("click"));

      expect(receivedEvent).not.toBeNull();
      expect(receivedEvent?.type).toBe("click");
    });

    test("stopPropagation prevents parent e:click from firing", () => {
      const parentHandler = vi.fn(() => {});
      const childHandler = vi.fn((event: Event) => {
        event.stopPropagation();
      });

      mount(
        <div id="parent" e:click={parentHandler}>
          <button id="child" e:click={childHandler}>
            Click
          </button>
        </div>,
      );

      const child = document.getElementById("child")!;
      child.click();

      expect(childHandler).toHaveBeenCalledTimes(1);
      expect(parentHandler).not.toHaveBeenCalled();
    });

    test("nested elements with e: handlers", () => {
      const outerHandler = vi.fn(() => {});
      const innerHandler = vi.fn(() => {});

      mount(
        <div id="outer" e:click={outerHandler}>
          <div id="inner" e:click={innerHandler}>
            Inner
          </div>
        </div>,
      );

      const inner = document.getElementById("inner")!;
      inner.click();

      expect(innerHandler).toHaveBeenCalledTimes(1);
      expect(outerHandler).toHaveBeenCalledTimes(1);
    });

    test("element supports prefix", () => {
      const clickHandler = vi.fn(() => {});
      mount(<button e:click={clickHandler}>Click Me</button>);

      const btn = document.querySelector("button")!;
      btn.click();
      expect(clickHandler).toHaveBeenCalledTimes(1);
    });

    test("once: true fires the handler exactly once", () => {
      const clickHandler = vi.fn(() => {});
      mount(
        <button id="btn" e:click={{ handler: clickHandler, options: { once: true } }}>
          Click
        </button>,
      );

      const btn = document.getElementById("btn")!;
      btn.click();
      btn.click();
      expect(clickHandler).toHaveBeenCalledTimes(1);
    });

    test("capture: true fires the parent handler before the target handler", () => {
      const order: string[] = [];
      const parentCapture = vi.fn(() => {
        order.push("parent");
      });
      const childHandler = vi.fn(() => {
        order.push("child");
      });

      mount(
        <div id="parent" e:click={{ handler: parentCapture, options: { capture: true } }}>
          <button id="child" e:click={childHandler}>
            Click
          </button>
        </div>,
      );

      document.getElementById("child")!.click();

      expect(parentCapture).toHaveBeenCalledTimes(1);
      expect(childHandler).toHaveBeenCalledTimes(1);
      expect(order).toEqual(["parent", "child"]);
    });

    test("passive: true is forwarded to addEventListener", () => {
      const original = Element.prototype.addEventListener;
      const addSpy = vi.fn<(type: string, listener: unknown, options?: unknown) => void>(() => {});
      Element.prototype.addEventListener = addSpy as unknown as typeof original;
      try {
        mount(
          <div id="test" e:touchstart={{ handler: vi.fn(() => {}), options: { passive: true } }}>
            Test
          </div>,
        );

        const call = addSpy.mock.calls.find(([type]) => type === "touchstart");
        expect(call?.[2]).toEqual({ passive: true });
      } finally {
        Element.prototype.addEventListener = original;
      }
    });

    test("cleanup removes the listener with the stored options object", () => {
      const original = Element.prototype.removeEventListener;
      const removeSpy = vi.fn(function (
        this: Element,
        ...args: Parameters<Element["removeEventListener"]>
      ) {
        return original.apply(this, args);
      });
      Element.prototype.removeEventListener = removeSpy as unknown as typeof original;
      try {
        const clickHandler = vi.fn(() => {});
        const options = { capture: true };
        const app = mount(
          <div id="test" e:click={{ handler: clickHandler, options }}>
            Test
          </div>,
        );
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
      const plainHandler = vi.fn(() => {});
      const specHandler = vi.fn(() => {});

      mount(
        <div
          id="test"
          e:click={plainHandler}
          e:mouseenter={{ handler: specHandler, options: { once: true } }}
        >
          Test
        </div>,
      );

      const el = document.getElementById("test")!;
      el.click();
      el.dispatchEvent(new Event("mouseenter"));

      expect(plainHandler).toHaveBeenCalledTimes(1);
      expect(specHandler).toHaveBeenCalledTimes(1);
    });
  });
});
