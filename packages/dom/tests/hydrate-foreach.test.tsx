import { describe, test, expect, beforeEach, mock } from "bun:test";
import { flush, signal } from "@hellajs/core";
import { resetTestState, delay, suppressConsole } from "@utils/test-helpers.js";
import { hydrate, ForEach, Transition, Portal, Lazy } from "@hellajs/dom";
import type { HellaNode } from "@hellajs/dom";
import { ssrContainer, ssrAsyncContainer, suppressWarn } from "./helpers";

/** Two-phase loader for hydrate tests: the first call (the server render) resolves `server`; later calls (the client re-run) stay pending until the test settles them. */
const phasedLoader = (server: HellaNode) => {
  let settleClient!: (v: HellaNode) => void;
  let failClient!: (e: Error) => void;
  const loader = mock((): Promise<HellaNode> =>
    loader.mock.calls.length === 1
      ? Promise.resolve(server)
      : new Promise<HellaNode>((res, rej) => { settleClient = res; failClient = rej; }));
  return {
    loader,
    resolveClient: (v: HellaNode) => settleClient(v),
    rejectClient: (e: Error) => failClient(e),
  };
};

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("hydrate adoption", () => {
    test("adopts keyed server-rendered items and reconciles updates", () => {
      const items = signal([{ id: 1, text: "a" }, { id: 2, text: "b" }, { id: 3, text: "c" }]);
      const App = () => <ul id="list"><ForEach each={items} use={((item: { id: number; text: string }) => <li id={"item-" + item.id}>{item.text}</li>)}></ForEach></ul>;
      const container = ssrContainer(<App></App>);
      const li1Before = container.querySelector("#item-1")!;
      const li2Before = container.querySelector("#item-2")!;

      hydrate(<App></App>, container);
      expect(container.querySelector("#item-1")).toBe(li1Before);
      expect(container.querySelector("#item-2")).toBe(li2Before);

      items([...items(), { id: 4, text: "d" }]);
      flush();
      expect(container.querySelector("#item-4")!.textContent).toBe("d");

      items(items().filter(i => i.id !== 2));
      flush();
      expect(container.querySelector("#item-2")).toBeNull();
      expect(container.querySelectorAll("li").length).toBe(3);
    });

    test("adopts server-rendered keyed items without key attributes and reconciles a prepend", () => {
      const items = signal([{ uid: 1, text: "a" }, { uid: 2, text: "b" }, { uid: 3, text: "c" }]);
      const App = () => <ul id="list"><ForEach each={items} use={((item: { uid: number; text: string }) => <li key={item.uid} id={"item-" + item.uid}>{item.text}</li>)}></ForEach></ul>;
      const container = ssrContainer(<App></App>);
      expect(container.querySelector("li")!.outerHTML).toBe('<li id="item-1">a</li>');
      const bBefore = container.querySelector("#item-2")!;
      const cBefore = container.querySelector("#item-3")!;

      hydrate(<App></App>, container);
      expect(container.querySelectorAll("[key]")).toHaveLength(0);
      expect(container.querySelector("#item-2")).toBe(bBefore);

      items([{ uid: 0, text: "z" }, ...items()]);
      flush();
      expect(container.querySelector("#item-0")!.textContent).toBe("z");
      expect(container.querySelector("#item-3")).toBe(cBefore);
    });

    test("adopts index-keyed items by position", () => {
      const items = signal([{ v: "a" }, { v: "b" }]);
      const App = () => <ul id="list"><ForEach each={items} use={((item: { v: string }) => <li>{item.v}</li>)}></ForEach></ul>;
      const container = ssrContainer(<App></App>);
      const lisBefore = Array.from(container.querySelectorAll("li"));

      hydrate(<App></App>, container);
      const lisAfter = Array.from(container.querySelectorAll("li"));
      expect(lisAfter.length).toBe(2);
      expect(lisAfter[0]).toBe(lisBefore[0]);
      expect(lisAfter[1]).toBe(lisBefore[1]);
    });

    test("adopts nested ForEach regions", () => {
      const groups = signal([
        { id: "g1", items: [{ id: "a" }, { id: "b" }] },
        { id: "g2", items: [{ id: "c" }] },
      ]);
      const App = () => <div id="root"><ForEach each={groups} use={((g: { id: string; items: { id: string }[] }) => <ul id={g.id}><ForEach each={g.items} use={((i: { id: string }) => <li id={g.id + "-" + i.id}>{i.id}</li>)}></ForEach></ul>)}></ForEach></div>;
      const container = ssrContainer(<App></App>);
      const aBefore = container.querySelector("#g1-a")!;
      const cBefore = container.querySelector("#g2-c")!;

      hydrate(<App></App>, container);
      expect(container.querySelector("#g1-a")).toBe(aBefore);
      expect(container.querySelector("#g2-c")).toBe(cBefore);
    });

    test("falls back to re-mount on a ForEach count-mismatch", () => {
      const items = signal([{ id: 1 }, { id: 2 }, { id: 3 }]);
      const App = () => <ul id="list"><ForEach each={items} use={((i: { id: number }) => <li id={"item-" + i.id}>{i.id}</li>)}></ForEach></ul>;
      const container = ssrContainer(<App></App>);
      container.querySelector("#item-2")!.remove();

      suppressWarn(() => {
        hydrate(<App></App>, container);
      });
      expect(container.querySelectorAll("li").length).toBe(3);
    });

    test("preserves siblings outside a ForEach region on count-mismatch", () => {
      const items = signal([{ id: 1 }, { id: 2 }, { id: 3 }]);
      const App = () => <div id="root"><span id="lead">L</span><ul id="list"><ForEach each={items} use={((i: { id: number }) => <li id={"item-" + i.id}>{i.id}</li>)}></ForEach></ul><span id="trail">T</span></div>;
      const container = ssrContainer(<App></App>);
      container.querySelector("#item-2")!.remove();

      suppressWarn(() => {
        hydrate(<App></App>, container);
      });
      expect(container.querySelectorAll("li").length).toBe(3);
      expect(container.querySelector("#trail")!.textContent).toBe("T");
      expect(container.querySelector("#lead")!.textContent).toBe("L");
    });

    test("adopts a Transition child when show is true and reconciles toggles", () => {
      const show = signal(true);
      const App = () => <div id="root"><Transition show={show}>{(<span id="t">visible</span>)}</Transition></div>;
      const container = ssrContainer(<App></App>);
      const tBefore = container.querySelector("#t")!;

      hydrate(<App></App>, container);
      expect(container.querySelector("#t")).toBe(tBefore);

      show(false);
      flush();
      expect(container.querySelector("#t")).toBeNull();

      show(true);
      flush();
      expect(container.querySelector("#t")!.textContent).toBe("visible");
    });

    test("applies the appear class on hydrate when show is true", () => {
      const show = signal(true);
      const App = () => <div id="root"><Transition show={show} appear="fade-in">{(<span id="t">visible</span>)}</Transition></div>;
      const container = ssrContainer(<App></App>);

      hydrate(<App></App>, container);
      expect(container.querySelector("#t")!.classList.contains("fade-in")).toBe(true);
    });

    test("hydrates a Transition with show false and enters on toggle", () => {
      const show = signal(false);
      const App = () => <div id="root"><Transition show={show}>{(<span id="t">visible</span>)}</Transition></div>;
      const container = ssrContainer(<App></App>);
      expect(container.querySelector("#t")).toBeNull();

      hydrate(<App></App>, container);
      expect(container.querySelector("#t")).toBeNull();

      show(true);
      flush();
      expect(container.querySelector("#t")!.textContent).toBe("visible");
    });

    test("re-mounts a Portal into its target on hydrate", () => {
      const target = document.createElement("div");
      target.id = "portal-target";
      document.body.appendChild(target);
      const App = () => <div id="root">before<Portal to="#portal-target">{(<span id="ported">ported</span>)}</Portal>after</div>;
      const container = ssrContainer(<App></App>);
      expect(target.querySelector("#ported")).toBeNull();

      hydrate(<App></App>, container);
      flush();
      expect(target.querySelector("#ported")!.textContent).toBe("ported");
    });

    test("re-runs a Lazy loader and replaces the server loading node on resolve", async () => {
      let resolveLoader!: (v: () => HellaNode) => void;
      const loader = mock(() => new Promise<() => HellaNode>((r) => { resolveLoader = r; }));
      const App = () => <div id="root"><Lazy loader={loader} loading={(<span id="loading">loading</span>)}></Lazy></div>;
      const container = ssrContainer(<App></App>);
      expect(container.querySelector("#loading")).not.toBeNull();

      hydrate(<App></App>, container);
      await delay();                                 // sync-rendered loading UI stays visible while the loader runs (not cleared at hydrate)
      expect(container.querySelector("#loading")).not.toBeNull();
      resolveLoader(() => <span id="loaded">loaded</span> as HellaNode);
      await delay(0);
      expect(loader).toHaveBeenCalledTimes(1);
      expect(container.querySelector("#loaded")!.textContent).toBe("loaded");
      expect(container.querySelector("#loading")).toBeNull();
    });

    test("keeps server-rendered Lazy content until the loader re-run replaces it", async () => {
      const phased = phasedLoader(<b id="c">server</b> as HellaNode);
      const App = () => <div id="root"><Lazy loader={phased.loader} loading={(<i>loading</i>)}></Lazy></div>;
      const container = await ssrAsyncContainer(<App></App>);
      const serverNode = container.querySelector("#c")!;
      expect(container.textContent).toBe("server");                 // async render awaited the loader — loaded content shipped

      hydrate(<App></App>, container);
      await delay();                                                // client loader pending — server content adopted, loading never inserted
      expect(container.querySelector("#c")).toBe(serverNode);
      expect(container.textContent).toBe("server");
      expect(container.textContent).not.toContain("loading");

      phased.resolveClient(<span id="fresh">fresh</span> as HellaNode);
      await delay(0);
      expect(container.textContent).toBe("fresh");                 // fresh render replaced the server content
      expect(container.querySelector("#c")).toBeNull();
    });

    test("replaces server-rendered Lazy content with the fallback when the loader rejects", async () => {
      const phased = phasedLoader(<b id="c">server</b> as HellaNode);
      const App = () => <div id="root"><Lazy loader={phased.loader} fallback={(<p id="fb">fb</p>)}></Lazy></div>;
      const container = await ssrAsyncContainer(<App></App>);
      expect(container.textContent).toBe("server");

      hydrate(<App></App>, container);
      await delay();
      phased.rejectClient(new Error("boom"));
      await delay(0);
      expect(container.textContent).toBe("fb");
      expect(container.querySelector("#c")).toBeNull();
    });

    test("keeps server-rendered Lazy content and logs when the loader rejects without a fallback", async () => {
      const phased = phasedLoader(<b id="c">server</b> as HellaNode);
      const App = () => <div id="root"><Lazy loader={phased.loader}></Lazy></div>;
      const container = await ssrAsyncContainer(<App></App>);
      const serverNode = container.querySelector("#c")!;

      const suppressed = suppressConsole();
      try {
        hydrate(<App></App>, container);
        await delay();
        phased.rejectClient(new Error("boom"));
        await delay(0);
      } finally {
        suppressed.restore();
      }
      expect(container.querySelector("#c")).toBe(serverNode);     // no fallback — server content stays (static degradation)
      expect(container.textContent).toBe("server");
      expect(suppressed.errors).toHaveLength(1);
      expect(suppressed.errors[0]![0]).toBe("[dom] Lazy:");
    });
  });
});
