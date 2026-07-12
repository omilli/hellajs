import { describe, test, expect, beforeEach, mock } from "bun:test";
import { flush, signal } from "@hellajs/core";
import { resetTestState, setupContainer } from "@utils/test-helpers.js";
import { hydrate, mount, html, Suspense } from "@hellajs/dom/bundle";
import { streamContainer } from "./helpers";
import type { HellaNode } from "@hellajs/dom";

beforeEach(() => {
  resetTestState();
});

describe("dom hydrate <Suspense>", () => {
  test("swaps staged children in, removes the template, and hydrates them reactively", async () => {
    const count = signal(0);
    const App = () => html`<div id="root"><${Suspense} fallback=${html`<span id="fb">loading</span>`}>${html`<b id="b" bind:data-n=${count}>x</b>`}</${Suspense}></div>`;
    const container = await streamContainer(html`<${App} />` as HellaNode);
    expect(container.querySelector("#fb")).not.toBeNull();   // fallback present pre-hydrate

    hydrate(html`<${App} />`, container);
    expect(container.querySelector("#fb")).toBeNull();        // fallback swapped out
    expect(container.querySelector("template")).toBeNull();   // template removed
    const b = container.querySelector("#b")!;
    expect(b.getAttribute("data-n")).toBe("0");

    count(7);
    flush();
    expect(b.getAttribute("data-n")).toBe("7");               // children hydrated + reactive
  });

  test("hydrates async-resolved children (Promise getter) from the staged template", async () => {
    const App = () => html`<div id="root"><${Suspense} fallback=${html`<i>wait</i>`}>${() => Promise.resolve(html`<p id="p">data</p>`)}</${Suspense}></div>`;
    const container = await streamContainer(html`<${App} />` as HellaNode);

    hydrate(html`<${App} />`, container);
    expect(container.querySelector("#p")!.textContent).toBe("data");
    expect(container.querySelector("i")).toBeNull();          // fallback gone
  });

  test("hydrates a fragment child (multiple resolved nodes)", async () => {
    const App = () => html`<div id="root"><${Suspense} fallback=${html`<i>wait</i>`}>${html`<b id="b1">1</b><b id="b2">2</b>`}</${Suspense}></div>`;
    const container = await streamContainer(html`<${App} />` as HellaNode);

    hydrate(html`<${App} />`, container);
    expect(container.querySelector("#b1")!.textContent).toBe("1");
    expect(container.querySelector("#b2")!.textContent).toBe("2");
  });

  test("mounts children directly on a fresh client mount (no server HTML, fallback not shown)", () => {
    const handler = mock(() => {});
    const App = () => html`<div id="root"><${Suspense} fallback=${html`<i>wait</i>`}><button id="btn" on:click=${handler}>go</button></${Suspense}></div>`;
    const container = setupContainer();
    mount(html`<${App} />`, container);
    expect(container.querySelector("#btn")).not.toBeNull();
    expect(container.querySelector("i")).toBeNull();   // fallback is server-stream-only
    document.getElementById("btn")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test("adopts children from an ssrAsync render (no stage — children already present)", async () => {
    const handler = mock(() => {});
    const App = () => html`<div id="root"><${Suspense} fallback=${html`<i>wait</i>`}><button id="btn" on:click=${handler}>go</button></${Suspense}></div>`;
    const { ssrContainer } = await import("./helpers");
    const container = ssrContainer(html`<${App} />` as HellaNode);   // sync ssr → children present, no template
    expect(container.querySelector("#btn")).not.toBeNull();

    hydrate(html`<${App} />`, container);
    document.getElementById("btn")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
