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
  describe("hydrate reactive regions", () => {
    test("wires an on:click handler inside an adopted conditional region without a re-render", async () => {
      const { container, client } = await twoTargetContainer(`
        import { signal } from "@hellajs/core";
        const show = signal(true);
        const count = signal(0);
        const App = () => (
          <div id="root">
            {show() && <button id="cond-btn" on:click={() => count(count() + 1)}>Go</button>}
          </div>
        );
        const __out = { App, show, count };
      `);
      const btnBefore = container.querySelector("#cond-btn")!;

      hydrate(client.App as TemplateBuildFn, container);
      expect(container.querySelector("#cond-btn")).toBe(btnBefore);
      (container.querySelector("#cond-btn") as HTMLButtonElement).dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
      flush();
      expect((client.count as () => number)()).toBe(1);
      expect(container.querySelector("#cond-btn")).toBe(btnBefore); // region never re-ran — the adopted node still serves
    });

    test("wires handlers in a region resolving to an array of builds", async () => {
      const { container, client } = await twoTargetContainer(`
        import { signal } from "@hellajs/core";
        const count = signal(0);
        const todos = ["a", "b"];
        const App = () => (
          <ul id="root">
            {() =>
              todos.map((t) => (
                <li id={"li-" + t}>
                  <button id={"btn-" + t} on:click={() => count(count() + 1)}>
                    {"n " + count()}
                  </button>
                </li>
              ))
            }
          </ul>
        );
        const __out = { App, count };
      `);
      const aBefore = container.querySelector("#btn-a")!;
      const bBefore = container.querySelector("#btn-b")!;

      hydrate(client.App as TemplateBuildFn, container);
      expect(container.querySelector("#btn-a")).toBe(aBefore);
      expect(container.querySelector("#btn-b")).toBe(bBefore);

      (container.querySelector("#btn-a") as HTMLButtonElement).dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
      flush();
      expect((client.count as () => number)()).toBe(1);
    });
  });
});
