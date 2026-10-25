import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { flush } from "@hellajs/core";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { hydrate, onError } from "@hellajs/dom";
import type { TemplateBuildFn } from "@hellajs/dom";
import { twoTargetContainer, twoTargetStreamed, suppressWarn, fallbackHandler } from "./helpers";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("hydrate mismatch and degradation", () => {
    test("throws the mismatch error when a static subtree's tag mismatches the server HTML", async () => {
      const { container, client } = await twoTargetContainer(`
        const App = () => (
          <div id="s">
            <span>server</span>
          </div>
        );
        const __out = { App };
      `);
      container.innerHTML = "<section><span>server</span></section>";

      // The flagged adoption contract: a root claim against a mismatching server element is
      // divergence — the walker-era warn + subtree-replace does not exist for imperative roots.
      expect(() =>
        suppressWarn(() => {
          hydrate(client.App as TemplateBuildFn, container);
        }),
      ).toThrow("[dom] hydrate: unmatched server DOM for imperative root");
    });

    test("routes a throwing function-ref prop through the boundary fallback on hydrate", async () => {
      const { container, client } = await twoTargetContainer(`
        import { signal } from "@hellajs/core";
        const shouldThrow = signal(false);
        const App = () => (
          <div error:fallback={() => <span>Caught</span>}>
            <span
              id="p"
              data-x={() => {
                if (shouldThrow()) throw new Error("prop");
                return "ok";
              }}
            ></span>
          </div>
        );
        const __out = { App, shouldThrow };
      `);
      hydrate(client.App as TemplateBuildFn, container);
      expect(container.querySelector("#p")?.getAttribute("data-x")).toBe("ok");

      fallbackHandler();
      (client.shouldThrow as (v: boolean) => void)(true);
      flush();

      expect(container.textContent).toBe("Caught");
    });

    test("re-renders a hydrated reactive region through the proxy path when it resolves to an isDynamic component", async () => {
      const { container, client } = await twoTargetContainer(`
        import { signal } from "@hellajs/core";
        const toggle = signal(null);
        const App = () => <div id="host">{toggle}</div>;
        const __out = { App, toggle };
      `);
      hydrate(client.App as TemplateBuildFn, container);

      const Dyn = ((parent: Element) => {
        parent.appendChild(document.createElement("span")).textContent = "dyn";
      }) as (() => void) & { isDynamic: boolean; nodeType?: number };
      Dyn.isDynamic = true;
      Dyn.nodeType = 1;

      (client.toggle as (v: unknown) => void)(Dyn);
      flush();

      expect(container.querySelector("#host span")?.textContent).toBe("dyn");
      expect(container.textContent).not.toContain("[object");
    });

    test("dispatches a hydrated reactive region that throws on re-run", async () => {
      const { container, client } = await twoTargetContainer(`
        import { signal } from "@hellajs/core";
        const shouldThrow = signal(false);
        const App = () => (
          <div>
            {() => {
              if (shouldThrow()) throw new Error("region");
              return "ok";
            }}
          </div>
        );
        const __out = { App, shouldThrow };
      `);
      hydrate(client.App as TemplateBuildFn, container);
      expect(container.textContent).toBe("ok");

      const handler = vi.fn(() => null);
      onError(handler);
      (client.shouldThrow as (v: boolean) => void)(true);
      flush();

      expect(handler).toHaveBeenCalledTimes(1);
      const context = ((handler.mock.calls[0] as unknown[])[1] as { phase: string }).phase;
      expect(context).toBe("mount");
      onError(null);
    });

    test("throws the mismatch error when a raw child's region markers are missing", async () => {
      const { container, client } = await twoTargetContainer(`
        import { raw } from "@hellajs/dom";
        const App = () => <div id="rawhost">{raw("<b>client</b>")}</div>;
        const __out = { App };
      `);
      container.innerHTML = '<div id="rawhost"><b>server</b></div>';

      // Raw regions are always marker-bounded; a missing marker is divergence.
      expect(() =>
        suppressWarn(() => {
          hydrate(client.App as TemplateBuildFn, container);
        }),
      ).toThrow("[dom] hydrate: unmatched server DOM for imperative root");
    });

    test("warns and fresh-mounts a reactive child when its region markers are missing", async () => {
      const { container, client } = await twoTargetContainer(`
        const App = () => <div id="rh">{() => "client"}</div>;
        const __out = { App };
      `);
      container.innerHTML = '<div id="rh">server</div>';

      const { warnings } = suppressWarn(() => {
        hydrate(client.App as TemplateBuildFn, container);
      });

      expect(container.querySelector("#rh")?.textContent).toContain("client");
      expect(warnings.length).toBe(1);
    });

    test("gathers nested regions depth-aware when a fragment contains a direct reactive child", async () => {
      const { container, client } = await twoTargetContainer(`
        const Frag = () => (
          <>
            {() => "a"}
            <i>b</i>
          </>
        );
        const App = () => (
          <div id="ng">
            <Frag></Frag>
          </div>
        );
        const __out = { App };
      `);

      hydrate(client.App as TemplateBuildFn, container);

      expect(container.querySelectorAll("#ng i")).toHaveLength(1);
      expect(container.textContent).toContain("a");
      expect(container.textContent).toContain("b");
    });

    test("adopts the region content when an open marker has no matching close", async () => {
      const { container, client } = await twoTargetContainer(`
        const App = () => <div id="ur">{() => "client"}</div>;
        const __out = { App };
      `);
      container.innerHTML = '<div id="ur"><!--[-->server</div>';

      hydrate(client.App as TemplateBuildFn, container);

      expect(container.querySelector("#ur")?.textContent).toContain("server");
    });

    test("re-suspends on the client when a suspense stage template never arrived", async () => {
      const { container, client } = await twoTargetStreamed(`
        import { Suspense } from "@hellajs/dom";
        const App = () => (
          <div>
            <Suspense fallback={<p>loading</p>}>{() => Promise.resolve(<b>resolved</b>)}</Suspense>
          </div>
        );
        const __out = { App };
      `);
      container.querySelector("template")?.remove();

      suppressWarn(() => {
        hydrate(client.App as TemplateBuildFn, container);
      });
      expect(container.textContent).toContain("loading");

      await delay();

      expect(container.querySelector("b")?.textContent).toBe("resolved");
      expect(container.textContent).not.toContain("loading");
      expect(container.textContent).not.toContain("[object");
    });

    test("bubbles a degradation rejection to onError and drops the fallback", async () => {
      const { container, client } = await twoTargetStreamed(`
        import { Suspense } from "@hellajs/dom";
        import { signal } from "@hellajs/core";
        const failNow = signal(false);
        const App = () => (
          <div>
            <Suspense fallback={<p>loading</p>}>
              {() => (failNow() ? Promise.reject(new Error("stage boom")) : Promise.resolve(<b>ok</b>))}
            </Suspense>
          </div>
        );
        const __out = { App, failNow };
      `);
      container.querySelector("template")?.remove();

      const handler = vi.fn(() => null);
      onError(handler);
      (client.failNow as (v: boolean) => void)(true);
      suppressWarn(() => {
        hydrate(client.App as TemplateBuildFn, container);
      });
      // a synchronously-rejected promise chains .then(f).catch(g) over two microtask hops —
      // delay(0) crosses a macrotask boundary, draining the pending microtask queue before firing
      await delay(0);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(container.textContent).not.toContain("loading");
      expect(container.textContent).not.toContain("[object");
      onError(null);
    });

    test("adopts inline children without re-suspending under non-streamed ssr", async () => {
      const { container, client } = await twoTargetContainer(`
        import { Suspense } from "@hellajs/dom";
        const App = () => (
          <div>
            <Suspense fallback={<p>loading</p>}>{<b id="nb">inline</b>}</Suspense>
          </div>
        );
        const __out = { App };
      `);

      const { warnings } = suppressWarn(() => {
        hydrate(client.App as TemplateBuildFn, container);
      });

      expect(container.querySelectorAll("#nb")).toHaveLength(1);
      expect(container.textContent).toContain("inline");
      expect(warnings.length).toBe(0);
    });

    test("throws the mismatch error when a non-static element's tag mismatches the server HTML", async () => {
      const { container, client } = await twoTargetContainer(`
        const App = () => (
          <div id="ns">
            <span>{() => "client"}</span>
          </div>
        );
        const __out = { App };
      `);
      container.innerHTML = "<section><span>server</span></section>";

      expect(() =>
        suppressWarn(() => {
          hydrate(client.App as TemplateBuildFn, container);
        }),
      ).toThrow("[dom] hydrate: unmatched server DOM for imperative root");
    });

    test("dispatches a throwing beforeMount hook during hydrate and continues mounting", async () => {
      const handler = vi.fn(() => null);
      onError(handler);
      const { container, client } = await twoTargetContainer(`
        const App = () => (
          <div
            id="bm"
            hook:beforeMount={() => {
              throw new Error("beforeMount hydrate");
            }}
          >
            x
          </div>
        );
        const __out = { App };
      `);

      hydrate(client.App as TemplateBuildFn, container);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(container.querySelector("#bm")?.textContent).toBe("x");
      onError(null);
    });

    test("adopts children in place when a fragment's markers are missing", async () => {
      const { container, client } = await twoTargetContainer(`
        const Frag = () => (
          <>
            <i>a</i>
            <i>b</i>
          </>
        );
        const App = () => (
          <div id="fg">
            <Frag></Frag>
          </div>
        );
        const __out = { App };
      `);
      container.innerHTML = '<div id="fg"><i>a</i><i>b</i></div>';

      // Fragment builds claim their static roots positionally — markers are not required.
      hydrate(client.App as TemplateBuildFn, container);

      expect(container.querySelectorAll("#fg i")).toHaveLength(2);
    });

    test("unmount before an async hydrate attaches cancels the late resolution", async () => {
      const { container, client } = await twoTargetContainer(`
        const App = () => <div id="hlate">late</div>;
        const __out = { App };
      `);
      container.innerHTML = "<div>server</div>";
      let resolveHydrate: () => void = () => {};
      const slow = () =>
        new Promise<void>((resolve) => {
          resolveHydrate = resolve;
        }).then(() => client.App as TemplateBuildFn);

      const handle = hydrate(slow, container);
      handle.unmount();
      resolveHydrate();
      await delay();

      expect(container.textContent).toBe("server");
    });
  });
});
