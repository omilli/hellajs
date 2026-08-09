import { describe, test, expect, beforeEach, mock } from "bun:test";
import { flush, signal } from "@hellajs/core";
import { resetTestState, setupContainer, delay, suppressConsole } from "@utils/test-helpers.js";
import { hydrate, html, onError } from "@hellajs/dom/bundle";
import { ssrContainer, fallbackHandler, suppressWarn } from "./helpers";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("hydrate", () => {
    test("attaches a function-ref prop effect to an existing server element without replacing it", () => {
      const className = signal("initial");
      const App = () => html`<div id="root" class=${className}>Hi</div>`;
      const container = ssrContainer(html`<${App} />`);
      const elBefore = container.querySelector("#root")!;

      hydrate(html`<${App} />`, container);
      const elAfter = container.querySelector("#root")!;
      expect(elAfter).toBe(elBefore);
      expect(elAfter.className).toBe("initial");

      className("updated");
      flush();
      expect(elAfter.className).toBe("updated");
    });

    test("registers an on: delegated handler on an existing element", () => {
      const handler = mock(() => {});
      const App = () => html`<button id="btn" on:click=${handler}>Go</button>`;
      const container = ssrContainer(html`<${App} />`);

      hydrate(html`<${App} />`, container);
      document.getElementById("btn")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      expect(handler).toHaveBeenCalledTimes(1);
    });

    test("registers an e: direct handler on an existing element", () => {
      const handler = mock(() => {});
      const App = () => html`<button id="btn" e:click=${handler}>Go</button>`;
      const container = ssrContainer(html`<${App} />`);

      hydrate(html`<${App} />`, container);
      document.getElementById("btn")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      expect(handler).toHaveBeenCalledTimes(1);
    });

    test("skips re-applying static props but updates a function-ref prop reactively", () => {
      const disabled = signal(false);
      const App = () => html`<input id="inp" type="text" data-static="kept" disabled=${() => disabled() ? "disabled" : false} />`;
      const container = ssrContainer(html`<${App} />`);

      hydrate(html`<${App} />`, container);
      const inp = container.querySelector("#inp")!;
      expect(inp.getAttribute("data-static")).toBe("kept");
      expect(inp.hasAttribute("disabled")).toBe(false);

      disabled(true);
      flush();
      expect(inp.hasAttribute("disabled")).toBe(true);
    });

    test("wires a function-ref prop as an effect and skips static props", () => {
      const className = signal("initial");
      const App = () => html`<div id="root" class=${className} data-static="kept">Hi</div>`;
      const container = ssrContainer(html`<${App} />`);
      const elBefore = container.querySelector("#root")!;

      hydrate(html`<${App} />`, container);
      const elAfter = container.querySelector("#root")!;
      expect(elAfter).toBe(elBefore);
      expect(elAfter.className).toBe("initial");
      expect(elAfter.getAttribute("data-static")).toBe("kept");

      className("updated");
      flush();
      expect(elAfter.className).toBe("updated");
    });

    test("a function-ref prop that throws during hydrate dispatches to error:fallback", () => {
      fallbackHandler();
      const shouldThrow = signal(false);
      const App = () => html`
        <div id="boundary" error:fallback=${() => html`<span>Caught</span>`}>
          <span id="rt" data-x=${() => {
            if (shouldThrow()) throw new Error("hydrate-prop");
            return "ok";
          }}>x</span>
        </div>
      `;
      const container = ssrContainer(html`<${App} />`);
      hydrate(html`<${App} />`, container);
      expect(container.querySelector("#rt")!.getAttribute("data-x")).toBe("ok");

      shouldThrow(true);
      flush();
      expect(container.textContent).toBe("Caught");
    });

    test("adopts nested static structure preserving node identity", () => {
      const App = () => html`<div id="root"><span id="a"><b id="b">deep</b></span></div>`;
      const container = ssrContainer(html`<${App} />`);
      const rootBefore = container.querySelector("#root")!;
      const spanBefore = container.querySelector("#a")!;
      const bBefore = container.querySelector("#b")!;

      hydrate(html`<${App} />`, container);
      expect(container.querySelector("#root")).toBe(rootBefore);
      expect(container.querySelector("#a")).toBe(spanBefore);
      expect(container.querySelector("#b")).toBe(bBefore);
    });

    test("hydrates an element-bounded signal text child with siblings preserved", () => {
      const count = signal(0);
      const App = () => html`<div id="root"><span id="before">pre</span><span id="mid">${count}</span><span id="after">post</span></div>`;
      const container = ssrContainer(html`<${App} />`);

      hydrate(html`<${App} />`, container);
      expect(container.querySelector("#before")).not.toBeNull();
      expect(container.querySelector("#after")).not.toBeNull();
      expect(container.querySelector("#mid")!.textContent).toBe("0");

      count(7);
      flush();
      expect(container.querySelector("#mid")!.textContent).toBe("7");
      expect(container.querySelector("#before")!.textContent).toBe("pre");
      expect(container.querySelector("#after")!.textContent).toBe("post");
    });

    test("hydrates a conditional signal child swapping content in place", () => {
      const show = signal(true);
      const App = () => html`<div id="root">${() => show() ? html`<b id="yes">Yes</b>` : html`<b id="no">No</b>`}</div>`;
      const container = ssrContainer(html`<${App} />`);

      hydrate(html`<${App} />`, container);
      expect(container.querySelector("#yes")!.textContent).toBe("Yes");

      show(false);
      flush();
      expect(container.querySelector("#no")!.textContent).toBe("No");
      expect(container.querySelector("#yes")).toBeNull();

      show(true);
      flush();
      expect(container.querySelector("#yes")!.textContent).toBe("Yes");
    });

    test("adopts a marker-bounded reactive text region between static text", () => {
      const count = signal(5);
      const App = () => html`<div id="root">a${count}b</div>`;
      const container = ssrContainer(html`<${App} />`);
      // ssr bounds the reactive value in its own marker region: a<!--[-->5<!--]-->b
      expect(container.querySelector("#root")!.childNodes.length).toBe(5);

      hydrate(html`<${App} />`, container);
      const root = container.querySelector("#root")!;
      expect(root.textContent).toBe("a5b");

      count(9);
      flush();
      expect(root.textContent).toBe("a9b");
    });

    test("hydrates a fragment root with multiple top-level children", () => {
      const App = () => html`<span id="a">A</span><span id="b">B</span>`;
      const container = ssrContainer(html`<${App} />`);
      const aBefore = container.querySelector("#a")!;
      const bBefore = container.querySelector("#b")!;

      hydrate(html`<${App} />`, container);
      expect(container.querySelector("#a")).toBe(aBefore);
      expect(container.querySelector("#b")).toBe(bBefore);
    });

    test("hydrates a nested fragment child inline", () => {
      const App = () => html`<div id="root"><span id="first">a</span>${html`<b id="b">b</b><i id="i">i</i>`}<span id="last">z</span></div>`;
      const container = ssrContainer(html`<${App} />`);
      const firstBefore = container.querySelector("#first")!;
      const bBefore = container.querySelector("#b")!;
      const lastBefore = container.querySelector("#last")!;

      hydrate(html`<${App} />`, container);
      expect(container.querySelector("#first")).toBe(firstBefore);
      expect(container.querySelector("#b")).toBe(bBefore);
      expect(container.querySelector("#last")).toBe(lastBefore);
    });

    test("mounts fresh when the container has no server content", () => {
      const count = signal(1);
      const App = () => html`<div id="root">${count}</div>`;
      const container = setupContainer();

      hydrate(html`<${App} />`, container);
      expect(container.querySelector("#root")!.textContent).toBe("1");

      count(2);
      flush();
      expect(container.querySelector("#root")!.textContent).toBe("2");
    });

    test("renders a reactive fragment toggled from null", () => {
      const show = signal(false);
      const App = () => html`<div id="root">${() => show() ? html`<b id="b">b</b><i id="i">i</i>` : null}</div>`;
      const container = ssrContainer(html`<${App} />`);
      expect(container.querySelector("#b")).toBeNull();

      hydrate(html`<${App} />`, container);
      expect(container.querySelector("#b")).toBeNull();

      show(true);
      flush();
      expect(container.querySelector("#b")!.textContent).toBe("b");
      expect(container.querySelector("#i")!.textContent).toBe("i");
    });

    test("hydrates a static subtree preserving node identity", () => {
      const App = () => html`<div id="root"><span><b>deep</b></span></div>`;
      const container = ssrContainer(html`<${App} />`);
      const spanBefore = container.querySelector("#root")!.querySelector("span")!;

      hydrate(html`<${App} />`, container);
      expect(container.querySelector("#root")!.querySelector("span")).toBe(spanBefore);
    });

    test("throws on a missing target selector", () => {
      expect(() => hydrate(html`<div/>`, "#nope-not-present")).toThrow("[dom] hydrate: target");
    });

    test("warns and re-mounts when a server element is missing", () => {
      const cls = signal("c");
      const App = () => html`<div id="root"><span id="s" class=${cls}>x</span></div>`;
      const container = setupContainer();
      container.innerHTML = `<div id="root"></div>`;

      suppressWarn(() => {
        hydrate(html`<${App} />`, container);
      });
      expect(container.querySelector("#s")).not.toBeNull();
    });

    test("routes a bind error through the boundary fallback on hydrate", () => {
      const captured = suppressConsole();
      const unregister = fallbackHandler();
      const App = () => html`<div id="root" error:fallback=${() => html`<span id="fb">fallback</span>`}><span id="inner" class=${() => { throw new Error("boom"); }}>x</span></div>`;
      const container = setupContainer();
      container.innerHTML = `<div id="root"><span id="inner">x</span></div>`;

      hydrate(html`<${App} />`, container);
      expect(container.querySelector("#fb")).not.toBeNull();
      unregister();
      captured.restore();
    });

    test("warns and subtree-replaces on a tag mismatch", () => {
      const App = () => html`<div id="root">content</div>`;
      const container = setupContainer();
      container.innerHTML = `<span id="root">server-span</span>`;

      const { warnings } = suppressWarn(() => {
        hydrate(html`<${App} />`, container);
      });
      expect(warnings.length).toBeGreaterThan(0);
      expect(container.querySelector("#root")!.tagName).toBe("DIV");
      expect(container.querySelector("#root")!.textContent).toBe("content");
    });

    test("afterMount fires at hydrate; flush() is idempotent and unmount removes the tree", () => {
      const afterMount = mock(() => {});
      const App = () => html`<div id="root" hook:afterMount=${afterMount}>x</div>`;
      const container = ssrContainer(html`<${App} />`);

      const handle = hydrate(html`<${App} />`, container);
      // afterMount fires during hydrate() — no flush() needed; calling it does not re-fire
      expect(afterMount).toHaveBeenCalledTimes(1);
      handle.flush();
      expect(afterMount).toHaveBeenCalledTimes(1);

      handle.unmount();
      expect(container.querySelector("#root")).toBeNull();
    });

    test("fires beforeMount synchronously during hydrate", () => {
      const beforeMount = mock(() => {});
      const App = () => html`<div id="root" hook:beforeMount=${beforeMount}>x</div>`;
      const container = setupContainer();
      container.innerHTML = `<div id="root">x</div>`;

      hydrate(html`<${App} />`, container);
      expect(beforeMount).toHaveBeenCalledTimes(1);
    });

    test("attaches an async component after it resolves", async () => {
      const count = signal(1);
      const App = async () => html`<div id="root">${count}</div>`;
      const container = setupContainer();
      container.innerHTML = `<div id="root"><!--[-->1<!--]--></div>`;

      hydrate(App, container);
      count(2);
      flush();
      expect(container.querySelector("#root")!.textContent).toBe("1");

      await delay();
      count(3);
      flush();
      expect(container.querySelector("#root")!.textContent).toBe("3");
    });

    test("routes an async component rejection through onError", async () => {
      const handler = mock(() => null);
      onError(handler);
      const container = setupContainer();
      container.innerHTML = `<div id="root">x</div>`;

      hydrate(async () => { throw new Error("boom"); }, container);
      await delay();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    test("preserves server DOM across hydrate", () => {
      const App = () => html`<div id="root"><span>A</span><span>B</span></div>`;
      const container = ssrContainer(html`<${App} />`);
      const rootBefore = container.firstChild;
      const spansBefore = container.querySelectorAll("span").length;

      hydrate(html`<${App} />`, container);
      expect(container.firstChild).toBe(rootBefore);
      expect(container.querySelectorAll("span").length).toBe(spansBefore);
    });
  });
});
