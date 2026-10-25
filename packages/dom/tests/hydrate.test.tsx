import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { flush } from "@hellajs/core";
import { resetTestState, setupContainer, delay, suppressConsole } from "@utils/test-helpers.js";
import { hydrate, onError } from "@hellajs/dom";
import type { TemplateBuildFn } from "@hellajs/dom";
import { twoTargetContainer, fallbackHandler, suppressWarn } from "./helpers";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("hydrate", () => {
    test("registers an on: delegated handler on an existing element", async () => {
      const { container, client } = await twoTargetContainer(`
        const hits = { n: 0 };
        const App = () => (
          <button id="btn" on:click={() => { hits.n++; }}>
            Go
          </button>
        );
        const __out = { App, hits };
      `);

      hydrate(client.App as TemplateBuildFn, container);
      document.getElementById("btn")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      expect((client.hits as { n: number }).n).toBe(1);
    });

    test("registers an e: direct handler on an existing element", async () => {
      const { container, client } = await twoTargetContainer(`
        const hits = { n: 0 };
        const App = () => (
          <button id="btn" e:click={() => { hits.n++; }}>
            Go
          </button>
        );
        const __out = { App, hits };
      `);

      hydrate(client.App as TemplateBuildFn, container);
      document.getElementById("btn")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      expect((client.hits as { n: number }).n).toBe(1);
    });

    test("skips re-applying static props but updates a function-ref prop reactively", async () => {
      const { container, client } = await twoTargetContainer(`
        import { signal } from "@hellajs/core";
        const disabled = signal(false);
        const App = () => (
          <input id="inp" type="text" data-static="kept" disabled={() => !!disabled()} />
        );
        const __out = { App, disabled };
      `);

      hydrate(client.App as TemplateBuildFn, container);
      const inp = container.querySelector("#inp")!;
      expect(inp.getAttribute("data-static")).toBe("kept");
      expect(inp.hasAttribute("disabled")).toBe(false);

      (client.disabled as (v: boolean) => void)(true);
      flush();
      expect(inp.hasAttribute("disabled")).toBe(true);
    });

    test("wires a function-ref prop as an effect and skips static props", async () => {
      const { container, client } = await twoTargetContainer(`
        import { signal } from "@hellajs/core";
        const className = signal("initial");
        const App = () => (
          <div id="root" class={className} data-static="kept">
            Hi
          </div>
        );
        const __out = { App, className };
      `);
      const elBefore = container.querySelector("#root")!;

      hydrate(client.App as TemplateBuildFn, container);
      const elAfter = container.querySelector("#root")!;
      expect(elAfter).toBe(elBefore);
      expect(elAfter.className).toBe("initial");
      expect(elAfter.getAttribute("data-static")).toBe("kept");

      (client.className as (v: string) => void)("updated");
      flush();
      expect(elAfter.className).toBe("updated");
    });

    test("removes a server-rendered attribute when the hydrate twin's first computed value is falsy", async () => {
      const { container, client } = await twoTargetContainer(`
        import { signal } from "@hellajs/core";
        const flag = signal("yes");
        const App = () => (
          <div id="root" data-on={flag}>
            Hi
          </div>
        );
        const __out = { App, flag };
      `);
      expect(container.querySelector("#root")!.hasAttribute("data-on")).toBe(true);

      (client.flag as (v: string | undefined) => void)(undefined);
      hydrate(client.App as TemplateBuildFn, container);
      expect(container.querySelector("#root")!.hasAttribute("data-on")).toBe(false);
    });

    test("a function-ref prop that throws during hydrate dispatches to error:fallback", async () => {
      fallbackHandler();
      const { container, client } = await twoTargetContainer(`
        import { signal } from "@hellajs/core";
        const shouldThrow = signal(false);
        const App = () => (
          <div id="boundary" error:fallback={() => <span>Caught</span>}>
            <span
              id="rt"
              data-x={() => {
                if (shouldThrow()) throw new Error("hydrate-prop");
                return "ok";
              }}
            >
              x
            </span>
          </div>
        );
        const __out = { App, shouldThrow };
      `);
      hydrate(client.App as TemplateBuildFn, container);
      expect(container.querySelector("#rt")!.getAttribute("data-x")).toBe("ok");

      (client.shouldThrow as (v: boolean) => void)(true);
      flush();
      expect(container.textContent).toBe("Caught");
    });

    test("adopts nested static structure preserving node identity", async () => {
      const { container, client } = await twoTargetContainer(`
        const App = () => (
          <div id="root">
            <span id="a">
              <b id="b">deep</b>
            </span>
          </div>
        );
        const __out = { App };
      `);
      const rootBefore = container.querySelector("#root")!;
      const spanBefore = container.querySelector("#a")!;
      const bBefore = container.querySelector("#b")!;

      hydrate(client.App as TemplateBuildFn, container);
      expect(container.querySelector("#root")).toBe(rootBefore);
      expect(container.querySelector("#a")).toBe(spanBefore);
      expect(container.querySelector("#b")).toBe(bBefore);
    });

    test("hydrates an element-bounded signal text child with siblings preserved", async () => {
      const { container, client } = await twoTargetContainer(`
        import { signal } from "@hellajs/core";
        const count = signal(0);
        const App = () => (
          <div id="root">
            <span id="before">pre</span>
            <span id="mid">{count}</span>
            <span id="after">post</span>
          </div>
        );
        const __out = { App, count };
      `);

      hydrate(client.App as TemplateBuildFn, container);
      expect(container.querySelector("#before")).not.toBeNull();
      expect(container.querySelector("#after")).not.toBeNull();
      expect(container.querySelector("#mid")!.textContent).toBe("0");

      (client.count as (v: number) => void)(7);
      flush();
      expect(container.querySelector("#mid")!.textContent).toBe("7");
      expect(container.querySelector("#before")!.textContent).toBe("pre");
      expect(container.querySelector("#after")!.textContent).toBe("post");
    });

    test("hydrates a conditional signal child swapping content in place", async () => {
      const { container, client } = await twoTargetContainer(`
        import { signal } from "@hellajs/core";
        const show = signal(true);
        const App = () => (
          <div id="root">{() => (show() ? <b id="yes">Yes</b> : <b id="no">No</b>)}</div>
        );
        const __out = { App, show };
      `);

      hydrate(client.App as TemplateBuildFn, container);
      expect(container.querySelector("#yes")!.textContent).toBe("Yes");

      (client.show as (v: boolean) => void)(false);
      flush();
      expect(container.querySelector("#no")!.textContent).toBe("No");
      expect(container.querySelector("#yes")).toBeNull();

      (client.show as (v: boolean) => void)(true);
      flush();
      expect(container.querySelector("#yes")!.textContent).toBe("Yes");
    });

    test("adopts a marker-bounded reactive text region between static text", async () => {
      const { container, client } = await twoTargetContainer(`
        import { signal } from "@hellajs/core";
        const count = signal(5);
        const App = () => <div id="root">a{count}b</div>;
        const __out = { App, count };
      `);
      // ssr bounds the reactive value in its own marker region: a<!--[->5<!--]-->b
      expect(container.querySelector("#root")!.childNodes.length).toBe(5);

      hydrate(client.App as TemplateBuildFn, container);
      const root = container.querySelector("#root")!;
      expect(root.textContent).toBe("a5b");

      (client.count as (v: number) => void)(9);
      flush();
      expect(root.textContent).toBe("a9b");
    });

    test("hydrates a fragment root with multiple top-level children", async () => {
      const { container, client } = await twoTargetContainer(`
        const App = () => (
          <>
            <span id="a">A</span>
            <span id="b">B</span>
          </>
        );
        const __out = { App };
      `);
      const aBefore = container.querySelector("#a")!;
      const bBefore = container.querySelector("#b")!;

      hydrate(client.App as TemplateBuildFn, container);
      expect(container.querySelector("#a")).toBe(aBefore);
      expect(container.querySelector("#b")).toBe(bBefore);
    });

    test("hydrates a nested fragment child inline", async () => {
      const { container, client } = await twoTargetContainer(`
        const App = () => (
          <div id="root">
            <span id="first">a</span>
            {
              <>
                <b id="b">b</b>
                <i id="i">i</i>
              </>
            }
            <span id="last">z</span>
          </div>
        );
        const __out = { App };
      `);
      const firstBefore = container.querySelector("#first")!;
      const bBefore = container.querySelector("#b")!;
      const lastBefore = container.querySelector("#last")!;

      hydrate(client.App as TemplateBuildFn, container);
      expect(container.querySelector("#first")).toBe(firstBefore);
      expect(container.querySelector("#b")).toBe(bBefore);
      expect(container.querySelector("#last")).toBe(lastBefore);
    });

    test("mounts fresh when the container has no server content", async () => {
      const { container, client } = await twoTargetContainer(`
        import { signal } from "@hellajs/core";
        const count = signal(1);
        const App = () => <div id="root">{count}</div>;
        const __out = { App, count };
      `);

      hydrate(client.App as TemplateBuildFn, container);
      expect(container.querySelector("#root")!.textContent).toBe("1");

      (client.count as (v: number) => void)(2);
      flush();
      expect(container.querySelector("#root")!.textContent).toBe("2");
    });

    test("renders a reactive fragment toggled from null", async () => {
      const { container, client } = await twoTargetContainer(`
        import { signal } from "@hellajs/core";
        const show = signal(false);
        const App = () => (
          <div id="root">
            {() =>
              show() ? (
                <>
                  <b id="b">b</b>
                  <i id="i">i</i>
                </>
              ) : null
            }
          </div>
        );
        const __out = { App, show };
      `);
      expect(container.querySelector("#b")).toBeNull();

      hydrate(client.App as TemplateBuildFn, container);
      expect(container.querySelector("#b")).toBeNull();

      (client.show as (v: boolean) => void)(true);
      flush();
      expect(container.querySelector("#b")!.textContent).toBe("b");
      expect(container.querySelector("#i")!.textContent).toBe("i");
    });

    test("hydrates a static subtree preserving node identity", async () => {
      const { container, client } = await twoTargetContainer(`
        const App = () => (
          <div id="root">
            <span>
              <b>deep</b>
            </span>
          </div>
        );
        const __out = { App };
      `);
      const spanBefore = container.querySelector("#root")!.querySelector("span")!;

      hydrate(client.App as TemplateBuildFn, container);
      expect(container.querySelector("#root")!.querySelector("span")).toBe(spanBefore);
    });

    test("throws on a missing target selector", () => {
      expect(() => hydrate(() => ({}) as never, "#nope-not-present")).toThrow(
        "[dom] hydrate: target",
      );
    });

    test("rejects hand-built HellaNode input with the documented message", async () => {
      const { container, server } = await twoTargetContainer(`
        const App = () => <div id="root">x</div>;
        const __out = { App };
      `);
      // The server arm's component produces HellaNode ASTs — hydrating THAT is exactly the
      // rejected hand-built shape (the ast-compiled component fn resolves to a vnode).
      expect(() =>
        hydrate(() => (server.App as () => unknown)() as TemplateBuildFn, container),
      ).toThrow("[dom] hydrate: hand-built HellaNode input is not supported");
    });

    test("warns and re-mounts when a server element is missing", async () => {
      const { container, client } = await twoTargetContainer(`
        import { signal } from "@hellajs/core";
        const cls = signal("c");
        const App = () => (
          <div id="root">
            <span id="s" class={cls}>
              x
            </span>
          </div>
        );
        const __out = { App, cls };
      `);
      container.innerHTML = `<div id="root"></div>`;

      // The flagged adoption contract: a claim with no matching server node is divergence —
      // the walker-era warn + fresh-mount degradation does not exist for imperative roots.
      expect(() =>
        suppressWarn(() => {
          hydrate(client.App as TemplateBuildFn, container);
        }),
      ).toThrow("[dom] hydrate: unmatched server DOM for imperative root");
    });

    test("routes a bind error through the boundary fallback on hydrate", async () => {
      const captured = suppressConsole();
      try {
        const unregister = fallbackHandler();
        const { container, client } = await twoTargetContainer(`
          import { signal } from "@hellajs/core";
          const armed = signal(false);
          const App = () => (
            <div id="root" error:fallback={() => <span id="fb">fallback</span>}>
              <span
                id="inner"
                class={() => {
                  if (armed()) throw new Error("boom");
                  return "ok";
                }}
              >
                x
              </span>
            </div>
          );
          const __out = { App, armed };
        `);
        // The server rendered "ok"; arming before hydrate makes the hydrate-time first
        // effect run the throwing branch (the hand-written server HTML matches the shape).
        (client.armed as (v: boolean) => void)(true);
        container.innerHTML = `<div id="root"><span id="inner">x</span></div>`;

        hydrate(client.App as TemplateBuildFn, container);
        expect(container.querySelector("#fb")).not.toBeNull();
        unregister();
      } finally {
        captured.restore();
      }
    });

    test("throws the mismatch error on a root tag mismatch", async () => {
      const { container, client } = await twoTargetContainer(`
        const App = () => <div id="root">content</div>;
        const __out = { App };
      `);
      container.innerHTML = `<span id="root">server-span</span>`;

      // The flagged adoption contract: a root claim against a mismatching server element is
      // divergence — the walker-era warn + subtree-replace does not exist for imperative roots.
      expect(() =>
        suppressWarn(() => {
          hydrate(client.App as TemplateBuildFn, container);
        }),
      ).toThrow("[dom] hydrate: unmatched server DOM for imperative root");
    });

    test("null/false children consume no server node (ssr renders nothing for them)", async () => {
      const { container, client } = await twoTargetContainer(`
        const App = () => (
          <div id="root">
            {null}
            {undefined}
            {false}
            <span id="after">end</span>
          </div>
        );
        const __out = { App };
      `);

      const { warnings } = suppressWarn(() => {
        hydrate(client.App as TemplateBuildFn, container);
      });
      expect(warnings).toEqual([]);
      expect(container.querySelector("#after")!.textContent).toBe("end");
      // null/false rendered nothing server-side — the span is the div's only child
      expect(container.querySelector("#root")!.children.length).toBe(1);
    });

    test("nested array children hydrate positionally in order (the JSX `{items.map(…)}` shape)", async () => {
      const { container, client } = await twoTargetContainer(`
        const App = () => (
          <ul id="root">
            <li>first</li>
            {["second", "third"].map((t) => (
              <li>{t}</li>
            ))}
          </ul>
        );
        const __out = { App };
      `);

      const { warnings } = suppressWarn(() => {
        hydrate(client.App as TemplateBuildFn, container);
      });
      expect(warnings).toEqual([]);
      const items = container.querySelectorAll("li");
      expect([...items].map((li) => li.textContent)).toEqual(["first", "second", "third"]);
      // adopted in place — no replacement subtree mounted after the list
      expect(container.querySelector("#root")!.children.length).toBe(3);
    });

    test("afterMount fires at hydrate; flush() is idempotent and unmount removes the tree", async () => {
      const { container, client } = await twoTargetContainer(`
        const hits = { n: 0 };
        const App = () => (
          <div id="root" hook:afterMount={() => { hits.n++; }}>
            x
          </div>
        );
        const __out = { App, hits };
      `);

      const handle = hydrate(client.App as TemplateBuildFn, container);
      // afterMount fires during hydrate() — no flush() needed; calling it does not re-fire
      expect((client.hits as { n: number }).n).toBe(1);
      handle.flush();
      expect((client.hits as { n: number }).n).toBe(1);

      handle.unmount();
      expect(container.querySelector("#root")).toBeNull();
    });

    test("fires beforeMount synchronously during hydrate", async () => {
      const { container, client } = await twoTargetContainer(`
        const hits = { n: 0 };
        const App = () => (
          <div id="root" hook:beforeMount={() => { hits.n++; }}>
            x
          </div>
        );
        const __out = { App, hits };
      `);
      container.innerHTML = `<div id="root">x</div>`;

      hydrate(client.App as TemplateBuildFn, container);
      expect((client.hits as { n: number }).n).toBe(1);
    });

    test("attaches an async component after it resolves", async () => {
      const { container, client } = await twoTargetContainer(`
        import { signal } from "@hellajs/core";
        const count = signal(1);
        const App = async () => <div id="root">{count}</div>;
        const __out = { App, count };
      `);
      container.innerHTML = `<div id="root"><!--[-->1<!--]--></div>`;

      hydrate(() => (client.App as () => Promise<TemplateBuildFn>)(), container);
      (client.count as (v: number) => void)(2);
      flush();
      expect(container.querySelector("#root")!.textContent).toBe("1");

      await delay();
      (client.count as (v: number) => void)(3);
      flush();
      expect(container.querySelector("#root")!.textContent).toBe("3");
    });

    test("routes an async component rejection through onError", async () => {
      const handler = vi.fn(() => null);
      onError(handler);
      const container = setupContainer();
      container.innerHTML = `<div id="root">x</div>`;

      hydrate(async () => {
        throw new Error("boom");
      }, container);
      await delay();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    test("preserves server DOM across hydrate", async () => {
      const { container, client } = await twoTargetContainer(`
        const App = () => (
          <div id="root">
            <span>A</span>
            <span>B</span>
          </div>
        );
        const __out = { App };
      `);
      const rootBefore = container.firstChild;
      const spansBefore = container.querySelectorAll("span").length;

      hydrate(client.App as TemplateBuildFn, container);
      expect(container.firstChild).toBe(rootBefore);
      expect(container.querySelectorAll("span").length).toBe(spansBefore);
    });
  });
});
