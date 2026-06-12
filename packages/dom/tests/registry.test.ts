import { describe, test, expect, beforeEach, mock } from "bun:test";
import { mount, html, registry, flushMount, queueCleanup } from "@hellajs/dom/bundle";
import type { HellaElement } from "@hellajs/dom";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("registry", () => {
    test("effect is disposed when element is removed from DOM", () => {
      const count = signal(0);
      const effectRuns = mock(() => { });

      mount(html`<div id="container"><span id="target">0</span></div>`);

      const target = document.getElementById("target")! as HellaElement;
      registry.addEffect(target, () => { effectRuns(); count(); });

      expect(effectRuns).toHaveBeenCalledTimes(1);

      count(1);
      flush();
      expect(effectRuns).toHaveBeenCalledTimes(2);

      // Remove element and process cleanup
      target.remove();
      queueCleanup(target);

      count(2);
      flush();
      // Effect should not run after disposal
      expect(effectRuns).toHaveBeenCalledTimes(2);
    });

    test("multiple effects on element all dispose on cleanup", () => {
      const countA = signal(0);
      const countB = signal(0);
      const runsA = mock(() => { });
      const runsB = mock(() => { });

      mount(html`<div id="multi-effect">Content</div>`);
      const el = document.getElementById("multi-effect")! as HellaElement;

      registry.addEffect(el, () => { runsA(); countA(); });
      registry.addEffect(el, () => { runsB(); countB(); });

      expect(runsA).toHaveBeenCalledTimes(1);
      expect(runsB).toHaveBeenCalledTimes(1);

      el.remove();
      queueCleanup(el);

      countA(1);
      countB(1);
      flush();
      expect(runsA).toHaveBeenCalledTimes(1);
      expect(runsB).toHaveBeenCalledTimes(1);
    });

    test("multiple hooks of same type all execute in order", () => {
      const calls: string[] = [];

      mount(html`<div id="stacked">Content</div>`);
      const el = document.getElementById("stacked")! as HellaElement;

      registry.addHook(el, "afterMount", () => calls.push("first"));
      registry.addHook(el, "afterMount", () => calls.push("second"));
      registry.addHook(el, "afterMount", () => calls.push("third"));

      flushMount(el.parentElement!);

      expect(calls).toEqual(["first", "second", "third"]);
    });

    test("beforeDestroy and afterDestroy hooks fire on cleanup", () => {
      const calls: string[] = [];

      mount(html`<div id="destroy-hooks">Content</div>`);
      const el = document.getElementById("destroy-hooks")! as HellaElement;

      registry.addHook(el, "beforeDestroy", () => calls.push("before"));
      registry.addHook(el, "afterDestroy", () => calls.push("after"));

      el.remove();
      queueCleanup(el);

      expect(calls).toEqual(["before", "after"]);
    });

    test("afterMount hook receives element as argument", () => {
      let receivedEl: Element | undefined;

      mount(html`<div id="hook-arg">Content</div>`);
      const el = document.getElementById("hook-arg")! as HellaElement;

      registry.addHook(el, "afterMount", (node) => { receivedEl = node; });

      flushMount(el.parentElement!);

      expect(receivedEl).toBe(el);
    });

    test("beforeMount hook receives no argument", () => {
      let argCount = 0;
      const fn = (...args: unknown[]) => { argCount = args.filter(a => a !== undefined).length; };

      mount(html`<div id="before-mount-no-arg" hook:beforeMount=${fn}>Content</div>`);

      // beforeMount was already called synchronously during mount
      expect(argCount).toBe(0);
    });

    test("moved elements are not cleaned up", () => {
      const runsEffect = mock(() => { });
      const count = signal(0);

      mount(html`
        <div>
          <div id="source"><span id="moveable">Content</span></div>
          <div id="dest"></div>
        </div>
      `);

      const moveable = document.getElementById("moveable")! as HellaElement;
      registry.addEffect(moveable, () => { runsEffect(); count(); });

      expect(runsEffect).toHaveBeenCalledTimes(1);

      // Move element to new parent (still connected)
      const dest = document.getElementById("dest")!;
      dest.appendChild(moveable);

      // Process cleanup - should skip since element is still connected
      queueCleanup(moveable);

      count(1);
      flush();
      // Effect should still run since node was moved, not removed
      expect(runsEffect).toHaveBeenCalledTimes(2);
    });

    test("cleanup traverses descendants", () => {
      const parentCalls = mock(() => { });
      const childCalls = mock(() => { });
      const count = signal(0);

      mount(html`
        <div id="parent-clean">
          <span id="child-clean">Content</span>
        </div>
      `);

      const parent = document.getElementById("parent-clean")! as HellaElement;
      const child = document.getElementById("child-clean")! as HellaElement;

      registry.addEffect(parent, () => { parentCalls(); count(); });
      registry.addEffect(child, () => { childCalls(); count(); });

      expect(parentCalls).toHaveBeenCalledTimes(1);
      expect(childCalls).toHaveBeenCalledTimes(1);

      // Remove parent - should clean up both parent and child effects
      parent.remove();
      queueCleanup(parent);

      count(1);
      flush();
      expect(parentCalls).toHaveBeenCalledTimes(1);
      expect(childCalls).toHaveBeenCalledTimes(1);
    });

    test("afterMount fires after flushMount", () => {
      const afterMountCalls = mock(() => { });

      mount(html`
        <div>
          <span id="mount-queue-test" hook:afterMount=${afterMountCalls}>Content</span>
        </div>
      `);

      // afterMount not called yet (deferred)
      expect(afterMountCalls).toHaveBeenCalledTimes(0);

      flushMount(document.getElementById("app")!);
      expect(afterMountCalls).toHaveBeenCalledTimes(1);
    });

    test("disconnected nodes are skipped in mount queue", () => {
      const afterMountCalls = mock(() => { });

      mount(html`<div id="disconnect-test" hook:afterMount=${afterMountCalls}>Content</div>`);

      const el = document.getElementById("disconnect-test")!;
      el.remove();

      // Even after flushMount, disconnected nodes are skipped
      flushMount(document.getElementById("app") ?? document.body);
      expect(afterMountCalls).toHaveBeenCalledTimes(0);
    });
  });
});
