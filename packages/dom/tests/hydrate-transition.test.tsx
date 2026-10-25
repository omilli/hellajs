import { describe, test, expect, beforeEach } from "vite-plus/test";
import { flush } from "@hellajs/core";
import { resetTestState } from "@utils/test-helpers.js";
import { hydrate } from "@hellajs/dom";
import type { TemplateBuildFn } from "@hellajs/dom";
import { twoTargetContainer } from "./helpers";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("hydrate transition", () => {
    test("adopts a Transition child when show is true and reconciles toggles", async () => {
      const { container, client } = await twoTargetContainer(`
        import { Transition } from "@hellajs/dom";
        import { signal } from "@hellajs/core";
        const show = signal(true);
        const App = () => (
          <div id="root">
            <Transition show={show}>{<span id="t">visible</span>}</Transition>
          </div>
        );
        const __out = { App, show };
      `);
      const tBefore = container.querySelector("#t")!;

      hydrate(client.App as TemplateBuildFn, container);
      expect(container.querySelector("#t")).toBe(tBefore);

      (client.show as (v: boolean) => void)(false);
      flush();
      expect(container.querySelector("#t")).toBeNull();

      (client.show as (v: boolean) => void)(true);
      flush();
      expect(container.querySelector("#t")!.textContent).toBe("visible");
    });

    test("applies the appear class on hydrate when show is true", async () => {
      const { container, client } = await twoTargetContainer(`
        import { Transition } from "@hellajs/dom";
        import { signal } from "@hellajs/core";
        const show = signal(true);
        const App = () => (
          <div id="root">
            <Transition show={show} appear="fade-in">
              {<span id="t">visible</span>}
            </Transition>
          </div>
        );
        const __out = { App, show };
      `);

      hydrate(client.App as TemplateBuildFn, container);
      expect(container.querySelector("#t")!.classList.contains("fade-in")).toBe(true);
    });

    test("hydrates a Transition with show false and enters on toggle", async () => {
      const { container, client } = await twoTargetContainer(`
        import { Transition } from "@hellajs/dom";
        import { signal } from "@hellajs/core";
        const show = signal(false);
        const App = () => (
          <div id="root">
            <Transition show={show}>{<span id="t">visible</span>}</Transition>
          </div>
        );
        const __out = { App, show };
      `);
      expect(container.querySelector("#t")).toBeNull();

      hydrate(client.App as TemplateBuildFn, container);
      expect(container.querySelector("#t")).toBeNull();

      (client.show as (v: boolean) => void)(true);
      flush();
      expect(container.querySelector("#t")!.textContent).toBe("visible");
    });

    test("wires an on:click handler inside an adopted visible-first Transition child", async () => {
      const { container, client } = await twoTargetContainer(`
        import { Transition } from "@hellajs/dom";
        import { signal } from "@hellajs/core";
        const show = signal(true);
        const count = signal(0);
        const App = () => (
          <div id="root">
            <Transition show={show} appear="fade-in">
              {<button id="t-btn" on:click={() => count(count() + 1)}>{"n " + count()}</button>}
            </Transition>
          </div>
        );
        const __out = { App, show, count };
      `);
      const btnBefore = container.querySelector("#t-btn")!;

      hydrate(client.App as TemplateBuildFn, container);
      const btn = container.querySelector("#t-btn")!;
      expect(btn).toBe(btnBefore);
      expect(btn.classList.contains("fade-in")).toBe(true);

      btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      flush();
      expect((client.count as () => number)()).toBe(1);
    });
  });
});
