import { describe, test, expect, beforeEach, mock } from "bun:test";
import { effect, flush, signal } from "@hellajs/core";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { mount, hydrate, html, component, peekState } from "@hellajs/dom/bundle";
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
  });
});