import { describe, test, expect, beforeEach, mock } from "bun:test";
import { flush, signal } from "@hellajs/core";
import {delay, resetTestState} from "../../../utils/test-helpers.js";
import { mount, html, registry } from "@hellajs/dom/bundle";
import type { HellaElement } from "@hellajs/dom";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("registry", () => {
    test("effect is disposed when element is removed from DOM", () => {
      const count = signal(0);
      const effectRuns = mock(() => { });

      const app = mount(html`<div id="container"><span id="target">0</span></div>`);

      const target = document.getElementById("target")! as HellaElement;
      registry.addEffect(target, () => { effectRuns(); count(); });

      expect(effectRuns).toHaveBeenCalledTimes(1);

      count(1);
      flush();
      expect(effectRuns).toHaveBeenCalledTimes(2);

      app.unmount();

      count(2);
      flush();
      expect(effectRuns).toHaveBeenCalledTimes(2);
    });

    test("multiple effects on element all dispose on cleanup", () => {
      const countA = signal(0);
      const countB = signal(0);
      const runsA = mock(() => { });
      const runsB = mock(() => { });

      const app = mount(html`<div id="multi-effect">Content</div>`);
      const el = document.getElementById("multi-effect")! as HellaElement;

      registry.addEffect(el, () => { runsA(); countA(); });
      registry.addEffect(el, () => { runsB(); countB(); });

      expect(runsA).toHaveBeenCalledTimes(1);
      expect(runsB).toHaveBeenCalledTimes(1);

      app.unmount();

      countA(1);
      countB(1);
      flush();
      expect(runsA).toHaveBeenCalledTimes(1);
      expect(runsB).toHaveBeenCalledTimes(1);
    });

    test("multiple hooks of same type all execute in order", () => {
      const calls: string[] = [];

      const app1 = mount(html`<div id="stacked">Content</div>`);
      const el = document.getElementById("stacked")! as HellaElement;

      registry.addHook(el, "afterMount", () => calls.push("first"));
      registry.addHook(el, "afterMount", () => calls.push("second"));
      registry.addHook(el, "afterMount", () => calls.push("third"));

      app1.flush();

      expect(calls).toEqual(["first", "second", "third"]);
    });

    test("beforeDestroy and afterDestroy hooks fire on cleanup", () => {
      const calls: string[] = [];

      const app = mount(html`<div id="destroy-hooks">Content</div>`);
      const el = document.getElementById("destroy-hooks")! as HellaElement;

      registry.addHook(el, "beforeDestroy", () => calls.push("before"));
      registry.addHook(el, "afterDestroy", () => calls.push("after"));

      app.unmount();

      expect(calls).toEqual(["before", "after"]);
    });

    test("afterMount hook receives element as argument", () => {
      let receivedEl: Element | undefined;

      const app2 = mount(html`<div id="hook-arg">Content</div>`);
      const el = document.getElementById("hook-arg")! as HellaElement;

      registry.addHook(el, "afterMount", (node) => { receivedEl = node; });

      app2.flush();

      expect(receivedEl).toBe(el);
    });

    test("beforeMount hook receives no argument", () => {
      const fn = mock(() => { });

      mount(html`<div id="before-mount-no-arg" hook:beforeMount=${fn}>Content</div>`);

      // beforeMount was already called synchronously during mount, with no defined arguments
      const definedArgs = (fn.mock.calls[0] ?? []).filter(a => a !== undefined);
      expect(definedArgs).toHaveLength(0);
    });

    test("moved elements are not cleaned up", async () => {
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

      // Let observer fire and cleanup run - should skip since element is still connected
      await delay(0);

      count(1);
      flush();
      expect(runsEffect).toHaveBeenCalledTimes(2);
    });

    test("cleanup traverses descendants", () => {
      const parentCalls = mock(() => { });
      const childCalls = mock(() => { });
      const count = signal(0);

      const app = mount(html`
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

      app.unmount();

      count(1);
      flush();
      expect(parentCalls).toHaveBeenCalledTimes(1);
      expect(childCalls).toHaveBeenCalledTimes(1);
    });

    test("afterMount fires after flush", () => {
      const afterMountCalls = mock(() => { });

      const app3 = mount(html`
        <div>
          <span id="mount-queue-test" hook:afterMount=${afterMountCalls}>Content</span>
        </div>
      `);

      // afterMount not called yet (deferred)
      expect(afterMountCalls).toHaveBeenCalledTimes(0);

      app3.flush();
      expect(afterMountCalls).toHaveBeenCalledTimes(1);
    });

    test("disconnected nodes are skipped in mount queue", () => {
      const afterMountCalls = mock(() => { });

      const app4 = mount(html`<div id="disconnect-test" hook:afterMount=${afterMountCalls}>Content</div>`);

      const el = document.getElementById("disconnect-test")!;
      el.remove();

      // Even after flush, disconnected nodes are skipped
      app4.flush();
      expect(afterMountCalls).toHaveBeenCalledTimes(0);
    });
  });
});
