import { describe, test, expect, beforeEach, mock } from "bun:test";
import { mount, html, queueCleanup, peekState } from "@hellajs/dom/bundle";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("delegated events", () => {
    test("delegated click handler fires on target element", () => {
      const clickHandler = mock(() => {});

      mount(html`
        <div id="event-container">
          <button id="btn" on:click=${clickHandler}>Click</button>
        </div>
      `);

      document.getElementById("btn")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      expect(clickHandler).toHaveBeenCalledTimes(1);
    });

    test("delegated handler fires via event bubbling", () => {
      const delegatedHandler = mock(() => {});

      mount(html`
        <div id="event-container">
          <div id="parent" on:click=${delegatedHandler}>
            <span id="child">Child</span>
          </div>
        </div>
      `);

      document.getElementById("child")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      expect(delegatedHandler).toHaveBeenCalledTimes(1);
    });

    test("multiple delegated event types on same element", () => {
      const clickHandler = mock(() => {});
      const hoverHandler = mock(() => {});

      mount(html`<div id="multi" on:click=${clickHandler} on:mouseenter=${hoverHandler}></div>`);
      const multi = document.getElementById("multi")!;

      multi.dispatchEvent(new Event("click"));
      multi.dispatchEvent(new Event("mouseenter"));
      expect(clickHandler).toHaveBeenCalledTimes(1);
      expect(hoverHandler).toHaveBeenCalledTimes(1);
    });

    test("remaining delegated handler fires after sibling element removal", () => {
      const clickHandler = mock(() => {});
      mount(html`
        <div>
          <button id="a" on:click=${clickHandler}>A</button>
          <button id="b" on:click=${clickHandler}>B</button>
        </div>
      `);

      document.getElementById("a")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      document.getElementById("b")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      expect(clickHandler).toHaveBeenCalledTimes(2);

      const a = document.getElementById("a")!;
      a.remove();
      queueCleanup(a);

      document.getElementById("b")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      expect(clickHandler).toHaveBeenCalledTimes(3);
    });

    test("element state cleans up when last delegated handler element is removed", () => {
      const dragHandler = mock(() => {});
      mount(html`<div id="drag-el" on:drag=${dragHandler}>Drag</div>`);

      const el = document.getElementById("drag-el")!;
      el.dispatchEvent(new Event("drag", { bubbles: true }));
      expect(dragHandler).toHaveBeenCalledTimes(1);

      el.remove();
      queueCleanup(el);

      expect(peekState(el)).toBeUndefined();
    });

    test("delegated handler on permanent node remains active after unrelated cleanup", () => {
      const clickHandler = mock(() => {});
      const dragHandler = mock(() => {});

      mount(html`
        <div id="permanent" on:click=${clickHandler}>Permanent</div>
        <div id="temporary" on:drag=${dragHandler}>Temporary</div>
      `);

      const temp = document.getElementById("temporary")!;
      temp.remove();
      queueCleanup(temp);

      document.getElementById("permanent")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      expect(clickHandler).toHaveBeenCalledTimes(1);
    });

    test("events of removed delegated handler type do not crash", () => {
      const dragHandler = mock(() => {});
      mount(html`<div id="drag-el" on:drag=${dragHandler}>Drag</div>`);

      const el = document.getElementById("drag-el")!;
      el.remove();
      queueCleanup(el);

      document.body.dispatchEvent(new Event("drag", { bubbles: true }));
      expect(dragHandler).toHaveBeenCalledTimes(0);
    });
  });

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
      mount(html`<div id="container" e:click=${clickHandler}>Content</div>`);

      const container = document.getElementById("container")!;
      container.click();
      expect(clickHandler).toHaveBeenCalledTimes(1);

      container.remove();
      queueCleanup(container);

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

    test("handler replacement works correctly", () => {
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

    test("stopPropagation works correctly", () => {
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
  });
});