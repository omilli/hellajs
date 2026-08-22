import { describe, test, expect, beforeEach } from "bun:test";
import { signal, flush } from "@hellajs/core";
import { resetTestState, setupContainer } from "@utils/test-helpers.js";
import { hydrate, html, ForEach, Suspense } from "@hellajs/dom/bundle";
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
});
