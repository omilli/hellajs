import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { effect, flush, signal } from "@hellajs/core";
import { resetTestState } from "@utils/test-helpers.js";
import { mount, component } from "@hellajs/dom";
import type { ComponentFn, TemplateBuildFn } from "@hellajs/dom";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("component", () => {
    test("attaches componentScope to the returned build fn", () => {
      const Counter = () => <div>Counter</div>;
      const build = component(Counter, {}) as unknown as TemplateBuildFn;
      expect(build.isTemplate).toBe(true);
      expect(typeof build.componentScope).toBe("function");
    });

    test("returns the flagged empty-fragment build on render error and disposes it on mount", () => {
      const BrokenComp = () => {
        throw new Error("render failed");
      };
      const build = component(BrokenComp, {}) as unknown as TemplateBuildFn;
      expect(build.isTemplate).toBe(true);
      const host = document.createElement("div");
      document.body.appendChild(host);
      mount(build, host);
      expect(host.childNodes.length).toBe(0);
      // The empty fragment owns no DOM lifetime — the wired scope disposes immediately.
      expect(build.componentScope).toBeUndefined();
    });

    test("passes props to component function", () => {
      const Greeting = (props: Record<string, unknown>) => (
        <span id="greeting">Hello {props.name as string}</span>
      );

      mount(component(Greeting as ComponentFn, { name: "World" }) as TemplateBuildFn);
      expect(document.getElementById("greeting")?.textContent).toBe("Hello World");
    });

    test("flags a fresh site build per invocation with its own scope chain", () => {
      const count = signal(0);
      const Static = () => {
        effect(() => {
          count();
        });
        return <div class="shared-root">x</div>;
      };

      const first = component(Static, {}) as unknown as TemplateBuildFn;
      const second = component(Static, {}) as unknown as TemplateBuildFn;

      // Each invocation flags its own site build (the compiled template is shared, the
      // marked fn is not); each carries the scope chain for its own mount.
      expect(first).not.toBe(second);
      expect(first.isTemplate).toBe(true);
      expect(typeof first.componentScope).toBe("function");
      const host = document.createElement("div");
      document.body.appendChild(host);
      mount(first, host);
      expect(host.querySelectorAll(".shared-root").length).toBe(1);
      const host2 = document.createElement("div");
      document.body.appendChild(host2);
      mount(second, host2);
      expect(host2.querySelectorAll(".shared-root").length).toBe(1);
    });

    test("disposes an empty-fragment-root component immediately", () => {
      const count = signal(0);
      const effectRuns = vi.fn(() => {});
      const EmptyRoot = () => {
        effect(() => {
          effectRuns();
          count();
        });
        return <></>;
      };

      const node = component(EmptyRoot, {});
      mount(<div id="empty-root-wrapper">{node}</div>);
      // Nothing rendered — the fragment root's scope (and its effect) disposes immediately.
      expect(effectRuns).toHaveBeenCalledTimes(1);

      count(1);
      flush();
      expect(effectRuns).toHaveBeenCalledTimes(1);

      // Re-mounting the same flagged build re-invokes the fragment builder, not the
      // component body: still nothing rendered, and the disposed scope never re-fires.
      mount(<div id="empty-root-wrapper-2">{node}</div>);
      expect(effectRuns).toHaveBeenCalledTimes(1);
      count(2);
      flush();
      expect(effectRuns).toHaveBeenCalledTimes(1);
    });
  });
});
