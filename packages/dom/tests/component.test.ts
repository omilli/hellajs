import { describe, test, expect, beforeEach, mock } from "bun:test";
import { mount, html, component, queueCleanup } from "@hellajs/dom/bundle";
import type { HellaNode, ComponentFn } from "../lib/types/nodes";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
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
  });
});
