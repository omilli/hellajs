import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { flush } from "@hellajs/core";
import { delay, suppressConsole, resetTestState } from "@utils/test-helpers.js";
import { hydrate, onError } from "@hellajs/dom";
import type { TemplateBuildFn } from "@hellajs/dom";
import { twoTarget, twoTargetAsync, twoTargetStreamed } from "./helpers";

beforeEach(() => {
  resetTestState();
});

describe("ssr to hydrate integration", () => {
  test("ssr output hydrates with identity preservation", async () => {
    const { container, client } = await twoTarget(`
      import { signal } from "@hellajs/core";
      const count = signal(0);
      const App = () => (
        <div id="root">
          <span id="s">{count}</span>
        </div>
      );
      const __out = { App, count };
    `);
    const sBefore = container.querySelector("#s")!;

    hydrate(client.App as TemplateBuildFn, container);
    expect(container.querySelector("#s")).toBe(sBefore);
    expect(sBefore.textContent).toBe("0");

    (client.count as (v: number) => void)(7);
    flush();
    expect(sBefore.textContent).toBe("7");
  });

  test("ssr ForEach output hydrates and reconciles updates", async () => {
    const { container, client } = await twoTarget(`
      import { signal } from "@hellajs/core";
      import { ForEach } from "@hellajs/dom";
      const items = signal([
        { id: 1, t: "a" },
        { id: 2, t: "b" },
      ]);
      const App = () => (
        <ul id="list">
          <ForEach
            each={items}
            use={(i) => <li id={"i" + i.id}>{i.t}</li>}
          ></ForEach>
        </ul>
      );
      const __out = { App, items };
    `);
    const i1Before = container.querySelector("#i1")!;
    const items = client.items as (v?: unknown) => unknown[];

    hydrate(client.App as TemplateBuildFn, container);
    expect(container.querySelector("#i1")).toBe(i1Before);

    items([...items(), { id: 3, t: "c" }]);
    flush();
    expect(container.querySelector("#i3")!.textContent).toBe("c");

    items(items().filter((i) => (i as { id: number }).id !== 1));
    flush();
    expect(container.querySelector("#i1")).toBeNull();
  });

  test("ssr adjacent reactive text hydrates without rebuild (coalescing gone)", async () => {
    const { container, client } = await twoTarget(`
      import { signal } from "@hellajs/core";
      const count = signal(5);
      const App = () => <div id="root">a{count}b</div>;
      const __out = { App, count };
    `);
    // ssr bounds the reactive value in its own region: a<!--[-->5<!--]-->b → 5 nodes
    expect(container.querySelector("#root")!.childNodes.length).toBe(5);

    hydrate(client.App as TemplateBuildFn, container);
    expect(container.querySelector("#root")!.textContent).toBe("a5b");

    (client.count as (v: number) => void)(9);
    flush();
    expect(container.querySelector("#root")!.textContent).toBe("a9b");
  });

  test("ssr reactive getter returning a ForEach hydrates (C1 resolved)", async () => {
    const { container, client } = await twoTarget(`
      import { signal } from "@hellajs/core";
      import { ForEach } from "@hellajs/dom";
      const show = signal(true);
      const items = signal([
        { id: 1, t: "a" },
        { id: 2, t: "b" },
      ]);
      const App = () => (
        <div id="root">
          {() =>
            show()
              ? ForEach({
                  each: items,
                  use: (i) => <li id={"i" + i.id}>{i.t}</li>,
                })
              : null
          }
        </div>
      );
      const __out = { App, items };
    `);
    expect(container.querySelector("#i1")!.textContent).toBe("a");

    hydrate(client.App as TemplateBuildFn, container);
    expect(container.querySelector("#i1")!.textContent).toBe("a");

    const items = client.items as (v?: unknown) => unknown[];
    items([...items(), { id: 3, t: "c" }]);
    flush();
    expect(container.querySelector("#i3")!.textContent).toBe("c");
  });

  test("hydrate swaps a streamed <Suspense> via the fallback path when the inline swap script doesn’t run (HappyDOM)", async () => {
    // ssr.stream now emits an inline $hs swap script per region; HappyDOM does not execute inline scripts,
    // so the staged <template> + sentinel remain and hydrate’s swapSuspenseStage fallback swaps them in.
    const { container, client } = await twoTargetStreamed(`
      import { Suspense } from "@hellajs/dom";
      const App = () => (
        <div id="root">
          <Suspense fallback={<p>loading</p>}>{() => Promise.resolve(<b>resolved</b>)}</Suspense>
        </div>
      );
      const __out = { App };
    `);
    hydrate(client.App as TemplateBuildFn, container);
    expect(container.querySelector("#root b")!.textContent).toBe("resolved");
  });

  test("server-rendered Lazy content hydrates without a loading flash", async () => {
    // The loader phases per arm: the server arm resolves instantly (the streamed HTML
    // carries the resolved content), the client arm parks until the test releases it.
    const { container, client } = await twoTargetAsync(`
      import { Lazy } from "@hellajs/dom";
      let releaseClient;
      let loads = 0;
      const loader = () => {
        loads++;
        if (__HELLA_ARM === "server") {
          return Promise.resolve(<b id="c">resolved</b>);
        }
        return new Promise((r) => {
          releaseClient = r;
        });
      };
      const App = () => (
        <div id="root">
          a<Lazy loader={loader} loading={<i>loading</i>}></Lazy>b
        </div>
      );
      const __out = { App, run: (v) => releaseClient(v), hits: () => loads, makeFresh: () => <span id="fresh">fresh</span> };
    `);
    expect(container.textContent).toBe("aresolvedb"); // server rendered the loaded component — the loading fallback never appears in the HTML
    const serverNode = container.querySelector("#c")!;

    hydrate(client.App as TemplateBuildFn, container);
    expect((client.hits as () => number)()).toBe(1); // the client module re-ran its own loader on hydrate (the server arm's run lives in its module scope)
    await delay(0); // client loader still pending — server content adopted, no flash
    expect(container.querySelector("#c")).toBe(serverNode);
    expect(container.textContent).toBe("aresolvedb");
    expect(container.textContent).not.toContain("loading");

    (client.run as (v: unknown) => void)((client.makeFresh as () => unknown)());
    await delay(0);
    expect(container.textContent).toBe("afreshb"); // the fresh render replaced the server content
    expect(container.textContent).not.toContain("[object Promise]");
  });

  test("a rejecting <Suspense> region re-suspends on the client while the healthy sibling's swap is adopted", async () => {
    // the server skips the failed region's <template> (stream completes); on the client the sentinel has no
    // template → stageMissing → <Suspense> re-runs the getter → the rejection bubbles to onError (React $RX parity)
    const { container, client } = await twoTargetStreamed(`
      import { Suspense } from "@hellajs/dom";
      const App = () => (
        <div id="root">
          <Suspense fallback={<p>boom-fb</p>}>{() => Promise.reject(new Error("boom"))}</Suspense>
          <Suspense fallback={<p>ok-fb</p>}>{() => Promise.resolve(<b>OK</b>)}</Suspense>
        </div>
      );
      const __out = { App };
    `);
    const handler = vi.fn<(error: Error) => null>(() => null);
    onError(handler);
    const sup = suppressConsole(); // [ssr] skip warn (render) + [dom] stage-missing warn (hydrate)
    try {
      hydrate(client.App as TemplateBuildFn, container);
      await delay(0); // macrotask — the .then().catch() chain over the rejection settles
    } finally {
      sup.restore();
      onError(null);
    }
    expect(handler).toHaveBeenCalledTimes(1);
    const [err] = handler.mock.calls[0]!; // ErrorFn passes (error, context) — assert the error
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("boom");
    expect(container.textContent).toContain("OK"); // healthy sibling's resolved content adopted
    expect(container.textContent).not.toContain("ok-fb"); // its fallback swapped out
    expect(container.textContent).not.toContain("boom-fb"); // failed region's fallback removed on rejection
    expect(container.textContent).not.toContain("[object Promise]"); // no stringified Promise beside the matched nodes
  });
});
