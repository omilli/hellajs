import { describe, test, expect, beforeEach, mock } from "bun:test";
import { signal, flush } from "@hellajs/core";
import { delay, suppressConsole, resetTestState, setupContainer } from "@utils/test-helpers.js";
import { hydrate, html, onError, ForEach, Suspense, Lazy } from "@hellajs/dom/bundle";
import { ssr } from "@hellajs/ssr/bundle";
import type { HellaNode } from "@hellajs/dom";
import { collect } from "./helpers";

beforeEach(() => {
  resetTestState();
});

describe("ssr to hydrate integration", () => {
  test("ssr output hydrates with identity preservation", () => {
    const count = signal(0);
    const App = () => html`<div id="root"><span id="s">${count}</span></div>`;
    const container = setupContainer();
    container.innerHTML = ssr(html`<${App} />` as HellaNode);
    const sBefore = container.querySelector("#s")!;

    hydrate(html`<${App} />`, container);
    expect(container.querySelector("#s")).toBe(sBefore);
    expect(sBefore.textContent).toBe("0");

    count(7);
    flush();
    expect(sBefore.textContent).toBe("7");
  });

  test("ssr ForEach output hydrates and reconciles updates", () => {
    const items = signal([{ id: 1, t: "a" }, { id: 2, t: "b" }]);
    const App = () => html`<ul id="list"><${ForEach} each=${items} use=${(i: { id: number; t: string }) => html`<li id=${"i" + i.id}>${i.t}</li>`} /></ul>`;
    const container = setupContainer();
    container.innerHTML = ssr(html`<${App} />` as HellaNode);
    const i1Before = container.querySelector("#i1")!;

    hydrate(html`<${App} />`, container);
    expect(container.querySelector("#i1")).toBe(i1Before);

    items([...items(), { id: 3, t: "c" }]);
    flush();
    expect(container.querySelector("#i3")!.textContent).toBe("c");

    items(items().filter(i => i.id !== 1));
    flush();
    expect(container.querySelector("#i1")).toBeNull();
  });

  test("ssr adjacent reactive text hydrates without rebuild (coalescing gone)", () => {
    const count = signal(5);
    const App = () => html`<div id="root">a${count}b</div>`;
    const container = setupContainer();
    container.innerHTML = ssr(html`<${App} />` as HellaNode);
    // ssr bounds the reactive value in its own region: a<!--[-->5<!--]-->b → 5 nodes
    expect(container.querySelector("#root")!.childNodes.length).toBe(5);

    hydrate(html`<${App} />`, container);
    expect(container.querySelector("#root")!.textContent).toBe("a5b");

    count(9);
    flush();
    expect(container.querySelector("#root")!.textContent).toBe("a9b");
  });

  test("ssr reactive getter returning a ForEach hydrates (C1 resolved)", () => {
    const show = signal(true);
    const items = signal([{ id: 1, t: "a" }, { id: 2, t: "b" }]);
    const App = () => html`<div id="root">${() => show() ? ForEach({ each: items, use: (i: { id: number; t: string }) => html`<li id=${"i" + i.id}>${i.t}</li>` }) : null}</div>`;
    const container = setupContainer();
    container.innerHTML = ssr(html`<${App} />` as HellaNode);
    expect(container.querySelector("#i1")!.textContent).toBe("a");

    hydrate(html`<${App} />`, container);
    expect(container.querySelector("#i1")!.textContent).toBe("a");

    items([...items(), { id: 3, t: "c" }]);
    flush();
    expect(container.querySelector("#i3")!.textContent).toBe("c");
  });

  test("hydrate swaps a streamed <Suspense> via the fallback path when the inline swap script doesn’t run (HappyDOM)", async () => {
    // ssr.stream now emits an inline $hs swap script per region; HappyDOM does not execute inline scripts,
    // so the staged <template> + sentinel remain and hydrate’s swapSuspenseStage fallback swaps them in.
    const tree = () => html`<div id="root"><${Suspense} fallback=${html`<p>loading</p>`}>${() => Promise.resolve(html`<b>resolved</b>`)}</${Suspense}></div>` as HellaNode;
    const container = setupContainer();
    container.innerHTML = await collect(ssr.stream(tree()));   // scripts present but NOT executed
    hydrate(tree(), container);
    expect(container.querySelector("#root b")!.textContent).toBe("resolved");
  });

  test("server-rendered Lazy content hydrates without a loading flash", async () => {
    let resolveLoader!: (v: HellaNode) => void;
    const loader = mock(() => new Promise<HellaNode>((r) => { resolveLoader = r; }));
    const App = () => html`<div id="root">a<${Lazy} loader=${loader} loading=${html`<i>loading</i>`} />b</div>`;
    const container = setupContainer();
    const rendered = ssr.async(html`<${App} />` as HellaNode);
    await delay(0);                                                // let the walk reach and call the server loader
    resolveLoader(html`<b id="c">resolved</b>` as HellaNode);
    container.innerHTML = await rendered;
    expect(container.textContent).toBe("aresolvedb");              // server rendered the loaded component — the loading fallback never appears in the HTML
    const serverNode = container.querySelector("#c")!;

    hydrate(html`<${App} />`, container);
    expect(loader).toHaveBeenCalledTimes(2);                       // the client always re-runs the loader (the chunk must load for interactivity)
    await delay(0);                                                // client loader still pending — server content adopted, no flash
    expect(container.querySelector("#c")).toBe(serverNode);
    expect(container.textContent).toBe("aresolvedb");
    expect(container.textContent).not.toContain("loading");

    resolveLoader(html`<span id="fresh">fresh</span>` as HellaNode);
    await delay(0);
    expect(container.textContent).toBe("afreshb");                // the fresh render replaced the server content
    expect(container.textContent).not.toContain("[object Promise]");
  });

  test("a rejecting <Suspense> region re-suspends on the client while the healthy sibling's swap is adopted", async () => {
    // the server skips the failed region's <template> (stream completes); on the client the sentinel has no
    // template → stageMissing → <Suspense> re-runs the getter → the rejection bubbles to onError (React $RX parity)
    const tree = () => html`<div id="root"><${Suspense} fallback=${html`<p>boom-fb</p>`}>${() => Promise.reject(new Error("boom"))}</${Suspense}><${Suspense} fallback=${html`<p>ok-fb</p>`}>${() => Promise.resolve(html`<b>OK</b>`)}</${Suspense}></div>` as HellaNode;
    const container = setupContainer();
    const handler = mock<(error: Error) => null>(() => null);
    onError(handler);
    const sup = suppressConsole();                             // [ssr] skip warn (render) + [dom] stage-missing warn (hydrate)
    try {
      container.innerHTML = await collect(ssr.stream(tree())); // HappyDOM never executes the inline $hs scripts
      hydrate(tree(), container);
      await delay(0);                                          // macrotask — the .then().catch() chain over the rejection settles
    } finally {
      sup.restore();
      onError(null);
    }
    expect(handler).toHaveBeenCalledTimes(1);
    const [err] = handler.mock.calls[0]!;                   // ErrorFn passes (error, context) — assert the error
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("boom");
    expect(container.textContent).toContain("OK");                    // healthy sibling's resolved content adopted
    expect(container.textContent).not.toContain("ok-fb");             // its fallback swapped out
    expect(container.textContent).not.toContain("boom-fb");           // failed region's fallback removed on rejection
    expect(container.textContent).not.toContain("[object Promise]");  // no stringified Promise beside the matched nodes
  });
});
