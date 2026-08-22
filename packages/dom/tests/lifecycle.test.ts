import { describe, test, expect, beforeEach, mock } from "bun:test";
import { flush, signal } from "@hellajs/core";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { mount, html, peekState } from "@hellajs/dom/bundle";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("lifecycle", () => {
    test("lifecycle execution order", () => {
      const value = signal("initial");
      const callOrder: string[] = [];
      let receivedNode: Element | undefined;

      const app = mount(html`
        <div
          id="lifecycle-test"
          hook:beforeMount=${() => callOrder.push("beforeMount")}
          hook:afterMount=${(node: Element) => {
            callOrder.push("afterMount");
            receivedNode = node;
          }}
          hook:beforeUpdate=${() => callOrder.push("beforeUpdate")}
          hook:afterUpdate=${() => callOrder.push("afterUpdate")}
          data-value=${value}
        ></div>
      `);

      // afterMount now fires during mount(); flush() is an idempotent no-op
      expect(callOrder).toEqual(["beforeMount", "afterMount"]);

      app.flush();
      expect(callOrder).toEqual(["beforeMount", "afterMount"]);
      expect(receivedNode?.id).toBe("lifecycle-test");

      value("updated");
      flush();
      expect(callOrder).toEqual(["beforeMount", "afterMount", "beforeUpdate", "afterUpdate"]);
    });

    test("destroy hooks and cleanup", () => {
      const callOrder: string[] = [];
      const clickHandler = mock(() => {});

      const app = mount(html`
        <button
          id="destroyable"
          hook:beforeDestroy=${() => callOrder.push("beforeDestroy")}
          hook:afterDestroy=${() => callOrder.push("afterDestroy")}
          on:click=${clickHandler}
        >Click</button>
      `);

      const el = document.getElementById("destroyable")!;
      el.dispatchEvent(new Event("click"));
      expect(clickHandler).toHaveBeenCalledTimes(1);

      app.unmount();

      expect(callOrder).toEqual(["beforeDestroy", "afterDestroy"]);
      expect(peekState(el)).toBeUndefined();
    });

    test("nested hooks execute independently", () => {
      const parentCalls: string[] = [];
      const childCalls: string[] = [];

      const app2 = mount(html`
        <div
          id="parent"
          hook:beforeMount=${() => parentCalls.push("beforeMount")}
          hook:afterMount=${() => parentCalls.push("afterMount")}
        >
          <span
            hook:beforeMount=${() => childCalls.push("beforeMount")}
            hook:afterMount=${() => childCalls.push("afterMount")}
          ></span>
        </div>
      `);

      // afterMount fires at mount() for both parent and child
      expect(parentCalls).toEqual(["beforeMount", "afterMount"]);
      expect(childCalls).toEqual(["beforeMount", "afterMount"]);

      app2.flush();
      expect(parentCalls).toEqual(["beforeMount", "afterMount"]);
      expect(childCalls).toEqual(["beforeMount", "afterMount"]);
    });

    test("deeply nested afterMount order", () => {
      const calls: string[] = [];

      const app3 = mount(html`
        <div id="grandparent" hook:afterMount=${() => calls.push("grandparent")}>
          <div id="parent" hook:afterMount=${() => calls.push("parent")}>
            <span hook:afterMount=${() => calls.push("child")}>
              <b hook:afterMount=${() => calls.push("grandchild")}>Deep</b>
            </span>
          </div>
        </div>
      `);

      app3.flush();
      expect(calls).toEqual(["grandparent", "parent", "child", "grandchild"]);
    });

    test("afterMount fires for hooked content added after a hook-free mount", async () => {
      const show = signal(false);
      const mounted = mock(() => { });

      mount(html`<div id="dyn-hooks">${() => show() ? html`<span id="dyn-child" hook:afterMount=${mounted}>hi</span>` : null}</div>`);

      expect(mounted).toHaveBeenCalledTimes(0);

      show(true);
      flush();
      await delay(10);   // observer microtask → processMountQueue walks the added subtree

      expect(mounted).toHaveBeenCalledTimes(1);
    });
  });
});