import { describe, test, expect, beforeEach, mock } from "bun:test";
import { flush, signal } from "@hellajs/core";
import { delay, resetTestState, setupContainer } from "@utils/test-helpers.js";
import { hydrate, html, onError, raw, Suspense } from "@hellajs/dom/bundle";
import { ssrContainer, streamContainer, suppressWarn, fallbackHandler } from "./helpers";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("hydrate mismatch and degradation", () => {
    test("warns and subtree-replaces when a static subtree's tag mismatches the server HTML", () => {
      const container = setupContainer();
      container.innerHTML = "<section><span>server</span></section>";

      const { warnings } = suppressWarn(() => {
        hydrate(html`<div id="s"><span>server</span></div>`, container);
      });

      expect(container.querySelector("div#s")?.textContent).toBe("server");
      expect(container.querySelector("section")).toBeNull();
      expect(warnings.length).toBe(1);
    });

    test("routes a throwing function-ref prop through the boundary fallback on hydrate", () => {
      const shouldThrow = signal(false);
      const App = () => html`
        <div error:fallback=${() => html`<span>Caught</span>`}>
          <span id="p" data-x=${() => {
            if (shouldThrow()) throw new Error("prop");
            return "ok";
          }}></span>
        </div>
      `;
      const container = ssrContainer(html`<${App} />`);
      hydrate(html`<${App} />`, container);
      expect(container.querySelector("#p")?.getAttribute("data-x")).toBe("ok");

      fallbackHandler();
      shouldThrow(true);
      flush();

      expect(container.textContent).toBe("Caught");
    });

    test("re-renders a hydrated reactive region through the proxy path when it resolves to an isDynamic component", () => {
      const toggle = signal<(() => void) | null>(null);
      const App = () => html`<div id="host">${() => toggle()}</div>`;
      const container = ssrContainer(html`<${App} />`);
      hydrate(html`<${App} />`, container);

      const accessedNodeType = mock(() => {});
      const Dyn = ((parent: Element) => {
        const nodeType = (parent as unknown as { nodeType: number }).nodeType;
        if (nodeType !== undefined) accessedNodeType();
        parent.appendChild(document.createElement("span")).textContent = "dyn";
      }) as (() => void) & { isDynamic: boolean };
      Dyn.isDynamic = true;

      toggle(Dyn);
      flush();

      expect(container.querySelector("#host span")?.textContent).toBe("dyn");
      expect(accessedNodeType).toHaveBeenCalledTimes(1);
      expect(container.textContent).not.toContain("[object");
    });

    test("dispatches a hydrated reactive region that throws on re-run", () => {
      const shouldThrow = signal(false);
      const App = () => html`
        <div>
          ${() => {
            if (shouldThrow()) throw new Error("region");
            return "ok";
          }}
        </div>
      `;
      const container = ssrContainer(html`<${App} />`);
      hydrate(html`<${App} />`, container);
      expect(container.textContent).toBe("ok");

      const handler = mock(() => null);
      onError(handler);
      shouldThrow(true);
      flush();

      expect(handler).toHaveBeenCalledTimes(1);
      const context = ((handler.mock.calls[0] as unknown[])[1] as { phase: string }).phase;
      expect(context).toBe("mount");
      onError(null);
    });

    test("warns and freshly inserts a raw child when its region markers are missing", () => {
      const container = setupContainer();
      container.innerHTML = '<div id="rawhost"><b>server</b></div>';

      const { warnings } = suppressWarn(() => {
        hydrate(html`<div id="rawhost">${raw("<b>client</b>")}</div>`, container);
      });

      expect(container.querySelectorAll("#rawhost b")).toHaveLength(2);
      expect(container.textContent).toContain("client");
      expect(warnings.length).toBe(1);
    });

    test("warns and fresh-mounts a reactive child when its region markers are missing", () => {
      const container = setupContainer();
      container.innerHTML = '<div id="rh">server</div>';

      const { warnings } = suppressWarn(() => {
        hydrate(html`<div id="rh">${() => "client"}</div>`, container);
      });

      expect(container.querySelector("#rh")?.textContent).toContain("client");
      expect(warnings.length).toBe(1);
    });

    test("warns and renders an isDynamic child into an empty region when its markers are missing", () => {
      const Dyn = () => {
        const fn = ((parent: Element) => {
          parent.appendChild(document.createElement("em")).textContent = "dyn";
        }) as (() => void) & { isDynamic: boolean };
        fn.isDynamic = true;
        return fn;
      };

      const container = setupContainer();
      container.innerHTML = '<div id="dh"></div>';

      const { warnings } = suppressWarn(() => {
        hydrate(html`<div id="dh"><${Dyn}></${Dyn}></div>`, container);
      });

      expect(container.querySelector("#dh em")?.textContent).toBe("dyn");
      expect(warnings.length).toBe(1);
    });

    test("gathers nested regions depth-aware when a fragment contains a direct reactive child", () => {
      const Frag = () => html`${() => "a"}<i>b</i>`;
      const App = () => html`<div id="ng"><${Frag}></${Frag}></div>`;
      const container = ssrContainer(html`<${App} />`);

      hydrate(html`<${App} />`, container);

      expect(container.querySelectorAll("#ng i")).toHaveLength(1);
      expect(container.textContent).toContain("a");
      expect(container.textContent).toContain("b");
    });

    test("adopts the region content when an open marker has no matching close", () => {
      const container = setupContainer();
      container.innerHTML = '<div id="ur"><!--[-->server</div>';

      hydrate(html`<div id="ur">${() => "client"}</div>`, container);

      expect(container.querySelector("#ur")?.textContent).toContain("server");
    });

    test("re-suspends on the client when a suspense stage template never arrived", async () => {
      const App = () => html`
        <div>
          <${Suspense} fallback=${html`<p>loading</p>`}>
            ${() => Promise.resolve(html`<b>resolved</b>`)}
          </${Suspense}>
        </div>
      `;
      const container = await streamContainer(html`<${App} />`);
      container.querySelector("template")?.remove();

      suppressWarn(() => {
        hydrate(html`<${App} />`, container);
      });
      expect(container.textContent).toContain("loading");

      await delay();

      expect(container.querySelector("b")?.textContent).toBe("resolved");
      expect(container.textContent).not.toContain("loading");
      expect(container.textContent).not.toContain("[object");
    });

    test("bubbles a degradation rejection to onError and drops the fallback", async () => {
      let failNow = false;
      const App = () => html`
        <div>
          <${Suspense} fallback=${html`<p>loading</p>`}>
            ${() => (failNow ? Promise.reject(new Error("stage boom")) : Promise.resolve(html`<b>ok</b>`))}
          </${Suspense}>
        </div>
      `;
      const container = await streamContainer(html`<${App} />`);
      container.querySelector("template")?.remove();

      const handler = mock(() => null);
      onError(handler);
      failNow = true;
      suppressWarn(() => {
        hydrate(html`<${App} />`, container);
      });
      // a synchronously-rejected promise chains .then(f).catch(g) over two microtask hops —
      // a real-time wait lets the catch settle before asserting
      await delay(50);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(container.textContent).not.toContain("loading");
      expect(container.textContent).not.toContain("[object");
      onError(null);
    });

    test("adopts inline children without re-suspending under non-streamed ssr", () => {
      const App = () => html`
        <div>
          <${Suspense} fallback=${html`<p>loading</p>`}>
            ${html`<b id="nb">inline</b>`}
          </${Suspense}>
        </div>
      `;
      const container = ssrContainer(html`<${App} />`);

      const { warnings } = suppressWarn(() => {
        hydrate(html`<${App} />`, container);
      });

      expect(container.querySelectorAll("#nb")).toHaveLength(1);
      expect(container.textContent).toContain("inline");
      expect(warnings.length).toBe(0);
    });

    test("warns and subtree-replaces when a non-static element's tag mismatches the server HTML", () => {
      const container = setupContainer();
      container.innerHTML = "<section><span>server</span></section>";

      const { warnings } = suppressWarn(() => {
        hydrate(html`<div id="ns"><span>${() => "client"}</span></div>`, container);
      });

      expect(container.querySelector("div#ns")).not.toBeNull();
      expect(container.querySelector("section")).toBeNull();
      expect(warnings.length).toBe(1);
    });

    test("dispatches a throwing beforeMount hook during hydrate and continues mounting", () => {
      const handler = mock(() => null);
      onError(handler);
      const App = () => html`<div id="bm" hook:beforeMount=${() => {
        throw new Error("beforeMount hydrate");
      }}>x</div>`;
      const container = ssrContainer(html`<${App} />`);

      hydrate(html`<${App} />`, container);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(container.querySelector("#bm")?.textContent).toBe("x");
      onError(null);
    });

    test("warns and adopts children in place when a fragment's markers are missing", () => {
      const Frag = () => html`<i>a</i><i>b</i>`;
      const App = () => html`<div id="fg"><${Frag}></${Frag}></div>`;
      const container = setupContainer();
      container.innerHTML = '<div id="fg"><i>a</i><i>b</i></div>';

      const { warnings } = suppressWarn(() => {
        hydrate(html`<${App} />`, container);
      });

      expect(container.querySelectorAll("#fg i")).toHaveLength(2);
      expect(warnings.length).toBe(1);
    });

    test("unmount before an async hydrate attaches cancels the late resolution", async () => {
      let resolveHydrate: () => void = () => {};
      const slow = () => new Promise<void>((resolve) => {
        resolveHydrate = resolve;
      }).then(() => html`<div id="hlate">late</div>`);
      const container = setupContainer();
      container.innerHTML = "<div>server</div>";

      const handle = hydrate(slow, container);
      handle.unmount();
      resolveHydrate();
      await delay();

      expect(container.textContent).toBe("server");
    });
  });
});
