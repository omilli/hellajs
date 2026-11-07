import { describe, test, expect, beforeEach } from "vite-plus/test";
import { flush, signal } from "@hellajs/core";
import { resetTestState } from "@utils/test-helpers.js";
import { mount, hydrate } from "@hellajs/dom";
import type { TemplateBuildFn } from "@hellajs/dom";
import { twoTargetContainer } from "./helpers";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("reactive region span clear", () => {
    test("outer region swap after an inner region re-run replaces the whole span", () => {
      const inner = signal(false);
      const view = signal(
        <div id="list-page">
          <div id="search">search</div>
          {() => (inner() ? <div id="a" /> : <div id="b">b</div>)}
        </div>,
      );
      const host = document.createElement("div");
      document.body.appendChild(host);
      mount(<div id="app">{view}</div>, host);

      // inner region swapped content after the outer's first run, then outer swaps
      inner(true);
      flush();
      expect(host.querySelector("#a")).toBeTruthy();

      view(
        <div id="detail-page">
          <div id="detail">detail</div>
        </div>,
      );
      flush();

      expect(host.querySelector("#detail")).toBeTruthy();
      expect(host.querySelector("#search")).toBe(null);
      expect(host.querySelector("#a")).toBe(null);
      expect(host.querySelector("#b")).toBe(null);
    });

    test("nodes an inner region inserted after the outer's first run are removed by the outer's swap", () => {
      const items = signal<string[]>([]);
      const view = signal(
        <div id="list-page">
          <div id="search">search</div>
          {() => {
            const list = items();
            return list.length > 0 ? (
              <div id="cards">{list.join(",")}</div>
            ) : (
              <div id="empty">empty</div>
            );
          }}
        </div>,
      );
      const host = document.createElement("div");
      document.body.appendChild(host);
      mount(<div id="app">{view}</div>, host);

      items(["one", "two", "three"]);
      flush();
      expect(host.querySelector("#cards")).toBeTruthy();

      view(<div id="detail-page">detail</div>);
      flush();

      expect(host.querySelector("#cards")).toBe(null);
      expect(host.querySelector("#empty")).toBe(null);
      expect(host.querySelector("#search")).toBe(null);
      expect(host.querySelector("#detail-page")).toBeTruthy();
    });

    test("a two-level nested region whose inner region re-ran clears completely on the outermost swap", () => {
      const inner = signal(false);
      const view = signal(
        <div id="outer">
          <div id="mid">
            {() => (inner() ? <div id="inner-on">on</div> : <div id="inner-off">off</div>)}
          </div>
        </div>,
      );
      const host = document.createElement("div");
      document.body.appendChild(host);
      mount(<div id="app">{view}</div>, host);

      inner(true);
      flush();
      expect(host.querySelector("#inner-on")).toBeTruthy();

      view(<div id="next">next</div>);
      flush();

      expect(host.querySelector("#inner-on")).toBe(null);
      expect(host.querySelector("#mid")).toBe(null);
      expect(host.querySelector("#next")).toBeTruthy();
    });

    test("span clear skips nodes moved out of the region parent", () => {
      const elsewhere = document.createElement("div");
      document.body.appendChild(elsewhere);
      const swap = signal(false);
      const host = document.createElement("div");
      document.body.appendChild(host);

      mount(
        <div id="app">
          {() => (swap() ? <div id="plain">plain</div> : <div id="moved">moved</div>)}
        </div>,
        host,
      );

      // A portal-moved node's shape: the region's current node is re-parented out,
      // no longer a child of the region parent - the span walk must skip it (the
      // array walk would throw NotFoundError here and abort the swap)
      elsewhere.appendChild(host.querySelector("#moved")!);

      swap(true);
      flush();

      expect(host.querySelector("#plain")).toBeTruthy();
      expect(elsewhere.querySelector("#moved")).toBeTruthy();
    });

    test("text region keeps its text-node identity across updates", () => {
      const title = signal("a");
      const host = document.createElement("div");
      document.body.appendChild(host);
      mount(
        <div id="app">
          <h1>{title}</h1>
        </div>,
        host,
      );

      const h1 = host.querySelector("h1")!;
      const textOf = (value: string) =>
        Array.from(h1.childNodes).find(
          (n) => n.nodeType === Node.TEXT_NODE && n.textContent === value,
        )!;
      const before = textOf("a");

      title("b");
      flush();

      expect(textOf("b")).toBe(before);
    });

    test("adopted region whose nested region re-ran swaps cleanly on the next outer run", async () => {
      const { container, client } = await twoTargetContainer(`
        import { signal } from "@hellajs/core";
        const outer = signal("first");
        const nested = signal(false);
        const App = () => (
          <div>
            {() =>
              outer() === "first" ? (
                <div id="adopted">
                  <span>server</span>
                  {() => (nested() ? <em id="nested-on">on</em> : <em id="nested-off">off</em>)}
                </div>
              ) : (
                <div id="second">second</div>
              )
            }
          </div>
        );
        const __out = { App, outer, nested };
      `);
      const adoptedBefore = container.querySelector("#adopted")!;

      hydrate(client.App as TemplateBuildFn, container);
      // adoption keeps the server nodes - identity preserved
      expect(container.querySelector("#adopted")).toBe(adoptedBefore);

      // nested region re-runs inside the adopted content, then the outer swaps
      (client.nested as (v: boolean) => void)(true);
      flush();
      expect(container.querySelector("#nested-on")).toBeTruthy();

      (client.outer as (v: string) => void)("second");
      flush();

      expect(container.querySelector("#second")).toBeTruthy();
      expect(container.querySelector("#adopted")).toBe(null);
      expect(container.querySelector("#nested-on")).toBe(null);
    });
  });
});
