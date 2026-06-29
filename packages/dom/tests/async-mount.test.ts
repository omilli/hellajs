import { describe, test, expect, beforeEach, mock } from "bun:test";
import { delay, resetTestState, suppressConsole } from "@utils/test-helpers.js";
import { mount, html, onError } from "@hellajs/dom/bundle";
import type { HellaNode } from "@hellajs/dom";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("async mount", () => {
    test("renders content from async component function", async () => {
      mount(async () => html`<div id="async-loaded">loaded</div>` as HellaNode);
      expect(document.getElementById("async-loaded")).toBeNull();
      await delay();
      expect(document.getElementById("async-loaded")?.textContent).toBe("loaded");
    });

    test("sync mount behavior is unchanged", () => {
      mount(html`<div id="sync-mount">sync</div>`);
      expect(document.getElementById("sync-mount")?.textContent).toBe("sync");
    });

    test("routes rejection through dispatchError when no onError handler", async () => {
      const suppressed = suppressConsole();
      mount(async () => { throw new Error("async mount fail"); });
      await delay();
      expect(suppressed.errors.length).toBe(1);
      expect(suppressed.errors[0]?.[1]).toBeInstanceOf(Error);
      expect((suppressed.errors[0]?.[1] as Error).message).toBe("async mount fail");
      suppressed.restore();
    });

    test("routes rejection through onError handler when registered", async () => {
      const handler = mock(() => null);
      onError(handler);
      mount(async () => { throw new Error("handler test"); });
      await delay();
      expect(handler).toHaveBeenCalledTimes(1);
      expect((handler.mock.calls[0] as unknown[])?.[0]).toBeInstanceOf(Error);
      onError(null);
    });
  });
});
