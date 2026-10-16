import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { delay, resetTestState, suppressConsole } from "@utils/test-helpers.js";
import { mount, onError } from "@hellajs/dom";
import type { HellaNode } from "@hellajs/dom";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("async mount", () => {
    test("renders content from async component function", async () => {
      mount(async () => (<div id="async-loaded">loaded</div>) as HellaNode);
      expect(document.getElementById("async-loaded")).toBeNull();
      await delay();
      expect(document.getElementById("async-loaded")?.textContent).toBe("loaded");
    });

    test("sync mount behavior is unchanged", () => {
      mount(<div id="sync-mount">sync</div>);
      expect(document.getElementById("sync-mount")?.textContent).toBe("sync");
    });

    test("routes rejection through dispatchError when no onError handler", async () => {
      const suppressed = suppressConsole();
      try {
        mount(async () => {
          throw new Error("async mount fail");
        });
        await delay();
        expect(suppressed.errors.length).toBe(1);
        expect(suppressed.errors[0]?.[1]).toBeInstanceOf(Error);
        expect((suppressed.errors[0]?.[1] as Error).message).toBe("async mount fail");
      } finally {
        suppressed.restore();
      }
    });

    test("routes rejection through onError handler when registered", async () => {
      const handler = vi.fn(() => null);
      onError(handler);
      mount(async () => {
        throw new Error("handler test");
      });
      await delay();
      expect(handler).toHaveBeenCalledTimes(1);
      expect((handler.mock.calls[0] as unknown[])?.[0]).toBeInstanceOf(Error);
      onError(null);
    });
    test("unmount before an async mount attaches cancels the late resolution", async () => {
      let resolveMount: () => void = () => {};
      const slow = () =>
        new Promise<void>((resolve) => {
          resolveMount = resolve;
        }).then(() => (<div id="late">late</div>) as HellaNode);

      const handle = mount(slow);
      handle.unmount();
      resolveMount();
      await delay();

      expect(document.getElementById("late")).toBeNull();
      expect(document.getElementById("app")?.childElementCount).toBe(0);
    });
  });
});
