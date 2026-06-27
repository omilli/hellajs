import { describe, test, expect, beforeEach, mock } from "bun:test";
import {delay, resetTestState} from "../../../utils/test-helpers.js";
import { mount, html, peekState } from "@hellajs/dom/bundle";

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

    test("remaining delegated handler fires after sibling element removal", async () => {
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
      await delay();

      document.getElementById("b")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      expect(clickHandler).toHaveBeenCalledTimes(3);
    });

    test("element state cleans up when last delegated handler element is removed", async () => {
      const dragHandler = mock(() => {});
      mount(html`<div id="drag-el" on:drag=${dragHandler}>Drag</div>`);

      const el = document.getElementById("drag-el")!;
      el.dispatchEvent(new Event("drag", { bubbles: true }));
      expect(dragHandler).toHaveBeenCalledTimes(1);

      el.remove();
      await delay(0);

      expect(peekState(el)).toBeUndefined();
    });

    test("delegated handler on permanent node remains active after unrelated cleanup", async () => {
      const clickHandler = mock(() => {});
      const dragHandler = mock(() => {});

      mount(html`
        <div id="permanent" on:click=${clickHandler}>Permanent</div>
        <div id="temporary" on:drag=${dragHandler}>Temporary</div>
      `);

      const temp = document.getElementById("temporary")!;
      temp.remove();
      await delay();

      document.getElementById("permanent")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      expect(clickHandler).toHaveBeenCalledTimes(1);
    });

    test("events of removed delegated handler type do not crash", async () => {
      const dragHandler = mock(() => {});
      mount(html`<div id="drag-el" on:drag=${dragHandler}>Drag</div>`);

      const el = document.getElementById("drag-el")!;
      el.remove();
      await delay();

      document.body.dispatchEvent(new Event("drag", { bubbles: true }));
      expect(dragHandler).toHaveBeenCalledTimes(0);
    });
  });
});
