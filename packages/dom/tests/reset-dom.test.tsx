import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { mount, onError, resetDom } from "@hellajs/dom";

beforeEach(() => {
  resetTestState();
  resetDom();
});

describe("resetDom", () => {
  test("clears error-handler registry", () => {
    const handler = vi.fn(() => null);
    onError(handler);
    resetDom();
    expect(handler).not.toHaveBeenCalled();
  });

  test("mount returns a handle with container, flush, and unmount", () => {
    const app = mount(<div>hello</div>);
    expect(app.container).toBeInstanceOf(Element);
    expect(typeof app.flush).toBe("function");
    expect(typeof app.unmount).toBe("function");
  });

  test("flush drains mount and cleanup queues for this container", () => {
    const callOrder: string[] = [];
    const app = mount(<div hook:afterMount={() => callOrder.push("afterMount")}>content</div>);
    // afterMount now fires during mount(); flush() is an idempotent no-op
    expect(callOrder).toEqual(["afterMount"]);
    app.flush();
    expect(callOrder).toEqual(["afterMount"]);
  });

  test("unmount tears down the subtree and removes the mounted node", () => {
    const destroyOrder: string[] = [];
    const app = mount(
      <div hook:beforeDestroy={() => destroyOrder.push("beforeDestroy")}>content</div>,
    );
    app.flush();

    app.unmount();

    expect(destroyOrder).toEqual(["beforeDestroy"]);
    expect(app.container.hasChildNodes()).toBe(false);
  });

  test("async mount returns handle immediately; flush/unmount defer until attached", async () => {
    const app = mount(async () => {
      await delay(10);
      return <div>async</div>;
    });

    expect(app.container).toBeInstanceOf(Element);
    expect(typeof app.flush).toBe("function");

    await delay(20);
    expect(app.container.textContent).toBe("async");
  });

  test("unmount before async attach sets cancelled flag and the continuation bails", async () => {
    let mountedNode: Element | null = null;
    const app = mount(async () => {
      await delay(10);
      mountedNode = document.getElementById("async-cancel");
      return <div id="async-cancel">cancelled</div>;
    });

    app.unmount();
    await delay(20);

    expect(mountedNode).toBeNull();
  });
});
