import { describe, test, expect, beforeEach, mock } from "bun:test";
import { effect, flush, signal } from "@hellajs/core";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { mount, hydrate, html, component, ForEach, peekState } from "@hellajs/dom/bundle";
import type { HellaNode, ComponentFn, HellaElement } from "@hellajs/dom";
import { ssrContainer } from "./helpers";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("component", () => {
    test("attaches componentScope to returned node", () => {
      const Counter = () => html`<div>Counter</div>` as HellaNode;
      const node = component(Counter, {}) as HellaNode & { componentScope?: () => void };
      expect(typeof node.componentScope).toBe("function");
    });

    test("cleans up effects when component removed from DOM", () => {
      const effectRuns = mock(() => { });
      const count = signal(0);

      const Comp = () => {
        effect(() => { effectRuns(); count(); });
        return html`<div id="comp">Component</div>` as HellaNode;
      };

      const app = mount(html`<div id="wrapper"><${Comp} /></div>`);
      expect(effectRuns).toHaveBeenCalledTimes(1);

      count(1);
      flush();
      expect(effectRuns).toHaveBeenCalledTimes(2);

      app.unmount();

      count(2);
      flush();
      expect(effectRuns).toHaveBeenCalledTimes(2);
    });

    test("returns empty fragment on render error", () => {
      const BrokenComp = () => { throw new Error("render failed"); };
      const node = component(BrokenComp, {});
      expect(node.tag).toBe("$");
      expect(node.children).toEqual([]);
    });

    test("passes props to component function", () => {
      const Greeting = (props: { name: string }) =>
        html`<span id="greeting">Hello ${props.name}</span>` as HellaNode;

      mount(component(Greeting as ComponentFn, { name: "World" }));
      expect(document.getElementById("greeting")?.textContent).toBe("Hello World");
    });

    test("multiple components have independent scopes", async () => {
      const aCalls = mock(() => { });
      const bCalls = mock(() => { });
      const countA = signal(0);
      const countB = signal(0);

      const CompA = () => {
        effect(() => { aCalls(); countA(); });
        return html`<div id="comp-a">A</div>` as HellaNode;
      };
      const CompB = () => {
        effect(() => { bCalls(); countB(); });
        return html`<div id="comp-b">B</div>` as HellaNode;
      };

      mount(html`
        <div>
          <div id="wrapper-a"><${CompA} /></div>
          <div id="wrapper-b"><${CompB} /></div>
        </div>
      `);

      expect(aCalls).toHaveBeenCalledTimes(1);
      expect(bCalls).toHaveBeenCalledTimes(1);

      const compA = document.getElementById("comp-a")!;
      const wrapperA = document.getElementById("wrapper-a")!;
      wrapperA.remove();
      for (let __i = 0; __i < 50; __i++) { if (peekState(compA) === undefined) break; await delay(); }
      expect(peekState(compA)).toBeUndefined();

      countA(1);
      countB(1);
      flush();

      expect(aCalls).toHaveBeenCalledTimes(1);
      expect(bCalls).toHaveBeenCalledTimes(2);
    });

    test("effects dispose when element removed", () => {
      const count = signal(0);
      const effectRuns = mock(() => { });

      const Counter = () => {
        effect(() => { count(); effectRuns(); });
        return html`<div id="counter">Counter</div>`;
      };

      const app = mount(html`<${Counter} />`);
      expect(effectRuns).toHaveBeenCalledTimes(1);

      count(1);
      expect(effectRuns).toHaveBeenCalledTimes(2);

      app.unmount();

      count(2);
      expect(effectRuns).toHaveBeenCalledTimes(2);
    });

    test("nested components with isolated scopes", async () => {
      const trigger1 = signal(0);
      const trigger2 = signal(0);
      const effect1Runs = mock(() => { });
      const effect2Runs = mock(() => { });

      const Inner = () => {
        effect(() => { trigger2(); effect2Runs(); });
        return html`<span id="inner">Inner</span>`;
      };

      const Outer = () => {
        effect(() => { trigger1(); effect1Runs(); });
        return html`<div id="outer"><${Inner} /></div>`;
      };

      mount(html`<${Outer} />`);
      expect(effect1Runs).toHaveBeenCalledTimes(1);
      expect(effect2Runs).toHaveBeenCalledTimes(1);

      trigger1(1);
      trigger2(1);
      expect(effect1Runs).toHaveBeenCalledTimes(2);
      expect(effect2Runs).toHaveBeenCalledTimes(2);

      const inner = document.getElementById("inner") as HellaElement;
      inner.remove();
      for (let __i = 0; __i < 50; __i++) { if (peekState(inner) === undefined) break; await delay(); }
      expect(peekState(inner)).toBeUndefined();

      trigger1(2);
      trigger2(2);
      expect(effect1Runs).toHaveBeenCalledTimes(3);
      expect(effect2Runs).toHaveBeenCalledTimes(2);

      const outer = document.getElementById("outer") as HellaElement;
      outer.remove();
      for (let __i = 0; __i < 50; __i++) { if (peekState(outer) === undefined) break; await delay(); }
      expect(peekState(outer)).toBeUndefined();

      trigger1(3);
      expect(effect1Runs).toHaveBeenCalledTimes(3);
    });

    test("html component scope cleanup", async () => {
      const count = signal(0);
      const effectRuns = mock(() => { });

      const Counter = () => {
        effect(() => { count(); effectRuns(); });
        return html`<div id="html-counter">${count}</div>`;
      };

      mount(html`<${Counter} />`);
      expect(effectRuns).toHaveBeenCalledTimes(1);

      count(1);
      expect(effectRuns).toHaveBeenCalledTimes(2);

      const counter = document.getElementById("html-counter") as HellaElement;
      counter.remove();
      for (let __i = 0; __i < 50; __i++) { if (peekState(counter) === undefined) break; await delay(); }
      expect(peekState(counter)).toBeUndefined();

      count(2);
      expect(effectRuns).toHaveBeenCalledTimes(2);
    });

    test("multiple components isolation", async () => {
      const trigger1 = signal(0);
      const trigger2 = signal(0);
      const effect1Runs = mock(() => { });
      const effect2Runs = mock(() => { });

      const Component1 = () => {
        effect(() => { trigger1(); effect1Runs(); });
        return html`<div id="comp1">Component 1</div>`;
      };

      const Component2 = () => {
        effect(() => { trigger2(); effect2Runs(); });
        return html`<div id="comp2">Component 2</div>`;
      };

      mount(html`<div><${Component1} /><${Component2} /></div>`);
      expect(effect1Runs).toHaveBeenCalledTimes(1);
      expect(effect2Runs).toHaveBeenCalledTimes(1);

      const comp1 = document.getElementById("comp1")!;
      comp1.remove();
      for (let __i = 0; __i < 50; __i++) { if (peekState(comp1) === undefined) break; await delay(); }
      expect(peekState(comp1)).toBeUndefined();

      trigger1(1);
      trigger2(1);
      expect(effect1Runs).toHaveBeenCalledTimes(1);
      expect(effect2Runs).toHaveBeenCalledTimes(2);

      const comp2 = document.getElementById("comp2")!;
      comp2.remove();
      for (let __i = 0; __i < 50; __i++) { if (peekState(comp2) === undefined) break; await delay(); }
      expect(peekState(comp2)).toBeUndefined();

      trigger2(2);
      expect(effect2Runs).toHaveBeenCalledTimes(2);
    });

    test("disposes both instances' scopes for a static-root component", async () => {
      const count = signal(0);
      const effectRuns = mock(() => { });
      const Static = () => {
        effect(() => { effectRuns(); count(); });
        return html`<div class="static-root">Static</div>` as HellaNode;
      };

      const app = mount(html`<div>${component(Static, {})}${component(Static, {})}</div>`);
      expect(effectRuns).toHaveBeenCalledTimes(2);

      app.unmount();
      await delay();

      count(1);
      flush();
      expect(effectRuns).toHaveBeenCalledTimes(2);
    });

    test("does not mutate the shared static template node", () => {
      const count = signal(0);
      const shared = html`<div class="shared-root">x</div>` as HellaNode & { componentScope?: () => void };
      const Static = () => {
        effect(() => { count(); });
        return shared;
      };

      const first = component(Static, {}) as HellaNode & { componentScope?: () => void };
      const second = component(Static, {}) as HellaNode & { componentScope?: () => void };

      expect(first).not.toBe(shared);
      expect(second).not.toBe(shared);
      expect(shared.componentScope).toBeUndefined();
      expect(first.componentScope).not.toBe(second.componentScope);
    });

    test("wires the scope on the staticDom clone path", async () => {
      const count = signal(0);
      const effectRuns = mock(() => { });
      const Static = () => {
        effect(() => { effectRuns(); count(); });
        return html`<div class="clone-root">Clone</div>` as HellaNode;
      };

      // One component() call, its result mounted twice: the second mount serves
      // the staticDom cache clone — both elements need the scope wired.
      const node = component(Static, {});
      const app = mount(html`<div>${node}${node}</div>`);
      expect(effectRuns).toHaveBeenCalledTimes(1);

      app.unmount();
      await delay();

      count(1);
      flush();
      expect(effectRuns).toHaveBeenCalledTimes(1);
    });

    test("wires the scope when hydrate adopts a static root", async () => {
      const count = signal(0);
      const effectRuns = mock(() => { });
      const Static = () => {
        effect(() => { effectRuns(); count(); });
        return html`<div id="static-hydrated">Hydrated</div>` as HellaNode;
      };

      // One view instance drives both ssr() and hydrate() — the documented
      // contract. A second template call would create a second component whose
      // scope belongs to a discarded server-side node.
      const view = html`<div><${Static} /></div>`;
      const container = ssrContainer(view);
      expect(effectRuns).toHaveBeenCalledTimes(1);

      const app = hydrate(view, container);
      expect(effectRuns).toHaveBeenCalledTimes(1);

      app.unmount();
      await delay();

      count(1);
      flush();
      expect(effectRuns).toHaveBeenCalledTimes(1);
    });

    test("disposes a static-fragment-root component's scope on subtree removal", async () => {
      const count = signal(0);
      const effectRuns = mock(() => { });
      const FragRoot = () => {
        effect(() => { effectRuns(); count(); });
        return html`<>a b</>` as HellaNode;
      };

      mount(html`<div id="frag-root-wrapper"><${FragRoot} /></div>`);
      expect(effectRuns).toHaveBeenCalledTimes(1);

      count(1);
      flush();
      expect(effectRuns).toHaveBeenCalledTimes(2);

      const wrapper = document.getElementById("frag-root-wrapper")!;
      const text = wrapper.firstChild!;
      wrapper.remove();
      for (let __i = 0; __i < 50; __i++) { if (peekState(text) === undefined) break; await delay(); }
      expect(peekState(text)).toBeUndefined();

      count(2);
      flush();
      expect(effectRuns).toHaveBeenCalledTimes(2);
    });

    test("disposes a multi-root fragment component's scope on subtree removal", async () => {
      const count = signal(0);
      const effectRuns = mock(() => { });
      const MultiRoot = () => {
        effect(() => { effectRuns(); count(); });
        return html`<><b id="frag-first">A</b><i id="frag-second">B</i></>` as HellaNode;
      };

      mount(html`<div id="multi-root-wrapper"><${MultiRoot} /></div>`);
      expect(effectRuns).toHaveBeenCalledTimes(1);

      count(1);
      flush();
      expect(effectRuns).toHaveBeenCalledTimes(2);

      const carrier = document.getElementById("frag-second")!;
      document.getElementById("multi-root-wrapper")!.remove();
      for (let __i = 0; __i < 50; __i++) { if (peekState(carrier) === undefined) break; await delay(); }
      expect(peekState(carrier)).toBeUndefined();

      count(2);
      flush();
      expect(effectRuns).toHaveBeenCalledTimes(2);
    });

    test("chains scopes when a component returns another component's result directly", async () => {
      const outerRuns = mock(() => { });
      const innerRuns = mock(() => { });
      const outerCount = signal(0);
      const innerCount = signal(0);

      const Inner = () => {
        effect(() => { innerRuns(); innerCount(); });
        return html`<span id="direct-inner">Inner</span>` as HellaNode;
      };
      const Outer = () => {
        effect(() => { outerRuns(); outerCount(); });
        return component(Inner, {});
      };

      mount(html`<div id="direct-wrapper"><${Outer} /></div>`);
      expect(outerRuns).toHaveBeenCalledTimes(1);
      expect(innerRuns).toHaveBeenCalledTimes(1);

      outerCount(1);
      innerCount(1);
      flush();
      expect(outerRuns).toHaveBeenCalledTimes(2);
      expect(innerRuns).toHaveBeenCalledTimes(2);

      const inner = document.getElementById("direct-inner")!;
      document.getElementById("direct-wrapper")!.remove();
      for (let __i = 0; __i < 50; __i++) { if (peekState(inner) === undefined) break; await delay(); }
      expect(peekState(inner)).toBeUndefined();

      outerCount(2);
      innerCount(2);
      flush();
      expect(outerRuns).toHaveBeenCalledTimes(2);
      expect(innerRuns).toHaveBeenCalledTimes(2);
    });

    test("chains scopes when a fragment root's first child is an inner component", async () => {
      const outerRuns = mock(() => { });
      const innerRuns = mock(() => { });
      const outerCount = signal(0);
      const innerCount = signal(0);

      const Inner = () => {
        effect(() => { innerRuns(); innerCount(); });
        return html`<span id="frag-child-inner">Inner</span>` as HellaNode;
      };
      const Outer = () => {
        effect(() => { outerRuns(); outerCount(); });
        return html`<${Inner} /> tail`;
      };

      mount(html`<div id="frag-child-wrapper"><${Outer} /></div>`);
      expect(outerRuns).toHaveBeenCalledTimes(1);
      expect(innerRuns).toHaveBeenCalledTimes(1);

      outerCount(1);
      innerCount(1);
      flush();
      expect(outerRuns).toHaveBeenCalledTimes(2);
      expect(innerRuns).toHaveBeenCalledTimes(2);

      const inner = document.getElementById("frag-child-inner")!;
      document.getElementById("frag-child-wrapper")!.remove();
      for (let __i = 0; __i < 50; __i++) { if (peekState(inner) === undefined) break; await delay(); }
      expect(peekState(inner)).toBeUndefined();

      outerCount(2);
      innerCount(2);
      flush();
      expect(outerRuns).toHaveBeenCalledTimes(2);
      expect(innerRuns).toHaveBeenCalledTimes(2);
    });

    test("disposes an empty-fragment-root component immediately", () => {
      const count = signal(0);
      const effectRuns = mock(() => { });
      const EmptyRoot = () => {
        effect(() => { effectRuns(); count(); });
        return html`<></>` as HellaNode;
      };

      // One instance mounted twice: the first mount serves the `$` branch, the second
      // the staticDom clone — nothing is rendered either way, so both mounts dispose.
      const node = component(EmptyRoot, {});
      mount(html`<div id="empty-root-wrapper">${node}${node}</div>`);
      expect(effectRuns).toHaveBeenCalledTimes(1);

      count(1);
      flush();
      expect(effectRuns).toHaveBeenCalledTimes(1);

      count(2);
      flush();
      expect(effectRuns).toHaveBeenCalledTimes(1);
    });

    test("wires the scope when hydrate adopts a fragment root", async () => {
      const count = signal(0);
      const effectRuns = mock(() => { });
      // The fragment root's first child is itself a fragment component — its region
      // markers lead the container, and the walk removes them while recursing, so
      // the root scope wires (post-recursion) onto the first surviving node.
      const Inner = () => html`<>b</>` as HellaNode;
      const FragRoot = () => {
        effect(() => { effectRuns(); count(); });
        return html`<><${Inner} /> tail</>`;
      };

      // One component() instance drives both ssr() and hydrate() (memory 092):
      // a second call would leak a server-realm instance's effect into the counts.
      const view = component(FragRoot, {});
      const container = ssrContainer(view);
      expect(effectRuns).toHaveBeenCalledTimes(1);

      hydrate(view, container);
      expect(effectRuns).toHaveBeenCalledTimes(1);

      const first = container.firstChild!;
      first.remove();
      for (let __i = 0; __i < 50; __i++) { if (peekState(first) === undefined) break; await delay(); }
      expect(peekState(first)).toBeUndefined();

      count(1);
      flush();
      expect(effectRuns).toHaveBeenCalledTimes(1);
    });

    test("keeps a reactive-first fragment-root component's scope across child swaps", async () => {
      const count = signal(0);
      const effectRuns = mock(() => { });
      const ReactiveFirst = () => {
        effect(() => { effectRuns(); count(); });
        return html`<>${count} tail</>` as HellaNode;
      };

      mount(html`<div id="reactive-first-wrapper"><${ReactiveFirst} /></div>`);
      expect(effectRuns).toHaveBeenCalledTimes(1);

      // The leading child swaps its rendered node — the scope must ride past it.
      count(1);
      flush();
      expect(effectRuns).toHaveBeenCalledTimes(2);
      expect(document.getElementById("reactive-first-wrapper")!.textContent).toBe("1 tail");

      // A second write proves the scope survived the first swap (a scope that died
      // with the swapped-out node would freeze the mock at 2).
      count(2);
      flush();
      expect(effectRuns).toHaveBeenCalledTimes(3);
      expect(document.getElementById("reactive-first-wrapper")!.textContent).toBe("2 tail");

      // The carrier is the static tail (the fragment's last child).
      const carrier = document.getElementById("reactive-first-wrapper")!.lastChild!;
      document.getElementById("reactive-first-wrapper")!.remove();
      for (let __i = 0; __i < 50; __i++) { if (peekState(carrier) === undefined) break; await delay(); }
      expect(peekState(carrier)).toBeUndefined();

      count(3);
      flush();
      expect(effectRuns).toHaveBeenCalledTimes(3);
    });

    test("keeps a ForEach-first fragment-root component's scope across list reconciliation", async () => {
      const list = signal(["a", "b"]);
      const effectRuns = mock(() => { });
      const ForEachFirst = () => {
        effect(() => { effectRuns(); list(); });
        return html`<>${ForEach({ each: list, use: (item: string) => html`<b>${item}</b>` })} tail</>` as HellaNode;
      };

      mount(html`<div id="foreach-first-wrapper"><${ForEachFirst} /></div>`);
      expect(effectRuns).toHaveBeenCalledTimes(1);

      // Full positional reconciliation rebuilds every item — the scope must ride past it.
      list(["b", "c"]);
      flush();
      expect(effectRuns).toHaveBeenCalledTimes(2);
      expect(document.getElementById("foreach-first-wrapper")!.textContent).toBe("bc tail");

      // A second reconciliation proves the scope survived the first rebuild.
      list(["d"]);
      flush();
      expect(effectRuns).toHaveBeenCalledTimes(3);
      expect(document.getElementById("foreach-first-wrapper")!.textContent).toBe("d tail");

      // The carrier is the static tail (the fragment's last child — the ForEach anchor precedes it).
      const carrier = document.getElementById("foreach-first-wrapper")!.lastChild!;
      document.getElementById("foreach-first-wrapper")!.remove();
      for (let __i = 0; __i < 50; __i++) { if (peekState(carrier) === undefined) break; await delay(); }
      expect(peekState(carrier)).toBeUndefined();

      list(["e"]);
      flush();
      expect(effectRuns).toHaveBeenCalledTimes(3);
    });

    test("keeps a single-reactive-child fragment-root component's scope across swaps", async () => {
      const count = signal(0);
      const effectRuns = mock(() => { });
      const SingleReactive = () => {
        effect(() => { effectRuns(); count(); });
        return html`<>${count}</>` as HellaNode;
      };

      mount(html`<div id="single-reactive-wrapper"><${SingleReactive} /></div>`);
      expect(effectRuns).toHaveBeenCalledTimes(1);

      count(1);
      flush();
      expect(effectRuns).toHaveBeenCalledTimes(2);
      expect(document.getElementById("single-reactive-wrapper")!.textContent).toBe("1");

      // A second write proves the scope survived the swap of its only child's node.
      count(2);
      flush();
      expect(effectRuns).toHaveBeenCalledTimes(3);
      expect(document.getElementById("single-reactive-wrapper")!.textContent).toBe("2");

      // The carrier is the reactive branch's persistent anchor (the last child).
      const carrier = document.getElementById("single-reactive-wrapper")!.lastChild!;
      document.getElementById("single-reactive-wrapper")!.remove();
      for (let __i = 0; __i < 50; __i++) { if (peekState(carrier) === undefined) break; await delay(); }
      expect(peekState(carrier)).toBeUndefined();

      count(3);
      flush();
      expect(effectRuns).toHaveBeenCalledTimes(3);
    });

    test("disposes a static-first reactive-tail fragment-root component only on removal", async () => {
      const count = signal(0);
      const effectRuns = mock(() => { });
      const StaticFirst = () => {
        effect(() => { effectRuns(); count(); });
        return html`<>head ${count} tail</>` as HellaNode;
      };

      mount(html`<div id="static-first-wrapper"><${StaticFirst} /></div>`);
      expect(effectRuns).toHaveBeenCalledTimes(1);

      count(1);
      flush();
      expect(effectRuns).toHaveBeenCalledTimes(2);
      expect(document.getElementById("static-first-wrapper")!.textContent).toBe("head 1 tail");

      count(2);
      flush();
      expect(effectRuns).toHaveBeenCalledTimes(3);

      // The carrier is the static tail — this shape's old carrier was the leading
      // static text, so the test guards the carrier switch end-to-end.
      const carrier = document.getElementById("static-first-wrapper")!.lastChild!;
      document.getElementById("static-first-wrapper")!.remove();
      for (let __i = 0; __i < 50; __i++) { if (peekState(carrier) === undefined) break; await delay(); }
      expect(peekState(carrier)).toBeUndefined();

      count(3);
      flush();
      expect(effectRuns).toHaveBeenCalledTimes(3);
    });

    test("keeps a reactive-first fragment-root component's scope across a post-hydrate swap", async () => {
      const count = signal(0);
      const effectRuns = mock(() => { });
      const ReactiveFirst = () => {
        effect(() => { effectRuns(); count(); });
        return html`<>${count} tail</>` as HellaNode;
      };

      // One component() instance drives both ssr() and hydrate() (memory 092):
      // a second call would leak a server-realm instance's effect into the counts.
      const view = component(ReactiveFirst, {});
      const container = ssrContainer(view);
      expect(effectRuns).toHaveBeenCalledTimes(1);

      hydrate(view, container);
      expect(effectRuns).toHaveBeenCalledTimes(1);

      // The carrier is the reactive region's anchor — hydrate inserts it AT the open
      // marker, so it leads the container at hydrate time and survives every swap
      // (post-swap rendered nodes insert BEFORE it, so capture it now).
      const carrier = container.firstChild!;

      count(1);
      flush();
      expect(effectRuns).toHaveBeenCalledTimes(2);
      expect(container.textContent).toBe("1 tail");

      // A second write proves the scope survived the post-hydrate swap.
      count(2);
      flush();
      expect(effectRuns).toHaveBeenCalledTimes(3);
      expect(container.textContent).toBe("2 tail");

      carrier.remove();
      for (let __i = 0; __i < 50; __i++) { if (peekState(carrier) === undefined) break; await delay(); }
      expect(peekState(carrier)).toBeUndefined();

      count(3);
      flush();
      expect(effectRuns).toHaveBeenCalledTimes(3);
    });
  });
});