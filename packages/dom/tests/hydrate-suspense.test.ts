import { describe, test, expect, beforeEach, mock } from "bun:test";
import { flush, signal } from "@hellajs/core";
import { delay, resetTestState, setupContainer, suppressConsole } from "@utils/test-helpers.js";
import { hydrate, mount, html, Suspense, component, onError } from "@hellajs/dom/bundle";
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

  test("hydrates array children and wires each reactive binding", async () => {
    // JSX compiles multiple children to an array; hydrate must bind each swapped child, not just place it.
    const handler = mock(() => {});
    const App = () => html`<div id="root"><${Suspense} fallback=${html`<i>wait</i>`}><button id="hx-a" on:click=${handler}>A</button><button id="hx-b" on:click=${handler}>B</button></${Suspense}></div>`;
    const container = await streamContainer(html`<${App} />` as HellaNode);

    hydrate(html`<${App} />`, container);
    container.querySelector("#hx-a")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    container.querySelector("#hx-b")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(2);
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

  test("fresh-mount renders JSX array children instead of stringifying them", () => {
    // JSX compiles <Suspense><b/></Suspense> to component(Suspense, { children: [<b/>] }) — an array.
    // resolveNode must mount the element, not fall through to a stringified text node.
    const handler = mock(() => {});
    const container = setupContainer();
    mount(html`<div>${component(Suspense, { fallback: html`<i>wait</i>`, children: [html`<button id="jsx-one" on:click=${handler}>go</button>`] })}</div>`, container);
    const btn = container.querySelector("#jsx-one");
    expect(btn).not.toBeNull();
    expect(container.textContent).not.toContain("[object Object]");
    btn!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test("fresh-mount renders multiple JSX children in document order", () => {
    const container = setupContainer();
    mount(html`<div>${component(Suspense, { children: [
      html`<b id="jsx-first">A</b>`,
      html`<i id="jsx-second">B</i>`,
    ] })}</div>`, container);
    const ordered = Array.from(container.querySelectorAll("#jsx-first, #jsx-second")).map((el) => el.id);
    expect(ordered).toEqual(["jsx-first", "jsx-second"]);
    expect(container.textContent).not.toContain("[object Object]");
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

  test("fresh-mount Promise child shows fallback, then swaps resolved content in", async () => {
    const container = setupContainer();
    mount(html`<div><${Suspense} fallback=${html`<i id="fb">wait</i>`}>${() => Promise.resolve(html`<p id="p">data</p>`)}</${Suspense}></div>`, container);
    expect(container.querySelector("#fb")).not.toBeNull();        // fallback shown immediately
    await delay(10);
    expect(container.querySelector("#fb")).toBeNull();            // fallback removed
    expect(container.querySelector("#p")!.textContent).toBe("data");   // resolved swapped in
  });

  test("fresh-mount function child returning a sync node renders the node (not [object Object])", () => {
    const container = setupContainer();
    mount(html`<div><${Suspense} fallback=${html`<i>wait</i>`}>${() => html`<b id="b">sync</b>`}</${Suspense}></div>`, container);
    const b = container.querySelector("#b");
    expect(b).not.toBeNull();
    expect(b!.textContent).toBe("sync");
    expect(container.textContent).not.toContain("[object");
  });

  test("fresh-mount Promise child as a JSX array (children: [fn]) suspends, not stringified", async () => {
    // babel compiles <Suspense>{() => …}</Suspense> to component(Suspense, { children: [fn] }) — an array.
    // The fresh-mount branch must unwrap the length-1 array and evaluate the producer, not stringify it.
    const container = setupContainer();
    mount(html`<div>${component(Suspense, { fallback: html`<i id="fb">wait</i>`, children: [() => Promise.resolve(html`<p id="p">data</p>` as HellaNode)] })}</div>`, container);
    expect(container.querySelector("#fb")).not.toBeNull();
    await delay(10);
    expect(container.querySelector("#fb")).toBeNull();
    expect(container.querySelector("#p")!.textContent).toBe("data");
    expect(container.textContent).not.toContain("[object");
  });

  test("fresh-mount Promise child with no fallback shows nothing until resolve", async () => {
    const container = setupContainer();
    mount(html`<div><${Suspense}>${() => Promise.resolve(html`<p id="p">data</p>`)}</${Suspense}></div>`, container);
    expect(container.querySelector("#p")).toBeNull();              // nothing while pending
    await delay(10);
    expect(container.querySelector("#p")!.textContent).toBe("data");
  });

  test("fresh-mount Promise rejection bubbles to onError and renders its fallback", async () => {
    const handler = mock(() => html`<p id="err">failed</p>` as HellaNode);
    const off = onError(handler);
    const container = setupContainer();
    mount(html`<div><${Suspense} fallback=${html`<i id="fb">wait</i>`}>${() => Promise.reject(new Error("boom"))}</${Suspense}></div>`, container);
    expect(container.querySelector("#fb")).not.toBeNull();        // pending fallback shown
    await delay(10);
    expect(handler).toHaveBeenCalledTimes(1);                    // bubbled to onError
    expect(container.querySelector("#fb")).toBeNull();            // pending fallback removed
    expect(container.querySelector("#err")!.textContent).toBe("failed");   // error fallback rendered
    off();
  });

  test("fresh-mount Promise rejection with no boundary logs and renders nothing", async () => {
    const suppressed = suppressConsole();
    try {
      const container = setupContainer();
      mount(html`<div><${Suspense} fallback=${html`<i id="fb">wait</i>`}>${() => Promise.reject(new Error("boom"))}</${Suspense}></div>`, container);
      await delay(10);
      expect(container.querySelector("#fb")).toBeNull();          // pending fallback removed
      expect(suppressed.errors.length).toBeGreaterThan(0);         // [dom] logged
      expect(container.querySelector("i")).toBeNull();             // nothing rendered
    } finally {
      suppressed.restore();
    }
  });

  test("fresh-mount Promise cancellation: unmounted before resolve → resolved content not inserted", async () => {
    let resolvePromise!: (v: HellaNode) => void;
    const pending = new Promise<HellaNode>(r => { resolvePromise = r; });
    const handle = mount(html`
      <div id="c"><${Suspense} fallback=${html`<i id="fb">wait</i>`}>${() => pending}</${Suspense}></div>
    `);
    const container = document.getElementById("c")!;
    expect(container.querySelector("#fb")).not.toBeNull();        // pending fallback shown
    handle.unmount();                                             // suspenseCleanup → cancelled
    resolvePromise(html`<p id="late">late</p>` as HellaNode);                 // resolve after unmount
    await pending;
    await delay(10);
    expect(container.querySelector("#late")).toBeNull();         // cancelled — resolved content never inserted
  });

  test("fresh-mount Promise cancellation guards .catch: unmounted before reject → no onError fires", async () => {
    let rejectPromise!: (e: Error) => void;
    const pending = new Promise<HellaNode>((_, rej) => { rejectPromise = rej; });
    const handler = mock(() => html`<p id="err"/>` as HellaNode);
    const off = onError(handler);
    const handle = mount(html`
      <div id="c"><${Suspense} fallback=${html`<i>wait</i>`}>${() => pending}</${Suspense}></div>
    `);
    handle.unmount();                                             // suspenseCleanup → cancelled
    rejectPromise(new Error("boom"));                             // reject after unmount
    await delay(10);
    expect(handler).not.toHaveBeenCalled();                       // cancelled → no dispatchError
    off();
  });
});
