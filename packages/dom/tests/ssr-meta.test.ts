import { describe, test, expect } from "bun:test";
import { html, ForEach, Transition, Portal, Lazy } from "@hellajs/dom/bundle";

describe("dom", () => {
  describe("ssr meta", () => {
    // Construction is pure — no mount, no shared state — so no resetTestState.
    // Each isDynamic component tags its returned function with an ssr descriptor
    // { kind, props } consumed type-only by @hellajs/ssr.

    test("ForEach attaches ssr with kind forEach and each/use props", () => {
      const fn = ForEach({ each: [1, 2], use: (n: number) => html`<li>${n}</li>` });

      expect(fn.isDynamic).toBe(true);
      expect(fn.ssr?.kind).toBe("forEach");
      expect(fn.ssr?.props).toHaveProperty("each");
      expect(fn.ssr?.props).toHaveProperty("use");
    });

    test("Transition attaches ssr with kind transition and show/children props", () => {
      const fn = Transition({ show: true, children: html`<p>on</p>` });

      expect(fn.isDynamic).toBe(true);
      expect(fn.ssr?.kind).toBe("transition");
      expect(fn.ssr?.props).toHaveProperty("show");
      expect(fn.ssr?.props).toHaveProperty("children");
    });

    test("Portal attaches ssr with kind portal and to prop", () => {
      const fn = Portal({ to: "#x", children: [] });

      expect(fn.isDynamic).toBe(true);
      expect(fn.ssr?.kind).toBe("portal");
      expect(fn.ssr?.props).toHaveProperty("to");
    });

    test("Lazy attaches ssr with kind lazy and loader/loading props", () => {
      const fn = Lazy({ loader: async () => html`<div />`, loading: html`<span>…</span>` });

      expect(fn.isDynamic).toBe(true);
      expect(fn.ssr?.kind).toBe("lazy");
      expect(fn.ssr?.props).toHaveProperty("loader");
      expect(fn.ssr?.props).toHaveProperty("loading");
    });
  });
});
