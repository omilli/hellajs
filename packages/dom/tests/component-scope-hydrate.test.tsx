import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { effect, flush, signal } from "@hellajs/core";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { hydrate, component, peekState } from "@hellajs/dom";

import { ssrContainer } from "./helpers";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("component scope hydrate", () => {
    test("wires the scope when hydrate adopts a static root", async () => {
      const count = signal(0);
      const effectRuns = vi.fn(() => {});
      const Static = () => {
        effect(() => {
          effectRuns();
          count();
        });
        return <div id="static-hydrated">Hydrated</div>;
      };

      // One view instance drives both ssr() and hydrate() — the documented
      // contract. A second template call would create a second component whose
      // scope belongs to a discarded server-side node.
      const view = (
        <div>
          <Static></Static>
        </div>
      );
      const container = ssrContainer(view);
      expect(effectRuns).toHaveBeenCalledTimes(1);

      const app = hydrate(view, container);
      expect(effectRuns).toHaveBeenCalledTimes(1);

      app.unmount();
      await delay();

      count(1);
      flush();
      expect(effectRuns).toHaveBeenCalledTimes(1);
    });

    test("wires the scope when hydrate adopts a fragment root", async () => {
      const count = signal(0);
      const effectRuns = vi.fn(() => {});
      // The fragment root's first child is itself a fragment component — its region
      // markers lead the container, and the walk removes them while recursing, so
      // the root scope wires (post-recursion) onto the first surviving node.
      const Inner = () => <>b</>;
      const FragRoot = () => {
        effect(() => {
          effectRuns();
          count();
        });
        return (
          <>
            <Inner></Inner>tail
          </>
        );
      };

      // One component() instance drives both ssr() and hydrate() (memory 092):
      // a second call would leak a server-realm instance's effect into the counts.
      const view = component(FragRoot, {});
      const container = ssrContainer(view);
      expect(effectRuns).toHaveBeenCalledTimes(1);

      hydrate(view, container);
      expect(effectRuns).toHaveBeenCalledTimes(1);

      const first = container.firstChild!;
      first.remove();
      for (let __i = 0; __i < 50; __i++) {
        if (peekState(first) === undefined) break;
        await delay();
      }
      expect(peekState(first)).toBeUndefined();

      count(1);
      flush();
      expect(effectRuns).toHaveBeenCalledTimes(1);
    });

    test("keeps a reactive-first fragment-root component's scope across a post-hydrate swap", async () => {
      const count = signal(0);
      const effectRuns = vi.fn(() => {});
      const ReactiveFirst = () => {
        effect(() => {
          effectRuns();
          count();
        });
        return <>{count} tail</>;
      };

      // One component() instance drives both ssr() and hydrate() (memory 092):
      // a second call would leak a server-realm instance's effect into the counts.
      const view = component(ReactiveFirst, {});
      const container = ssrContainer(view);
      expect(effectRuns).toHaveBeenCalledTimes(1);

      hydrate(view, container);
      expect(effectRuns).toHaveBeenCalledTimes(1);

      // The carrier is the reactive region's anchor — hydrate inserts it AT the open
      // marker, so it leads the container at hydrate time and survives every swap
      // (post-swap rendered nodes insert BEFORE it, so capture it now).
      const carrier = container.firstChild!;

      count(1);
      flush();
      expect(effectRuns).toHaveBeenCalledTimes(2);
      expect(container.textContent).toBe("1 tail");

      // A second write proves the scope survived the post-hydrate swap.
      count(2);
      flush();
      expect(effectRuns).toHaveBeenCalledTimes(3);
      expect(container.textContent).toBe("2 tail");

      carrier.remove();
      for (let __i = 0; __i < 50; __i++) {
        if (peekState(carrier) === undefined) break;
        await delay();
      }
      expect(peekState(carrier)).toBeUndefined();

      count(3);
      flush();
      expect(effectRuns).toHaveBeenCalledTimes(3);
    });

    test("keeps a falsy-first fragment-root component's scope across the region's first re-run", async () => {
      const count = signal(0);
      const show = signal(false);
      const effectRuns = vi.fn(() => {});
      // The region resolves falsy at SSR (empty markers) — the dialog shape: a
      // visible-gated region renders nothing until its signal flips. hydrate must
      // settle the falsy resolution into the region anchor, never mount a transient
      // text node ahead of it: that node would BE the fragment scope's carrier
      // (regionPrev.nextSibling) and the first re-run's clear would dispose the
      // component scope — killing its effects while the component stays mounted.
      const FalsyFirst = () => {
        effect(() => {
          effectRuns();
          count();
        });
        return <>{() => show() && <span>shown</span>} tail</>;
      };

      // One component() instance drives both ssr() and hydrate() (memory 092):
      // a second call would leak a server-realm instance's effect into the counts.
      const view = component(FalsyFirst, {});
      const container = ssrContainer(view);
      expect(effectRuns).toHaveBeenCalledTimes(1);

      hydrate(view, container);
      expect(effectRuns).toHaveBeenCalledTimes(1);

      show(true);
      flush();
      expect(container.textContent).toBe("shown tail");

      // The scope must have survived the falsy region's first re-run.
      count(1);
      flush();
      expect(effectRuns).toHaveBeenCalledTimes(2);
    });
  });
});
