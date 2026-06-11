import { describe, test, expect, beforeEach, mock } from "bun:test";
import { mount, html, component, queueCleanup } from "@hellajs/dom/bundle";
import type { HellaNode, ComponentFn, HellaElement } from "@hellajs/dom";

beforeEach(() => {
  resetBody();
});

describe("dom", () => {
  describe("component", () => {
    test("attaches __scope to returned node", () => {
      const Counter = () => html`<div>Counter</div>` as HellaNode;
      const node = component(Counter, {}) as HellaNode & { __scope?: () => void };
      expect(typeof node.__scope).toBe("function");
    });

    test("cleans up effects when component removed from DOM", () => {
      const effectRuns = mock(() => { });
      const count = signal(0);

      const Comp = () => {
        effect(() => { effectRuns(); count(); });
        return html`<div id="comp">Component</div>` as HellaNode;
      };

      mount(html`<div id="wrapper"><${Comp} /></div>`);
      expect(effectRuns).toHaveBeenCalledTimes(1);

      count(1);
      flush();
      expect(effectRuns).toHaveBeenCalledTimes(2);

      const wrapper = document.getElementById("wrapper")!;
      wrapper.remove();
      queueCleanup(wrapper);

      count(2);
      flush();
      // Effect should not run after component is removed
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

    test("multiple components have independent scopes", () => {
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

      const wrapperA = document.getElementById("wrapper-a")!;
      wrapperA.remove();
      queueCleanup(wrapperA);

      countA(1);
      countB(1);
      flush();

      // Only B's effect should run
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

      mount(html`<${Counter} />`);
      expect(effectRuns).toHaveBeenCalledTimes(1);

      count(1);
      expect(effectRuns).toHaveBeenCalledTimes(2);

      const counter = document.getElementById("counter") as HellaElement;
      counter.remove();
      queueCleanup(counter);

      count(2);
      expect(effectRuns).toHaveBeenCalledTimes(2);
    });

    test("nested components with isolated scopes", () => {
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
      queueCleanup(inner);

      trigger1(2);
      trigger2(2);
      expect(effect1Runs).toHaveBeenCalledTimes(3);
      expect(effect2Runs).toHaveBeenCalledTimes(2);

      const outer = document.getElementById("outer") as HellaElement;
      outer.remove();
      queueCleanup(outer);

      trigger1(3);
      expect(effect1Runs).toHaveBeenCalledTimes(3);
    });

    test("html component scope cleanup", () => {
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
      queueCleanup(counter);

      count(2);
      expect(effectRuns).toHaveBeenCalledTimes(2);
    });

    test("multiple components isolation", () => {
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

      const comp1 = document.getElementById("comp1");
      comp1!.remove();
      queueCleanup(comp1!);

      trigger1(1);
      trigger2(1);
      expect(effect1Runs).toHaveBeenCalledTimes(1);
      expect(effect2Runs).toHaveBeenCalledTimes(2);

      const comp2 = document.getElementById("comp2");
      comp2!.remove();
      queueCleanup(comp2!);

      trigger2(2);
      expect(effect2Runs).toHaveBeenCalledTimes(2);
    });
  });
});
