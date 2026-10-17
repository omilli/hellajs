import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { flush, signal } from "@hellajs/core";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { mount, ForEach, registry, queueCounts, peekState } from "@hellajs/dom";
import type { HellaElement } from "@hellajs/dom";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("queues", () => {
    test("hook-free additions leave no retained mount-queue entries", async () => {
      const items = signal<number[]>([]);
      mount(
        <ul>
          <ForEach each={items} use={(item: number) => <li key={item}>{item}</li>}></ForEach>
        </ul>,
      );

      items([1, 2, 3]);
      flush();
      expect(document.querySelectorAll("li").length).toBe(3);

      await delay(0);
      expect(queueCounts().mount).toBe(0);
    });

    test("hook-registered additions drain through the afterMount walk", async () => {
      const items = signal<number[]>([]);
      const mounted = vi.fn();
      mount(
        <ul>
          <ForEach
            each={items}
            use={(item: number) => (
              <li key={item} hook:afterMount={mounted}>
                {item}
              </li>
            )}
          ></ForEach>
        </ul>,
      );

      items([1, 2, 3]);
      flush();
      await delay(0);

      expect(mounted).toHaveBeenCalledTimes(3);
      expect(queueCounts().mount).toBe(0);
    });

    test("external removal still disposes effects in hook-free apps", async () => {
      const count = signal(0);
      const runs = vi.fn(() => {});

      mount(
        <div id="host">
          <span id="target">0</span>
        </div>,
      );
      const target = document.getElementById("target")! as HellaElement;
      registry.addEffect(target, () => {
        runs();
        count();
      });
      expect(runs).toHaveBeenCalledTimes(1);

      target.parentNode!.removeChild(target);
      for (let i = 0; i < 50; i++) {
        if (peekState(target) === undefined) break;
        await delay();
      }
      expect(peekState(target)).toBeUndefined();

      count(1);
      flush();
      expect(runs).toHaveBeenCalledTimes(1);
    });

    test("cleared rows are collectable", async () => {
      const canary = await (async () => {
        const items = signal<number[]>([]);
        mount(
          <ul>
            <ForEach
              each={items}
              use={(item: number) => (
                <li key={item} class="row">
                  {item}
                </li>
              )}
            ></ForEach>
          </ul>,
        );

        items([1, 2, 3]);
        flush();
        const row = document.querySelector(".row") as HTMLElement;
        expect(row).not.toBeNull();

        items([]);
        flush();
        expect(document.querySelector(".row")).toBeNull();
        return new WeakRef(row);
      })();

      await delay(10);
      gc?.();
      gc?.();

      expect(canary.deref()).toBeUndefined();
    });
  });
});
