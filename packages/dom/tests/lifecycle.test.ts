import { describe, test, expect, beforeEach, mock } from "bun:test";
import { mount, html, flushMount, queueCleanup, peekState } from "@hellajs/dom/bundle";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("lifecycle", () => {
    test("lifecycle execution order", () => {
      const value = signal("initial");
      const callOrder: string[] = [];
      let receivedNode: Element | undefined;

      mount(html`
        <div
          id="lifecycle-test"
          hook:beforeMount=${() => callOrder.push("beforeMount")}
          hook:afterMount=${(node: Element) => {
            callOrder.push("afterMount");
            receivedNode = node;
          }}
          hook:beforeUpdate=${() => callOrder.push("beforeUpdate")}
          hook:afterUpdate=${() => callOrder.push("afterUpdate")}
          bind:data-value=${value}
        ></div>
      `);

      expect(callOrder).toEqual(["beforeMount"]);

      flushMount(document.getElementById("app")!);
      expect(callOrder).toEqual(["beforeMount", "afterMount"]);
      expect(receivedNode?.id).toBe("lifecycle-test");

      value("updated");
      flush();
      expect(callOrder).toEqual(["beforeMount", "afterMount", "beforeUpdate", "afterUpdate"]);
    });

    test("destroy hooks and cleanup", () => {
      const callOrder: string[] = [];
      const clickHandler = mock(() => {});

      mount(html`
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

      el.remove();
      queueCleanup(el);

      expect(callOrder).toEqual(["beforeDestroy", "afterDestroy"]);
      expect(peekState(el)).toBeUndefined();
    });

    test("nested hooks execute independently", () => {
      const parentCalls: string[] = [];
      const childCalls: string[] = [];

      mount(html`
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

      expect(parentCalls).toEqual(["beforeMount"]);
      expect(childCalls).toEqual(["beforeMount"]);

      flushMount(document.getElementById("app")!);
      expect(parentCalls).toEqual(["beforeMount", "afterMount"]);
      expect(childCalls).toEqual(["beforeMount", "afterMount"]);
    });

    test("deeply nested afterMount order", () => {
      const calls: string[] = [];

      mount(html`
        <div id="grandparent" hook:afterMount=${() => calls.push("grandparent")}>
          <div id="parent" hook:afterMount=${() => calls.push("parent")}>
            <span hook:afterMount=${() => calls.push("child")}>
              <b hook:afterMount=${() => calls.push("grandchild")}>Deep</b>
            </span>
          </div>
        </div>
      `);

      flushMount(document.getElementById("app")!);
      expect(calls).toEqual(["grandparent", "parent", "child", "grandchild"]);
    });
  });
});