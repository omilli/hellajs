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

    test("sync-cleaned subtree removal fires beforeDestroy exactly once — no observer re-walk", async () => {
      const destroyed = vi.fn();
      const items = signal([1]);
      mount(
        <ul>
          <ForEach
            each={items}
            use={(item: number) => (
              <li key={item} class="row" hook:beforeDestroy={destroyed}>
                {item}
              </li>
            )}
          ></ForEach>
        </ul>,
      );
      const row = document.querySelector(".row") as HellaElement;

      items([]);
      flush();
      expect(destroyed).toHaveBeenCalledTimes(1); // the sync clean ran
      expect(peekState(row)).toBeUndefined();

      await delay(0); // observer microtask drain
      expect(destroyed).toHaveBeenCalledTimes(1); // the skip must not re-clean
    });

    test("re-attached cleaned root unmarks — fresh state under it disposes on removal", async () => {
      const count = signal(0);
      const runs = vi.fn(() => {});
      const items = signal([1]);
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
      const ul = document.querySelector("ul")!;
      const row = document.querySelector(".row") as HellaElement;

      items([]);
      flush();
      expect(peekState(row)).toBeUndefined(); // sync-cleaned + marked

      ul.append(row); // addition record — the climb unmarks the root
      const span = document.createElement("span");
      row.append(span);
      registry.addEffect(span, () => {
        runs();
        count();
      });
      expect(runs).toHaveBeenCalledTimes(1);

      row.remove();
      for (let i = 0; i < 50; i++) {
        if (peekState(span) === undefined) break;
        await delay();
      }
      expect(peekState(span)).toBeUndefined(); // the walk found the state — the root was unmarked

      count(1);
      flush();
      expect(runs).toHaveBeenCalledTimes(1); // effect is dead
    });

    test("unmark climb passes unmarked intermediates — cleaned grandparent's fresh descendant state disposes", async () => {
      const count = signal(0);
      const runs = vi.fn(() => {});
      const items = signal([1]);
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
      const ul = document.querySelector("ul")!;
      const gp = document.querySelector(".row") as HellaElement;

      items([]);
      flush();
      expect(peekState(gp)).toBeUndefined(); // sync-cleaned + marked

      const holder = document.createElement("div"); // new, unmarked intermediate parent
      const mid = document.createElement("div");
      const span = document.createElement("span");
      mid.append(span);
      gp.append(mid);
      ul.append(holder);
      holder.append(gp); // re-attach beneath the unmarked parent
      registry.addEffect(span, () => {
        runs();
        count();
      });
      expect(runs).toHaveBeenCalledTimes(1);

      gp.remove();
      for (let i = 0; i < 50; i++) {
        if (peekState(span) === undefined) break;
        await delay();
      }
      expect(peekState(span)).toBeUndefined(); // climb unmarked gp through the unmarked intermediates

      count(1);
      flush();
      expect(runs).toHaveBeenCalledTimes(1); // effect is dead
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
