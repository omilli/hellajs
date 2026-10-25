import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { flush, signal } from "@hellajs/core";
import { resetTestState, delay, setupContainer } from "@utils/test-helpers.js";
import { mount, hydrate, ForEach, Transition, Lazy, Suspense, registry } from "@hellajs/dom";
import type { HellaNode, TemplateBuildFn } from "@hellajs/dom";
import { twoTargetContainer } from "./helpers";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("reactive dynamic children", () => {
    test("proxy forwards non-appendChild property access for custom dynamic components", () => {
      const toggle = signal<(() => void) | null>(null);
      const accessedNodeType = vi.fn(() => {});

      const CustomDynamic = ((parent: Element) => {
        const nodeType = (parent as unknown as { nodeType: number }).nodeType;
        if (nodeType !== undefined) accessedNodeType();
        parent.appendChild(document.createTextNode("dynamic"));
      }) as (() => void) & { isDynamic: boolean };
      CustomDynamic.isDynamic = true;

      mount(<div id="host">{toggle}</div>);

      expect(document.getElementById("host")?.textContent).toBe("");

      toggle(CustomDynamic);
      flush();

      expect(document.getElementById("host")?.textContent).toContain("dynamic");
      expect(accessedNodeType).toHaveBeenCalledTimes(1);
    });

    test("dynamic component appends multiple nodes in order before the anchor", () => {
      const toggle = signal<(() => void) | null>(null);

      const MultiNode = ((parent: Element) => {
        parent.appendChild(document.createElement("span")).textContent = "a";
        parent.appendChild(document.createElement("span")).textContent = "b";
        parent.appendChild(document.createElement("span")).textContent = "c";
      }) as (() => void) & { isDynamic: boolean };
      MultiNode.isDynamic = true;

      mount(<div id="host">{toggle}</div>);

      toggle(MultiNode);
      flush();

      const spans = document.querySelectorAll("#host span");
      expect(spans).toHaveLength(3);
      expect(spans[0]?.textContent).toBe("a");
      expect(spans[1]?.textContent).toBe("b");
      expect(spans[2]?.textContent).toBe("c");
    });

    test("ForEach switch-away removes rendered items and disposes the list", () => {
      const items = signal(["a", "b"]);
      const toggle = signal(true);
      const container = setupContainer();

      mount(
        <div id="host">
          {() =>
            toggle() ? (
              ForEach({ each: items, use: (item: string) => <li>{item}</li> })
            ) : (
              <p>none</p>
            )
          }
        </div>,
        container,
      );

      const host = document.getElementById("host")!;
      expect(host.querySelectorAll("li")).toHaveLength(2);

      items(["a", "b", "c"]);
      flush();
      expect(host.querySelectorAll("li")).toHaveLength(3);

      toggle(false);
      flush();

      expect(host.textContent).toBe("none");
      expect(host.querySelectorAll("li").length).toBe(0);
    });

    test("Transition switch-away removes the transitioned node", () => {
      const show = signal(true);
      const toggle = signal(true);
      const container = setupContainer();

      mount(
        <div id="host">
          {() => (toggle() ? Transition({ show, children: <b>T-content</b> }) : <p>none</p>)}
        </div>,
        container,
      );

      const host = document.getElementById("host")!;
      expect(host.textContent).toContain("T-content");

      toggle(false);
      flush();

      expect(host.textContent).toBe("none");
    });

    test("Suspense sync-child switch-away removes the suspended content", () => {
      const toggle = signal(true);
      const container = setupContainer();

      mount(
        <div id="host">
          {() => (toggle() ? Suspense({ children: <b>S-content</b> }) : <p>none</p>)}
        </div>,
        container,
      );

      const host = document.getElementById("host")!;
      expect(host.textContent).toContain("S-content");

      toggle(false);
      flush();

      expect(host.textContent).toBe("none");
    });

    test("Suspense async-child switch-away before settle discards the late resolution", async () => {
      let resolveChild!: (val: HellaNode) => void;
      const pending = new Promise<HellaNode>((resolve) => {
        resolveChild = resolve;
      });
      const toggle = signal(true);
      const container = setupContainer();

      mount(
        <div id="host">
          {() =>
            toggle() ? <Suspense fallback={<i>fb</i>}>{() => pending}</Suspense> : <p>none</p>
          }
        </div>,
        container,
      );

      const host = document.getElementById("host")!;
      expect(host.textContent).toContain("fb");

      toggle(false);
      flush();
      await delay(0);

      resolveChild(<b>late</b>);
      await delay(0);

      expect(host.textContent).toBe("none");
    });

    test("Lazy loading-at-switch-away removes the loading node", () => {
      const toggle = signal(true);
      const container = setupContainer();

      mount(
        <div id="host">
          {() =>
            toggle() ? (
              Lazy({ loader: () => new Promise<never>(() => {}), loading: <em>L-loading</em> })
            ) : (
              <p>none</p>
            )
          }
        </div>,
        container,
      );

      const host = document.getElementById("host")!;
      expect(host.textContent).toContain("L-loading");

      toggle(false);
      flush();

      expect(host.textContent).toBe("none");
    });

    test("Lazy resolved-before-switch-away removes the mounted content", async () => {
      const toggle = signal(true);
      const container = setupContainer();

      mount(
        <div id="host">
          {() =>
            toggle() ? (
              Lazy({ loader: () => Promise.resolve(<b>L-content</b>), loading: <em>L-loading</em> })
            ) : (
              <p>none</p>
            )
          }
        </div>,
        container,
      );

      const host = document.getElementById("host")!;
      expect(host.textContent).toContain("L-loading");

      await delay(0);
      expect(host.textContent).toContain("L-content");

      toggle(false);
      flush();

      expect(host.textContent).toBe("none");
    });

    test("ForEach switch-away releases item objects held only by the list collections", async () => {
      // memory 064: the object is created and dropped inside the IIFE; GC + deref happen outside
      // the activation that used it. The list is cleared while still mounted — the effect's read
      // commits the signal's lazily-deferred value slot, so the canary observes the component's
      // collections, not the superseded array the signal itself would otherwise pin
      const canary = (() => {
        const item = { id: 1, label: "a" };
        const items = signal([item]);
        const toggle = signal(true);
        const container = setupContainer();

        mount(
          <div id="host">
            {() =>
              toggle() ? (
                ForEach({
                  each: items,
                  use: (entry: { id: number; label: string }) => <li>{entry.label}</li>,
                })
              ) : (
                <p>none</p>
              )
            }
          </div>,
          container,
        );

        expect(document.getElementById("host")!.querySelectorAll("li")).toHaveLength(1);

        items([]);
        flush();
        toggle(false);
        flush();

        return new WeakRef(item);
      })();

      await delay(0);
      gc?.();
      gc?.();
      gc?.();

      expect(canary.deref()).toBeUndefined();
    });

    test("hydrate reactive region renders and clears a dynamic ForEach across toggles", async () => {
      const { container, client } = await twoTargetContainer(`
        import { ForEach } from "@hellajs/dom";
        import { signal } from "@hellajs/core";
        const items = signal(["a", "b"]);
        const toggle = signal(false);
        const getter = () => (toggle() ? ForEach({ each: items, use: (item) => <li>{item}</li> }) : <p>none</p>);
        const App = () => <div id="host">{getter}</div>;
        const __out = { App, toggle };
      `);

      hydrate(client.App as TemplateBuildFn, container);

      const host = document.getElementById("host")!;
      expect(host.textContent).toBe("none");

      (client.toggle as (v: boolean) => void)(true);
      flush();
      expect(host.querySelectorAll("li")).toHaveLength(2);

      (client.toggle as (v: boolean) => void)(false);
      flush();

      expect(host.textContent).toBe("none");
      expect(host.querySelectorAll("li").length).toBe(0);
    });

    test("hydrate region re-run drains effects registered on the region anchor", async () => {
      const { container, client } = await twoTargetContainer(`
        import { signal } from "@hellajs/core";
        const name = signal("a");
        const toggle = signal(false);
        const getter = () => (toggle() ? <b>{name()}</b> : <p>none</p>);
        const App = () => <div id="host">{getter}</div>;
        const __out = { App, name, toggle };
      `);

      hydrate(client.App as TemplateBuildFn, container);

      const host = document.getElementById("host")!;
      // the reactive region's persistent anchor is the empty text node the claim left in place
      const anchor = Array.from(host.childNodes).find(
        (n) => n.nodeType === Node.TEXT_NODE && n.textContent === "",
      )!;
      const effectRuns = vi.fn(() => {});
      registry.addEffect(anchor, effectRuns);
      expect(effectRuns).toHaveBeenCalledTimes(1);

      (client.toggle as (v: boolean) => void)(true);
      flush();
      (client.name as (v: string) => void)("z");
      flush();

      // the region anchor persists (no deleteState) and keeps rendering, but the effect
      // registered on it was drained at the first re-run and never runs again
      expect(host.textContent).toBe("z");
      expect(effectRuns).toHaveBeenCalledTimes(1);
    });

    test("parent update hooks do not fire for a ForEach child's internal list updates", () => {
      const beforeUpdate = vi.fn(() => {});
      const afterUpdate = vi.fn(() => {});
      const items = signal(["a"]);
      const container = setupContainer();

      mount(
        <ul id="host" hook:beforeUpdate={beforeUpdate} hook:afterUpdate={afterUpdate}>
          <ForEach each={items} use={(item: string) => <li>{item}</li>}></ForEach>
        </ul>,
        container,
      );

      const host = document.getElementById("host")!;
      expect(host.querySelectorAll("li")).toHaveLength(1);

      items(["a", "b"]);
      flush();

      expect(host.querySelectorAll("li")).toHaveLength(2);
      expect(beforeUpdate).not.toHaveBeenCalled();
      expect(afterUpdate).not.toHaveBeenCalled();
    });
  });
});
