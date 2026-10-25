import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { flush } from "@hellajs/core";
import { delay, resetTestState, setupContainer, suppressConsole } from "@utils/test-helpers.js";
import { hydrate, mount, Suspense, component, onError } from "@hellajs/dom";
import type { HellaNode, TemplateBuildFn } from "@hellajs/dom";
import { twoTargetStreamed, twoTargetContainer } from "./helpers";

beforeEach(() => {
  resetTestState();
});

describe("dom hydrate <Suspense>", () => {
  test("swaps staged children in, removes the template, and hydrates them reactively", async () => {
    const { container, client } = await twoTargetStreamed(`
      import { Suspense } from "@hellajs/dom";
      import { signal } from "@hellajs/core";
      const count = signal(0);
      const App = () => (
        <div id="root">
          <Suspense fallback={<span id="fb">loading</span>}>
            {
              <b id="b" data-n={count}>
                x
              </b>
            }
          </Suspense>
        </div>
      );
      const __out = { App, count };
    `);
    expect(container.querySelector("#fb")).not.toBeNull(); // fallback present pre-hydrate

    hydrate(client.App as TemplateBuildFn, container);
    expect(container.querySelector("#fb")).toBeNull(); // fallback swapped out
    expect(container.querySelector("template")).toBeNull(); // template removed
    const b = container.querySelector("#b")!;
    expect(b.getAttribute("data-n")).toBe("0");

    (client.count as (v: number) => void)(7);
    flush();
    expect(b.getAttribute("data-n")).toBe("7"); // children hydrated + reactive
  });

  test("degrades to a client re-suspend when the streamed stage never arrives", async () => {
    // Per-arm child identity proves the CLIENT arm's own child rendered: the server's
    // resolved copy rides the staged <template> — stripped here to simulate the dead stream.
    const { container, client } = await twoTargetStreamed(`
      import { Suspense } from "@hellajs/dom";
      const child = () =>
        Promise.resolve(
          __HELLA_ARM === "server" ? <p id="p-server">data</p> : <p id="p-client">late</p>,
        );
      const App = () => (
        <div id="root">
          <Suspense fallback={<span id="fb">loading</span>}>{child}</Suspense>
        </div>
      );
      const __out = { App };
    `);
    expect(container.querySelector("template")).not.toBeNull();
    container.querySelector("template")!.remove();

    // suppressConsole takes no callback — install, hydrate, restore, then assert.
    const captured = suppressConsole();
    try {
      hydrate(client.App as TemplateBuildFn, container);
    } finally {
      captured.restore();
    }
    expect(captured.warns.some((w) => String(w[0]).includes("suspense stage missing"))).toBe(true);

    await delay();
    expect(container.querySelector("#p-client")!.textContent).toBe("late");
    expect(container.querySelector("#p-server")).toBeNull(); // server copy died with the template
    expect(container.querySelector("#fb")).toBeNull(); // fallback cleared on settle
  });

  test("hydrates async-resolved children (Promise getter) from the staged template", async () => {
    const { container, client } = await twoTargetStreamed(`
      import { Suspense } from "@hellajs/dom";
      const App = () => (
        <div id="root">
          <Suspense fallback={<i>wait</i>}>{() => Promise.resolve(<p id="p">data</p>)}</Suspense>
        </div>
      );
      const __out = { App };
    `);

    hydrate(client.App as TemplateBuildFn, container);
    expect(container.querySelector("#p")!.textContent).toBe("data");
    expect(container.querySelector("i")).toBeNull(); // fallback gone
  });

  test("hydrates a fragment child (multiple resolved nodes)", async () => {
    const { container, client } = await twoTargetStreamed(`
      import { Suspense } from "@hellajs/dom";
      const App = () => (
        <div id="root">
          <Suspense fallback={<i>wait</i>}>
            {
              <>
                <b id="b1">1</b>
                <b id="b2">2</b>
              </>
            }
          </Suspense>
        </div>
      );
      const __out = { App };
    `);

    hydrate(client.App as TemplateBuildFn, container);
    expect(container.querySelector("#b1")!.textContent).toBe("1");
    expect(container.querySelector("#b2")!.textContent).toBe("2");
  });

  test("hydrates array children and wires each reactive binding", async () => {
    // JSX compiles multiple children to an array; hydrate must bind each swapped child, not just place it.
    const { container, client } = await twoTargetStreamed(`
      import { Suspense } from "@hellajs/dom";
      const hits = { n: 0 };
      const App = () => (
        <div id="root">
          <Suspense fallback={<i>wait</i>}>
            <button id="hx-a" on:click={() => { hits.n++; }}>
              A
            </button>
            <button id="hx-b" on:click={() => { hits.n++; }}>
              B
            </button>
          </Suspense>
        </div>
      );
      const __out = { App, hits };
    `);

    hydrate(client.App as TemplateBuildFn, container);
    container.querySelector("#hx-a")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    container.querySelector("#hx-b")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect((client.hits as { n: number }).n).toBe(2);
  });

  test("mounts children directly on a fresh client mount (no server HTML, fallback not shown)", () => {
    const handler = vi.fn(() => {});
    const App = () => (
      <div id="root">
        <Suspense fallback={<i>wait</i>}>
          <button id="btn" on:click={handler}>
            go
          </button>
        </Suspense>
      </div>
    );
    const container = setupContainer();
    mount(<App></App>, container);
    expect(container.querySelector("#btn")).not.toBeNull();
    expect(container.querySelector("i")).toBeNull(); // fallback is server-stream-only
    document.getElementById("btn")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test("fresh-mount renders JSX array children instead of stringifying them", () => {
    // JSX compiles <Suspense><b/></Suspense> to component(Suspense, { children: [<b/>] }) — an array.
    // resolveNode must mount the element, not fall through to a stringified text node.
    const handler = vi.fn(() => {});
    const container = setupContainer();
    mount(
      <div>
        {component(Suspense, {
          fallback: <i>wait</i>,
          children: [
            <button id="jsx-one" on:click={handler}>
              go
            </button>,
          ],
        })}
      </div>,
      container,
    );
    const btn = container.querySelector("#jsx-one");
    expect(btn).not.toBeNull();
    expect(container.textContent).not.toContain("[object Object]");
    btn!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test("fresh-mount renders multiple JSX children in document order", () => {
    const container = setupContainer();
    mount(
      <div>
        {component(Suspense, { children: [<b id="jsx-first">A</b>, <i id="jsx-second">B</i>] })}
      </div>,
      container,
    );
    const ordered = Array.from(container.querySelectorAll("#jsx-first, #jsx-second")).map(
      (el) => el.id,
    );
    expect(ordered).toEqual(["jsx-first", "jsx-second"]);
    expect(container.textContent).not.toContain("[object Object]");
  });

  test("adopts children from an ssr.async render (no stage — children already present)", async () => {
    const { container, client } = await twoTargetContainer(`
      import { Suspense } from "@hellajs/dom";
      const hits = { n: 0 };
      const App = () => (
        <div id="root">
          <Suspense fallback={<i>wait</i>}>
            <button id="btn" on:click={() => { hits.n++; }}>
              go
            </button>
          </Suspense>
        </div>
      );
      const __out = { App, hits };
    `); // sync ssr → children present, no template
    expect(container.querySelector("#btn")).not.toBeNull();

    hydrate(client.App as TemplateBuildFn, container);
    container.querySelector("#btn")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect((client.hits as { n: number }).n).toBe(1);
  });

  test("fresh-mount Promise child shows fallback, then swaps resolved content in", async () => {
    const container = setupContainer();
    mount(
      <div>
        <Suspense fallback={<i id="fb">wait</i>}>
          {() => Promise.resolve(<p id="p">data</p>)}
        </Suspense>
      </div>,
      container,
    );
    expect(container.querySelector("#fb")).not.toBeNull(); // fallback shown immediately
    await delay(0);
    expect(container.querySelector("#fb")).toBeNull(); // fallback removed
    expect(container.querySelector("#p")!.textContent).toBe("data"); // resolved swapped in
  });

  test("fresh-mount function child returning a sync node renders the node (not [object Object])", () => {
    const container = setupContainer();
    mount(
      <div>
        <Suspense fallback={<i>wait</i>}>{() => <b id="b">sync</b>}</Suspense>
      </div>,
      container,
    );
    const b = container.querySelector("#b");
    expect(b).not.toBeNull();
    expect(b!.textContent).toBe("sync");
    expect(container.textContent).not.toContain("[object");
  });

  test("fresh-mount Promise child as a JSX array (children: [fn]) suspends, not stringified", async () => {
    // babel compiles <Suspense>{() => …}</Suspense> to component(Suspense, { children: [fn] }) — an array.
    // The fresh-mount branch must unwrap the length-1 array and evaluate the producer, not stringify it.
    const container = setupContainer();
    mount(
      <div>
        {component(Suspense, {
          fallback: <i id="fb">wait</i>,
          children: [() => Promise.resolve(<p id="p">data</p>)],
        })}
      </div>,
      container,
    );
    expect(container.querySelector("#fb")).not.toBeNull();
    await delay(0);
    expect(container.querySelector("#fb")).toBeNull();
    expect(container.querySelector("#p")!.textContent).toBe("data");
    expect(container.textContent).not.toContain("[object");
  });

  test("fresh-mount Promise child with no fallback shows nothing until resolve", async () => {
    const container = setupContainer();
    mount(
      <div>
        <Suspense>{() => Promise.resolve(<p id="p">data</p>)}</Suspense>
      </div>,
      container,
    );
    expect(container.querySelector("#p")).toBeNull(); // nothing while pending
    await delay(0);
    expect(container.querySelector("#p")!.textContent).toBe("data");
  });

  test("fresh-mount Promise rejection bubbles to onError and renders its fallback", async () => {
    const handler = vi.fn(() => <p id="err">failed</p>);
    const off = onError(handler);
    const container = setupContainer();
    mount(
      <div>
        <Suspense fallback={<i id="fb">wait</i>}>
          {() => Promise.reject(new Error("boom"))}
        </Suspense>
      </div>,
      container,
    );
    expect(container.querySelector("#fb")).not.toBeNull(); // pending fallback shown
    await delay(0);
    expect(handler).toHaveBeenCalledTimes(1); // bubbled to onError
    expect(container.querySelector("#fb")).toBeNull(); // pending fallback removed
    expect(container.querySelector("#err")!.textContent).toBe("failed"); // error fallback rendered
    off();
  });

  test("fresh-mount Promise rejection with no boundary logs and renders nothing", async () => {
    const suppressed = suppressConsole();
    try {
      const container = setupContainer();
      mount(
        <div>
          <Suspense fallback={<i id="fb">wait</i>}>
            {() => Promise.reject(new Error("boom"))}
          </Suspense>
        </div>,
        container,
      );
      await delay(0);
      expect(container.querySelector("#fb")).toBeNull(); // pending fallback removed
      expect(suppressed.errors.length).toBeGreaterThan(0); // [dom] logged
      expect(container.querySelector("i")).toBeNull(); // nothing rendered
    } finally {
      suppressed.restore();
    }
  });

  test("fresh-mount Promise cancellation: unmounted before resolve → resolved content not inserted", async () => {
    let resolvePromise!: (v: HellaNode) => void;
    const pending = new Promise<HellaNode>((r) => {
      resolvePromise = r;
    });
    const handle = mount(
      <div id="c">
        <Suspense fallback={<i id="fb">wait</i>}>{() => pending}</Suspense>
      </div>,
    );
    const container = document.getElementById("c")!;
    expect(container.querySelector("#fb")).not.toBeNull(); // pending fallback shown
    handle.unmount(); // suspenseCleanup → cancelled
    resolvePromise(<p id="late">late</p>); // resolve after unmount
    await pending;
    await delay(0);
    expect(container.querySelector("#late")).toBeNull(); // cancelled — resolved content never inserted
  });

  test("fresh-mount Promise cancellation guards .catch: unmounted before reject → no onError fires", async () => {
    let rejectPromise!: (e: Error) => void;
    const pending = new Promise<HellaNode>((_, rej) => {
      rejectPromise = rej;
    });
    const handler = vi.fn(() => <p id="err"></p>);
    const off = onError(handler);
    const handle = mount(
      <div id="c">
        <Suspense fallback={<i>wait</i>}>{() => pending}</Suspense>
      </div>,
    );
    handle.unmount(); // suspenseCleanup → cancelled
    rejectPromise(new Error("boom")); // reject after unmount
    await delay(0);
    expect(handler).not.toHaveBeenCalled(); // cancelled → no dispatchError
    off();
  });
});
