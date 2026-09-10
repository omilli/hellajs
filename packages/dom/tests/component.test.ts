import { describe, test, expect, beforeEach, mock } from "bun:test";
import { effect, flush, signal } from "@hellajs/core";
import { resetTestState } from "@utils/test-helpers.js";
import { mount, html, component } from "@hellajs/dom/bundle";
import type { HellaNode, ComponentFn } from "@hellajs/dom";

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
  });
});
