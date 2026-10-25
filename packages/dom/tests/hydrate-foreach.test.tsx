import { describe, test, expect, beforeEach } from "vite-plus/test";
import { flush } from "@hellajs/core";
import { resetTestState, delay, suppressConsole } from "@utils/test-helpers.js";
import { hydrate } from "@hellajs/dom";
import type { TemplateBuildFn } from "@hellajs/dom";
import { twoTargetContainer, twoTargetAsyncContainer, suppressWarn } from "./helpers";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("hydrate adoption", () => {
    test("adopts keyed server-rendered items and reconciles updates", async () => {
      const { container, client } = await twoTargetContainer(`
        import { ForEach } from "@hellajs/dom";
        import { signal } from "@hellajs/core";
        const items = signal([
          { id: 1, text: "a" },
          { id: 2, text: "b" },
          { id: 3, text: "c" },
        ]);
        const App = () => (
          <ul id="list">
            <ForEach
              each={items}
              use={(item) => (
                <li id={"item-" + item.id}>{item.text}</li>
              )}
            ></ForEach>
          </ul>
        );
        const __out = { App, items };
      `);
      const li1Before = container.querySelector("#item-1")!;
      const li2Before = container.querySelector("#item-2")!;

      hydrate(client.App as TemplateBuildFn, container);
      expect(container.querySelector("#item-1")).toBe(li1Before);
      expect(container.querySelector("#item-2")).toBe(li2Before);

      const items = client.items as (v?: unknown) => unknown[];
      items([...items(), { id: 4, text: "d" }]);
      flush();
      expect(container.querySelector("#item-4")!.textContent).toBe("d");

      items((items() as { id: number }[]).filter((i) => i.id !== 2));
      flush();
      expect(container.querySelector("#item-2")).toBeNull();
      expect(container.querySelectorAll("li").length).toBe(3);
    });

    test("adopts server-rendered keyed items without key attributes and reconciles a prepend", async () => {
      const { container, client } = await twoTargetContainer(`
        import { ForEach } from "@hellajs/dom";
        import { signal } from "@hellajs/core";
        const items = signal([
          { uid: 1, text: "a" },
          { uid: 2, text: "b" },
          { uid: 3, text: "c" },
        ]);
        const App = () => (
          <ul id="list">
            <ForEach
              each={items}
              use={(item) => (
                <li key={item.uid} id={"item-" + item.uid}>
                  {item.text}
                </li>
              )}
            ></ForEach>
          </ul>
        );
        const __out = { App, items };
      `);
      expect(container.querySelector("li")!.outerHTML).toBe('<li id="item-1">a</li>');
      const bBefore = container.querySelector("#item-2")!;
      const cBefore = container.querySelector("#item-3")!;

      hydrate(client.App as TemplateBuildFn, container);
      expect(container.querySelectorAll("[key]")).toHaveLength(0);
      expect(container.querySelector("#item-2")).toBe(bBefore);

      const items = client.items as (v?: unknown) => unknown[];
      items([{ uid: 0, text: "z" }, ...items()]);
      flush();
      expect(container.querySelector("#item-0")!.textContent).toBe("z");
      expect(container.querySelector("#item-3")).toBe(cBefore);
    });

    test("adopts index-keyed items by position", async () => {
      const { container, client } = await twoTargetContainer(`
        import { ForEach } from "@hellajs/dom";
        import { signal } from "@hellajs/core";
        const items = signal([{ v: "a" }, { v: "b" }]);
        const App = () => (
          <ul id="list">
            <ForEach each={items} use={(item) => <li>{item.v}</li>}></ForEach>
          </ul>
        );
        const __out = { App, items };
      `);
      const lisBefore = Array.from(container.querySelectorAll("li"));

      hydrate(client.App as TemplateBuildFn, container);
      const lisAfter = Array.from(container.querySelectorAll("li"));
      expect(lisAfter.length).toBe(2);
      expect(lisAfter[0]).toBe(lisBefore[0]);
      expect(lisAfter[1]).toBe(lisBefore[1]);
    });

    test("adopts nested ForEach regions", async () => {
      const { container, client } = await twoTargetContainer(`
        import { ForEach } from "@hellajs/dom";
        import { signal } from "@hellajs/core";
        const groups = signal([
          { id: "g1", items: [{ id: "a" }, { id: "b" }] },
          { id: "g2", items: [{ id: "c" }] },
        ]);
        const App = () => (
          <div id="root">
            <ForEach
              each={groups}
              use={(g) => (
                <ul id={g.id}>
                  <ForEach
                    each={g.items}
                    use={(i) => <li id={g.id + "-" + i.id}>{i.id}</li>}
                  ></ForEach>
                </ul>
              )}
            ></ForEach>
          </div>
        );
        const __out = { App, groups };
      `);
      const aBefore = container.querySelector("#g1-a")!;
      const cBefore = container.querySelector("#g2-c")!;

      hydrate(client.App as TemplateBuildFn, container);
      expect(container.querySelector("#g1-a")).toBe(aBefore);
      expect(container.querySelector("#g2-c")).toBe(cBefore);
    });

    test("falls back to re-mount on a ForEach count-mismatch", async () => {
      const { container, client } = await twoTargetContainer(`
        import { ForEach } from "@hellajs/dom";
        import { signal } from "@hellajs/core";
        const items = signal([{ id: 1 }, { id: 2 }, { id: 3 }]);
        const App = () => (
          <ul id="list">
            <ForEach
              each={items}
              use={(i) => <li id={"item-" + i.id}>{i.id}</li>}
            ></ForEach>
          </ul>
        );
        const __out = { App, items };
      `);
      container.querySelector("#item-2")!.remove();

      suppressWarn(() => {
        hydrate(client.App as TemplateBuildFn, container);
      });
      expect(container.querySelectorAll("li").length).toBe(3);
    });

    test("preserves siblings outside a ForEach region on count-mismatch", async () => {
      const { container, client } = await twoTargetContainer(`
        import { ForEach } from "@hellajs/dom";
        import { signal } from "@hellajs/core";
        const items = signal([{ id: 1 }, { id: 2 }, { id: 3 }]);
        const App = () => (
          <div id="root">
            <span id="lead">L</span>
            <ul id="list">
              <ForEach
                each={items}
                use={(i) => <li id={"item-" + i.id}>{i.id}</li>}
              ></ForEach>
            </ul>
            <span id="trail">T</span>
          </div>
        );
        const __out = { App, items };
      `);
      container.querySelector("#item-2")!.remove();

      suppressWarn(() => {
        hydrate(client.App as TemplateBuildFn, container);
      });
      expect(container.querySelectorAll("li").length).toBe(3);
      expect(container.querySelector("#trail")!.textContent).toBe("T");
      expect(container.querySelector("#lead")!.textContent).toBe("L");
    });

    test("adopts a Transition child when show is true and reconciles toggles", async () => {
      const { container, client } = await twoTargetContainer(`
        import { Transition } from "@hellajs/dom";
        import { signal } from "@hellajs/core";
        const show = signal(true);
        const App = () => (
          <div id="root">
            <Transition show={show}>{<span id="t">visible</span>}</Transition>
          </div>
        );
        const __out = { App, show };
      `);
      const tBefore = container.querySelector("#t")!;

      hydrate(client.App as TemplateBuildFn, container);
      expect(container.querySelector("#t")).toBe(tBefore);

      (client.show as (v: boolean) => void)(false);
      flush();
      expect(container.querySelector("#t")).toBeNull();

      (client.show as (v: boolean) => void)(true);
      flush();
      expect(container.querySelector("#t")!.textContent).toBe("visible");
    });

    test("applies the appear class on hydrate when show is true", async () => {
      const { container, client } = await twoTargetContainer(`
        import { Transition } from "@hellajs/dom";
        import { signal } from "@hellajs/core";
        const show = signal(true);
        const App = () => (
          <div id="root">
            <Transition show={show} appear="fade-in">
              {<span id="t">visible</span>}
            </Transition>
          </div>
        );
        const __out = { App, show };
      `);

      hydrate(client.App as TemplateBuildFn, container);
      expect(container.querySelector("#t")!.classList.contains("fade-in")).toBe(true);
    });

    test("hydrates a Transition with show false and enters on toggle", async () => {
      const { container, client } = await twoTargetContainer(`
        import { Transition } from "@hellajs/dom";
        import { signal } from "@hellajs/core";
        const show = signal(false);
        const App = () => (
          <div id="root">
            <Transition show={show}>{<span id="t">visible</span>}</Transition>
          </div>
        );
        const __out = { App, show };
      `);
      expect(container.querySelector("#t")).toBeNull();

      hydrate(client.App as TemplateBuildFn, container);
      expect(container.querySelector("#t")).toBeNull();

      (client.show as (v: boolean) => void)(true);
      flush();
      expect(container.querySelector("#t")!.textContent).toBe("visible");
    });

    test("re-mounts a Portal into its target on hydrate", async () => {
      const target = document.createElement("div");
      target.id = "portal-target";
      document.body.appendChild(target);
      const { container, client } = await twoTargetContainer(`
        import { Portal } from "@hellajs/dom";
        const App = () => (
          <div id="root">
            before<Portal to="#portal-target">{<span id="ported">ported</span>}</Portal>after
          </div>
        );
        const __out = { App };
      `);
      expect(target.querySelector("#ported")).toBeNull();

      hydrate(client.App as TemplateBuildFn, container);
      flush();
      expect(target.querySelector("#ported")!.textContent).toBe("ported");
    });

    test("re-runs a Lazy loader and replaces the server loading node on resolve", async () => {
      const { container, client } = await twoTargetContainer(`
        import { Lazy } from "@hellajs/dom";
        const loaderHits = { n: 0 };
        let settleLoader = () => {};
        const loader = () =>
          new Promise((resolve) => {
            loaderHits.n++;
            settleLoader = resolve;
          });
        const Loaded = () => <span id="loaded">loaded</span>;
        const App = () => (
          <div id="root">
            <Lazy loader={loader} loading={<span id="loading">loading</span>}></Lazy>
          </div>
        );
        const __out = { App, loaderHits, Loaded, settleLoader: (v) => settleLoader(v) };
      `);
      expect(container.querySelector("#loading")).not.toBeNull();

      hydrate(client.App as TemplateBuildFn, container);
      await delay(); // sync-rendered loading UI stays visible while the loader runs (not cleared at hydrate)
      expect(container.querySelector("#loading")).not.toBeNull();
      (client.settleLoader as (v: unknown) => void)(client.Loaded);
      await delay(0);
      expect((client.loaderHits as { n: number }).n).toBe(1);
      expect(container.querySelector("#loaded")!.textContent).toBe("loaded");
      expect(container.querySelector("#loading")).toBeNull();
    });

    test("keeps server-rendered Lazy content until the loader re-run replaces it", async () => {
      const { container, client } = await twoTargetAsyncContainer(`
        import { Lazy } from "@hellajs/dom";
        let settleClient;
        const loader = () =>
          __HELLA_ARM === "server"
            ? Promise.resolve(<b id="c">server</b>)
            : new Promise((resolve) => {
                settleClient = resolve;
              });
        const Fresh = () => <span id="fresh">fresh</span>;
        const App = () => (
          <div id="root">
            <Lazy loader={loader} loading={<i>loading</i>}></Lazy>
          </div>
        );
        const __out = { App, Fresh, resolveClient: (v) => settleClient(v) };
      `);
      const serverNode = container.querySelector("#c")!;
      expect(container.textContent).toBe("server"); // async render awaited the loader — loaded content shipped

      hydrate(client.App as TemplateBuildFn, container);
      await delay(); // client loader pending — server content adopted, loading never inserted
      expect(container.querySelector("#c")).toBe(serverNode);
      expect(container.textContent).toBe("server");
      expect(container.textContent).not.toContain("loading");

      (client.resolveClient as (v: unknown) => void)(client.Fresh);
      await delay(0);
      expect(container.textContent).toBe("fresh"); // fresh render replaced the server content
      expect(container.querySelector("#c")).toBeNull();
    });

    test("replaces server-rendered Lazy content with the fallback when the loader rejects", async () => {
      const { container, client } = await twoTargetAsyncContainer(`
        import { Lazy } from "@hellajs/dom";
        let rejectClient;
        const loader = () =>
          __HELLA_ARM === "server"
            ? Promise.resolve(<b id="c">server</b>)
            : new Promise((_resolve, reject) => {
                rejectClient = reject;
              });
        const App = () => (
          <div id="root">
            <Lazy loader={loader} fallback={<p id="fb">fb</p>}></Lazy>
          </div>
        );
        const __out = { App, reject: (e) => rejectClient(e) };
      `);
      expect(container.textContent).toBe("server");

      hydrate(client.App as TemplateBuildFn, container);
      await delay();
      (client.reject as (e: Error) => void)(new Error("boom"));
      await delay(0);
      expect(container.textContent).toBe("fb");
      expect(container.querySelector("#c")).toBeNull();
    });

    test("keeps server-rendered Lazy content and logs when the loader rejects without a fallback", async () => {
      const { container, client } = await twoTargetAsyncContainer(`
        import { Lazy } from "@hellajs/dom";
        let rejectClient;
        const loader = () =>
          __HELLA_ARM === "server"
            ? Promise.resolve(<b id="c">server</b>)
            : new Promise((_resolve, reject) => {
                rejectClient = reject;
              });
        const App = () => (
          <div id="root">
            <Lazy loader={loader}></Lazy>
          </div>
        );
        const __out = { App, reject: (e) => rejectClient(e) };
      `);
      const serverNode = container.querySelector("#c")!;

      const suppressed = suppressConsole();
      try {
        hydrate(client.App as TemplateBuildFn, container);
        await delay();
        (client.reject as (e: Error) => void)(new Error("boom"));
        await delay(0);
      } finally {
        suppressed.restore();
      }
      expect(container.querySelector("#c")).toBe(serverNode); // no fallback — server content stays (static degradation)
      expect(container.textContent).toBe("server");
      expect(suppressed.errors).toHaveLength(1);
      expect(suppressed.errors[0]![0]).toBe("[dom] Lazy:");
    });
  });
});
