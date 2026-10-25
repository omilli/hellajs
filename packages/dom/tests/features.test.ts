import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { signal } from "@hellajs/core";
import type { TemplateBuildFn } from "@hellajs/dom";

// Feature-free module graph by construction: the module registry is reset per test and
// every import is a subpath re-imported dynamically, never the `@hellajs/dom` barrel —
// the barrel's error/raw/hydrate entries load their features at module init, which would
// defeat the stub-default assertions (and the runner shares module registries across
// files in a fork, so earlier barrel-loading suites pollute static imports). The same
// constraint keeps `@utils/test-helpers.js` out (it imports the barrel), so the reset
// and the console suppression are local to this file. Trees build through the runtime
// module (feature-free by design) — hand-built vnode mounts are the rejected input.
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
      const [{ resetDom }, { mount }, { mark, template, child }] = await Promise.all([
        import("@hellajs/dom/internal/reset"),
        import("@hellajs/dom/mount"),
        import("@hellajs/dom/runtime"),
      ]);
      resetDom();
      const build: TemplateBuildFn = mark(() => {
        const el = template('<div id="root"></div>')();
        child(el, () => {
          throw new Error("boom");
        });
        return el;
      });

      const errors = captureErrors(() => mount(build, "#app"));

      expect(
        errors.some((args) => args[0] === "[dom]" && (args[1] as Error).message === "boom"),
      ).toBe(true);
      expect(document.getElementById("app")?.querySelector("span")).toBeNull();
    });

    test("svg templates parse in the SVG namespace without the namespaces feature", async () => {
      const [{ resetDom }, { mount }, { mark, template }] = await Promise.all([
        import("@hellajs/dom/internal/reset"),
        import("@hellajs/dom/mount"),
        import("@hellajs/dom/runtime"),
      ]);
      resetDom();
      const build: TemplateBuildFn = mark(() =>
        template('<svg id="icon"><circle id="c"></circle></svg>')(),
      );

      mount(build, "#app");

      const svg = document.getElementById("app")?.querySelector("svg");
      expect(svg).not.toBeNull();
      expect(svg?.namespaceURI).toBe("http://www.w3.org/2000/svg");
      expect(document.getElementById("c")?.constructor.name).toBe("SVGCircleElement");
    });

    test("afterMount hooks never fire without the hooks feature", async () => {
      const [{ resetDom }, { mount }, { mark, template, hook }] = await Promise.all([
        import("@hellajs/dom/internal/reset"),
        import("@hellajs/dom/mount"),
        import("@hellajs/dom/runtime"),
      ]);
      resetDom();
      const afterMount = vi.fn(() => {});
      const build: TemplateBuildFn = mark(() => {
        const el = template('<div id="root">x</div>')();
        hook(el, "afterMount", afterMount);
        return el;
      });

      mount(build, "#app");

      expect(afterMount).not.toHaveBeenCalled();
    });

    test("e: buckets bind no listener without the direct-events feature", async () => {
      const [{ resetDom }, { mount }, { mark, template, direct }] = await Promise.all([
        import("@hellajs/dom/internal/reset"),
        import("@hellajs/dom/mount"),
        import("@hellajs/dom/runtime"),
      ]);
      resetDom();
      const click = vi.fn(() => {});
      const build: TemplateBuildFn = mark(() => {
        const el = template('<button id="btn">go</button>')();
        direct(el, "click", click);
        return el;
      });

      mount(build, "#app");
      document.getElementById("btn")?.click();

      expect(click).not.toHaveBeenCalled();
    });

    test("raw children render nothing without the raw feature", async () => {
      const [{ resetDom }, { mount }, { mark, template, child }] = await Promise.all([
        import("@hellajs/dom/internal/reset"),
        import("@hellajs/dom/mount"),
        import("@hellajs/dom/runtime"),
      ]);
      resetDom();
      const build: TemplateBuildFn = mark(() => {
        const el = template('<div id="root"></div>')();
        child(el, { raw: "<span>raw</span>" });
        return el;
      });

      mount(build, "#app");

      expect(document.getElementById("app")?.querySelector("span")).toBeNull();
    });

    test("ForEach builds its list fresh without the hydrate entry loaded", async () => {
      const [{ resetDom }, { mount }, { mark, template, child }, { ForEach }] = await Promise.all([
        import("@hellajs/dom/internal/reset"),
        import("@hellajs/dom/mount"),
        import("@hellajs/dom/runtime"),
        import("@hellajs/dom/ForEach"),
      ]);
      resetDom();
      const items = signal(["a", "b"]);
      const build: TemplateBuildFn = mark(() => {
        const el = template('<ul id="root"></ul>')();
        child(el, ForEach({ each: items, use: (item: string) => template(`<li>${item}</li>`)() }));
        return el;
      });

      mount(build, "#app");

      const lis = document.getElementById("app")?.querySelectorAll("li");
      expect(lis?.length).toBe(2);
      expect(lis?.[0]?.textContent).toBe("a");
    });

    test("template clones skip the custom-element upgrade without the feature", async () => {
      const [{ resetDom }, { template }] = await Promise.all([
        import("@hellajs/dom/internal/reset"),
        import("@hellajs/dom/runtime"),
      ]);
      resetDom();
      // Builder creation (the parse) precedes the define — the compiled-app reality,
      // where template calls hoist to module evaluation. No insertion: the platform's
      // insert-time upgrade must stay out of the observation.
      const build = template('<gate-plain id="gate-plain"></gate-plain>');
      class GatePlain extends HTMLElement {}
      customElements.define("gate-plain", GatePlain);

      const el = build() as HTMLElement;

      // The documented default: without the feature the create path returns a plain
      // HTMLElement (this asserts the no-op seam, not a failure — it never upgrades).
      expect(el).not.toBeInstanceOf(GatePlain);
    });

    test("template clones upgrade defined custom elements with the feature loaded", async () => {
      const [{ resetDom }, { template }] = await Promise.all([
        import("@hellajs/dom/internal/reset"),
        import("@hellajs/dom/runtime"),
        import("@hellajs/dom/features/custom-elements"),
      ]);
      resetDom();
      const build = template('<gate-loaded id="gate-loaded"></gate-loaded>');
      class GateLoaded extends HTMLElement {}
      customElements.define("gate-loaded", GateLoaded);

      const el = build() as HTMLElement;

      expect(el).toBeInstanceOf(GateLoaded);
    });

    test("standard templates take the no-op path alongside the upgrade path", async () => {
      const [{ resetDom }, { template }] = await Promise.all([
        import("@hellajs/dom/internal/reset"),
        import("@hellajs/dom/runtime"),
        import("@hellajs/dom/features/custom-elements"),
      ]);
      resetDom();
      const custom = template('<div id="host"><gate-mixed id="gate-mixed"></gate-mixed></div>');
      const standard = template('<div id="plain"></div>');
      class GateMixed extends HTMLElement {}
      customElements.define("gate-mixed", GateMixed);

      const host = custom() as HTMLElement;

      // The hyphenated descendant upgrades in the fresh clone; the standard template's
      // create took the no-op path (no scan) and returns its plain clone untouched.
      expect(host.querySelector("#gate-mixed")).toBeInstanceOf(GateMixed);
      expect((standard() as HTMLElement).tagName).toBe("DIV");
    });
  });
});
