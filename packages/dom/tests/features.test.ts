import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { signal } from "@hellajs/core";
import type { HellaNode } from "@hellajs/dom";

// Feature-free module graph by construction: the module registry is reset per test and
// every import is a subpath re-imported dynamically, never the `@hellajs/dom` barrel —
// the barrel's error/raw/hydrate entries load their features at module init, which would
// defeat the stub-default assertions (and the runner shares module registries across
// files in a fork, so earlier barrel-loading suites pollute static imports). The same
// constraint keeps `@utils/test-helpers.js` out (it imports the barrel), so the reset
// and the console suppression are local to this file.
beforeEach(async () => {
  vi.resetModules();
  document.body.innerHTML = '<div id="app"></div>';
});

/**
 * Captures console.error calls for the duration of fn, restoring the original in a
 * finally so a failing assertion cannot leak the mock into later tests.
 * @param fn The body to run under suppression
 * @returns The captured error call argument lists
 */
function captureErrors(fn: () => void): unknown[][] {
  const errors: unknown[][] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => {
    errors.push(args);
  };
  try {
    fn();
  } finally {
    console.error = original;
  }
  return errors;
}

describe("dom", () => {
  describe("feature gating defaults", () => {
    test("throwing render logs [dom] and renders no fallback without the errors feature", async () => {
      const [{ resetDom }, { mount }] = await Promise.all([
        import("@hellajs/dom/internal/reset"),
        import("@hellajs/dom/mount"),
      ]);
      resetDom();
      const vnode: HellaNode = {
        tag: "div",
        children: [
          () => {
            throw new Error("boom");
          },
        ],
      };

      const errors = captureErrors(() => mount(vnode, "#app"));

      expect(
        errors.some((args) => args[0] === "[dom]" && (args[1] as Error).message === "boom"),
      ).toBe(true);
      expect(document.getElementById("app")?.querySelector("span")).toBeNull();
    });

    test("svg-tagged nodes render without a namespace without the namespaces feature", async () => {
      const [{ resetDom }, { mount }] = await Promise.all([
        import("@hellajs/dom/internal/reset"),
        import("@hellajs/dom/mount"),
      ]);
      resetDom();
      const vnode: HellaNode = { tag: "svg", children: [{ tag: "circle" }] };

      mount(vnode, "#app");

      const svg = document.getElementById("app")?.querySelector("svg");
      expect(svg).not.toBeNull();
      expect(svg?.namespaceURI).toBe("http://www.w3.org/1999/xhtml");
    });

    test("afterMount hooks never fire without the hooks feature", async () => {
      const [{ resetDom }, { mount }] = await Promise.all([
        import("@hellajs/dom/internal/reset"),
        import("@hellajs/dom/mount"),
      ]);
      resetDom();
      const afterMount = vi.fn(() => {});
      const vnode: HellaNode = { tag: "div", hooks: { afterMount } };

      mount(vnode, "#app");

      expect(afterMount).not.toHaveBeenCalled();
    });

    test("e: buckets bind no listener without the direct-events feature", async () => {
      const [{ resetDom }, { mount }] = await Promise.all([
        import("@hellajs/dom/internal/reset"),
        import("@hellajs/dom/mount"),
      ]);
      resetDom();
      const click = vi.fn(() => {});
      const vnode: HellaNode = { tag: "button", e: { click } };

      mount(vnode, "#app");
      document.getElementById("app")?.querySelector("button")?.click();

      expect(click).not.toHaveBeenCalled();
    });

    test("colon props stay attributes without the routed-props feature", async () => {
      const [{ resetDom }, { mount }] = await Promise.all([
        import("@hellajs/dom/internal/reset"),
        import("@hellajs/dom/mount"),
      ]);
      resetDom();
      // Hand-built vnode — a string "on:click" prop is the un-routed shape the stub
      // default must preserve (typed vnodes expect a handler there).
      const vnode = { tag: "div", props: { "on:click": "handler" } } as unknown as HellaNode;

      mount(vnode, "#app");

      const div = document.getElementById("app")?.querySelector("div");
      expect(div?.getAttribute("on:click")).toBe("handler");
    });

    test("raw children render nothing without the raw feature", async () => {
      const [{ resetDom }, { mount }] = await Promise.all([
        import("@hellajs/dom/internal/reset"),
        import("@hellajs/dom/mount"),
      ]);
      resetDom();
      const vnode: HellaNode = { tag: "div", children: [{ raw: "<span>raw</span>" }] };

      mount(vnode, "#app");

      expect(document.getElementById("app")?.querySelector("span")).toBeNull();
    });

    test("ForEach builds its list fresh without the hydrate entry loaded", async () => {
      const [{ resetDom }, { mount }, { ForEach }] = await Promise.all([
        import("@hellajs/dom/internal/reset"),
        import("@hellajs/dom/mount"),
        import("@hellajs/dom/ForEach"),
      ]);
      resetDom();
      const items = signal(["a", "b"]);
      const vnode = ForEach({
        each: items,
        use: (item: string) => ({ tag: "li", children: [item] }),
      });

      mount({ tag: "ul", children: [vnode] }, "#app");

      const lis = document.getElementById("app")?.querySelectorAll("li");
      expect(lis?.length).toBe(2);
      expect(lis?.[0]?.textContent).toBe("a");
    });
  });
});
