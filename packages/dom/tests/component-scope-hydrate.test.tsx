import { describe, test, expect, beforeEach } from "vite-plus/test";
import { flush } from "@hellajs/core";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { hydrate, peekState } from "@hellajs/dom";
import type { TemplateBuildFn } from "@hellajs/dom";

import { twoTargetContainer } from "./helpers";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("component scope hydrate", () => {
    test("wires the scope when hydrate adopts a static root", async () => {
      const { container, client } = await twoTargetContainer(`
        import { effect, signal } from "@hellajs/core";
        const effectHits = { n: 0 };
        const count = signal(0);
        const Static = () => {
          effect(() => {
            effectHits.n++;
            count();
          });
          return <div id="static-hydrated">Hydrated</div>;
        };
        const App = () => (
          <div>
            <Static></Static>
          </div>
        );
        const __out = { App, count, effectHits };
      `);
      expect((client.effectHits as { n: number }).n).toBe(0); // the client instance hasn't rendered — the server arm's run was its own module scope

      const app = hydrate(client.App as TemplateBuildFn, container);
      expect((client.effectHits as { n: number }).n).toBe(1);

      app.unmount();
      await delay();

      (client.count as (v: number) => void)(1);
      flush();
      expect((client.effectHits as { n: number }).n).toBe(1);
    });

    test("wires the scope when hydrate adopts a fragment root", async () => {
      const { container, client } = await twoTargetContainer(`
        import { effect, signal } from "@hellajs/core";
        const effectHits = { n: 0 };
        const count = signal(0);
        const Inner = () => <>b</>;
        const FragRoot = () => {
          effect(() => {
            effectHits.n++;
            count();
          });
          return (
            <>
              <Inner></Inner>tail
            </>
          );
        };
        const App = () => <FragRoot></FragRoot>;
        const __out = { App, count, effectHits };
      `);
      expect((client.effectHits as { n: number }).n).toBe(0); // the client instance hasn't rendered — the server arm's run was its own module scope

      hydrate(client.App as TemplateBuildFn, container);
      expect((client.effectHits as { n: number }).n).toBe(1);

      const first = container.firstChild!;
      first.remove();
      for (let i = 0; i < 50; i++) {
        if (peekState(first) === undefined) break;
        await delay();
      }
      expect(peekState(first)).toBeUndefined();

      (client.count as (v: number) => void)(1);
      flush();
      expect((client.effectHits as { n: number }).n).toBe(1);
    });

    test("keeps a reactive-first fragment-root component's scope across a post-hydrate swap", async () => {
      const { container, client } = await twoTargetContainer(`
        import { effect, signal } from "@hellajs/core";
        const effectHits = { n: 0 };
        const count = signal(0);
        const ReactiveFirst = () => {
          effect(() => {
            effectHits.n++;
            count();
          });
          return <>{count} tail</>;
        };
        const App = () => <ReactiveFirst></ReactiveFirst>;
        const __out = { App, count, effectHits };
      `);
      expect((client.effectHits as { n: number }).n).toBe(0); // the client instance hasn't rendered — the server arm's run was its own module scope

      hydrate(client.App as TemplateBuildFn, container);
      expect((client.effectHits as { n: number }).n).toBe(1);

      // The carrier is the reactive region's anchor — hydrate inserts it AT the open
      // marker, so it leads the container at hydrate time and survives every swap
      // (post-swap rendered nodes insert BEFORE it, so capture it now).
      const carrier = container.firstChild!;

      const count = client.count as (v: number) => void;
      count(1);
      flush();
      expect((client.effectHits as { n: number }).n).toBe(2);
      expect(container.textContent).toBe("1 tail");

      // A second write proves the scope survived the post-hydrate swap.
      count(2);
      flush();
      expect((client.effectHits as { n: number }).n).toBe(3);
      expect(container.textContent).toBe("2 tail");

      carrier.remove();
      for (let i = 0; i < 50; i++) {
        if (peekState(carrier) === undefined) break;
        await delay();
      }
      expect(peekState(carrier)).toBeUndefined();

      count(3);
      flush();
      expect((client.effectHits as { n: number }).n).toBe(3);
    });

    test("keeps a falsy-first fragment-root component's scope across the region's first re-run", async () => {
      const { container, client } = await twoTargetContainer(`
        import { effect, signal } from "@hellajs/core";
        const effectHits = { n: 0 };
        const count = signal(0);
        const show = signal(false);
        // The region resolves falsy at SSR (empty markers) — the dialog shape: a
        // visible-gated region renders nothing until its signal flips. hydrate must
        // settle the falsy resolution into the region anchor, never mount a transient
        // text node ahead of it: that node would BE the fragment scope's carrier
        // (regionPrev.nextSibling) and the first re-run's clear would dispose the
        // component scope — killing its effects while the component stays mounted.
        const FalsyFirst = () => {
          effect(() => {
            effectHits.n++;
            count();
          });
          return <>{() => show() && <span>shown</span>} tail</>;
        };
        const App = () => <FalsyFirst></FalsyFirst>;
        const __out = { App, count, show, effectHits };
      `);
      expect((client.effectHits as { n: number }).n).toBe(0); // the client instance hasn't rendered — the server arm's run was its own module scope

      hydrate(client.App as TemplateBuildFn, container);
      expect((client.effectHits as { n: number }).n).toBe(1);

      (client.show as (v: boolean) => void)(true);
      flush();
      expect(container.textContent).toBe("shown tail");

      // The scope must have survived the falsy region's first re-run.
      (client.count as (v: number) => void)(1);
      flush();
      expect((client.effectHits as { n: number }).n).toBe(2);
    });
  });
});
