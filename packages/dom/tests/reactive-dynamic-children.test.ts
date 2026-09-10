import { describe, test, expect, beforeEach, mock } from "bun:test";
import { flush, signal } from "@hellajs/core";
import { resetTestState, delay, setupContainer } from "@utils/test-helpers.js";
import { mount, html, hydrate, ForEach, Transition, Lazy, Suspense, registry } from "@hellajs/dom/bundle";
import type { HellaNode } from "@hellajs/dom";
import { ssrContainer } from "./helpers";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("reactive dynamic children", () => {
    test("proxy forwards non-appendChild property access for custom dynamic components", () => {
      const toggle = signal<(() => void) | null>(null);
      const accessedNodeType = mock(() => {});

      const CustomDynamic = ((parent: Element) => {
        const nodeType = (parent as unknown as { nodeType: number }).nodeType;
        if (nodeType !== undefined) accessedNodeType();
        parent.appendChild(document.createTextNode("dynamic"));
      }) as (() => void) & { isDynamic: boolean };
      CustomDynamic.isDynamic = true;

      mount(html`
        <div id="host">
          ${() => toggle()}
        </div>
      `);

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

      mount(html`
        <div id="host">
          ${() => toggle()}
        </div>
      `);

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

      mount(html`
        <div id="host">
          ${() => toggle() ? ForEach({ each: items, use: (item: string) => html`<li>${item}</li>` }) : html`<p>none</p>`}
        </div>
      `, container);

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

      mount(html`
        <div id="host">
          ${() => toggle() ? Transition({ show, children: html`<b>T-content</b>` }) : html`<p>none</p>`}
        </div>
      `, container);

      const host = document.getElementById("host")!;
      expect(host.textContent).toContain("T-content");

      toggle(false);
      flush();

      expect(host.textContent).toBe("none");
    });

    test("Suspense sync-child switch-away removes the suspended content", () => {
      const toggle = signal(true);
      const container = setupContainer();

      mount(html`
        <div id="host">
          ${() => toggle() ? Suspense({ children: html`<b>S-content</b>` }) : html`<p>none</p>`}
        </div>
      `, container);

      const host = document.getElementById("host")!;
      expect(host.textContent).toContain("S-content");

      toggle(false);
      flush();

      expect(host.textContent).toBe("none");
    });

    test("Suspense async-child switch-away before settle discards the late resolution", async () => {
      let resolveChild!: (val: HellaNode) => void;
      const pending = new Promise<HellaNode>((resolve) => { resolveChild = resolve; });
      const toggle = signal(true);
      const container = setupContainer();

      mount(html`
        <div id="host">
          ${() => toggle()
            ? html`<${Suspense} fallback=${html`<i>fb</i>`}>${() => pending}</${Suspense}>`
            : html`<p>none</p>`}
        </div>
      `, container);

      const host = document.getElementById("host")!;
      expect(host.textContent).toContain("fb");

      toggle(false);
      flush();
      await delay(0);

      resolveChild(html`<b>late</b>` as HellaNode);
      await delay(0);

      expect(host.textContent).toBe("none");
    });

    test("Lazy loading-at-switch-away removes the loading node", () => {
      const toggle = signal(true);
      const container = setupContainer();

      mount(html`
        <div id="host">
          ${() => toggle() ? Lazy({ loader: () => new Promise<HellaNode>(() => {}), loading: html`<em>L-loading</em>` }) : html`<p>none</p>`}
        </div>
      `, container);

      const host = document.getElementById("host")!;
      expect(host.textContent).toContain("L-loading");

      toggle(false);
      flush();

      expect(host.textContent).toBe("none");
    });

    test("Lazy resolved-before-switch-away removes the mounted content", async () => {
      const toggle = signal(true);
      const container = setupContainer();

      mount(html`
        <div id="host">
          ${() => toggle() ? Lazy({ loader: () => Promise.resolve(html`<b>L-content</b>`), loading: html`<em>L-loading</em>` }) : html`<p>none</p>`}
        </div>
      `, container);

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

        mount(html`
          <div id="host">
            ${() => toggle() ? ForEach({ each: items, use: (entry: { id: number; label: string }) => html`<li>${entry.label}</li>` }) : html`<p>none</p>`}
          </div>
        `, container);

        expect(document.getElementById("host")!.querySelectorAll("li")).toHaveLength(1);

        items([]);
        flush();
        toggle(false);
        flush();

        return new WeakRef(item);
      })();

      await delay(0);
      Bun.gc(true);
      Bun.gc(true);
      Bun.gc(true);

      expect(canary.deref()).toBeUndefined();
    });

    test("hydrate reactive region renders and clears a dynamic ForEach across toggles", () => {
      const items = signal(["a", "b"]);
      const toggle = signal(false);
      const getter = () => toggle() ? ForEach({ each: items, use: (item: string) => html`<li>${item}</li>` }) : html`<p>none</p>`;
      const container = ssrContainer(html`<div id="host">${getter}</div>`);

      hydrate(html`<div id="host">${getter}</div>`, container);

      const host = document.getElementById("host")!;
      expect(host.textContent).toBe("none");

      toggle(true);
      flush();
      expect(host.querySelectorAll("li")).toHaveLength(2);

      toggle(false);
      flush();

      expect(host.textContent).toBe("none");
      expect(host.querySelectorAll("li").length).toBe(0);
    });

    test("hydrate region re-run drains effects registered on the region anchor", () => {
      const name = signal("a");
      const toggle = signal(false);
      const getter = () => toggle() ? html`<b>${name()}</b>` : html`<p>none</p>`;
      const container = ssrContainer(html`<div id="host">${getter}</div>`);

      hydrate(html`<div id="host">${getter}</div>`, container);

      const host = document.getElementById("host")!;
      // the reactive region's persistent anchor is the empty text node the walker left in place
      const anchor = Array.from(host.childNodes).find((n) => n.nodeType === Node.TEXT_NODE && n.textContent === "")!;
      const effectRuns = mock(() => {});
      registry.addEffect(anchor, effectRuns);
      expect(effectRuns).toHaveBeenCalledTimes(1);

      toggle(true);
      flush();
      name("z");
      flush();

      // the region anchor persists (no deleteState) and keeps rendering, but the effect
      // registered on it was drained at the first re-run and never runs again
      expect(host.textContent).toBe("z");
      expect(effectRuns).toHaveBeenCalledTimes(1);
    });

    test("parent update hooks do not fire for a ForEach child's internal list updates", () => {
      const beforeUpdate = mock(() => {});
      const afterUpdate = mock(() => {});
      const items = signal(["a"]);
      const container = setupContainer();

      mount(html`
        <ul id="host" hook:beforeUpdate=${beforeUpdate} hook:afterUpdate=${afterUpdate}>
          <${ForEach} each=${items} use=${(item: string) => html`<li>${item}</li>`} />
        </ul>
      `, container);

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
