import { describe, test, expect, beforeEach, mock } from "bun:test";
import { effect, flush, signal } from "@hellajs/core";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { html, hydrate, component, peekState } from "@hellajs/dom/bundle";
import type { HellaNode } from "@hellajs/dom";
import { ssrContainer } from "./helpers";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("component scope hydrate", () => {
    test("wires the scope when hydrate adopts a static root", async () => {
      const count = signal(0);
      const effectRuns = mock(() => { });
      const Static = () => {
        effect(() => { effectRuns(); count(); });
        return html`<div id="static-hydrated">Hydrated</div>` as HellaNode;
      };

      // One view instance drives both ssr() and hydrate() — the documented
      // contract. A second template call would create a second component whose
      // scope belongs to a discarded server-side node.
      const view = html`<div><${Static} /></div>`;
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
      const effectRuns = mock(() => { });
      // The fragment root's first child is itself a fragment component — its region
      // markers lead the container, and the walk removes them while recursing, so
      // the root scope wires (post-recursion) onto the first surviving node.
      const Inner = () => html`<>b</>` as HellaNode;
      const FragRoot = () => {
        effect(() => { effectRuns(); count(); });
        return html`<><${Inner} /> tail</>`;
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
      for (let __i = 0; __i < 50; __i++) { if (peekState(first) === undefined) break; await delay(); }
      expect(peekState(first)).toBeUndefined();

      count(1);
      flush();
      expect(effectRuns).toHaveBeenCalledTimes(1);
    });

    test("keeps a reactive-first fragment-root component's scope across a post-hydrate swap", async () => {
      const count = signal(0);
      const effectRuns = mock(() => { });
      const ReactiveFirst = () => {
        effect(() => { effectRuns(); count(); });
        return html`<>${count} tail</>` as HellaNode;
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
      for (let __i = 0; __i < 50; __i++) { if (peekState(carrier) === undefined) break; await delay(); }
      expect(peekState(carrier)).toBeUndefined();

      count(3);
      flush();
      expect(effectRuns).toHaveBeenCalledTimes(3);
    });
  });
});
