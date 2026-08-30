import { describe, test, expect, beforeEach, mock } from "bun:test";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { html, element } from "@hellajs/dom/bundle";
import type { HellaElement } from "@hellajs/dom";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("element shadow", () => {
    test("renders content into an open shadow root with shadow: true", async () => {
      element("shadow-basic", () => html`<div class="box">in shadow</div>`, { shadow: true });

      resetTestState("<shadow-basic></shadow-basic>");
      await delay();

      const el = document.querySelector("shadow-basic")!;
      expect(el.shadowRoot).not.toBeNull();
      expect(el.shadowRoot!.querySelector(".box")?.textContent).toBe("in shadow");
      expect(el.querySelector(".box")).toBeNull();
    });

    test("attribute changes re-render reactively inside the shadow root", async () => {
      element("shadow-attr", (props: { label: () => string | null }) =>
        html`<span>${() => props.label?.() ?? "none"}</span>`, { shadow: true });

      resetTestState('<shadow-attr label="first"></shadow-attr>');
      await delay();

      const el = document.querySelector("shadow-attr")!;
      expect(el.shadowRoot!.querySelector("span")?.textContent).toBe("first");

      el.setAttribute("label", "second");
      expect(el.shadowRoot!.querySelector("span")?.textContent).toBe("second");
    });

    test("delegated on:click fires for a composed event inside the shadow root", async () => {
      const handler = mock(() => {});
      element("shadow-click", () => html`<button on:click=${handler}>go</button>`, { shadow: true });

      resetTestState("<shadow-click></shadow-click>");
      await delay();

      const btn = document.querySelector("shadow-click")!.shadowRoot!.querySelector("button")!;
      btn.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));

      expect(handler).toHaveBeenCalledTimes(1);
    });

    test("removing a node inside the shadow root triggers observer cleanup", async () => {
      const cleanup = mock(() => {});
      element("shadow-cleanup", () =>
        html`<div class="inner" hook:afterDestroy=${cleanup}>inner</div>`, { shadow: true });

      resetTestState("<shadow-cleanup></shadow-cleanup>");
      await delay();

      document.querySelector("shadow-cleanup")!.shadowRoot!.querySelector(".inner")!.remove();
      await delay(10);   // observer delivery + scheduleCleanup microtask → processCleanupQueue

      expect(cleanup).toHaveBeenCalledTimes(1);
    });

    test("renders to light DOM when no options or an empty options object is given", async () => {
      element("shadow-default", () => html`<span>light</span>`);
      element("shadow-empty", () => html`<span>light</span>`, {});

      resetTestState("<shadow-default></shadow-default><shadow-empty></shadow-empty>");
      await delay();

      const plain = document.querySelector("shadow-default")!;
      expect(plain.shadowRoot).toBeNull();
      expect(plain.querySelector("span")?.textContent).toBe("light");

      const empty = document.querySelector("shadow-empty")!;
      expect(empty.shadowRoot).toBeNull();
      expect(empty.querySelector("span")?.textContent).toBe("light");
    });

    test("renders into a closed shadow root that stays unreachable via el.shadowRoot", async () => {
      const renderFn = mock(() => html`<div class="secret">hidden</div>`);
      element("shadow-closed", renderFn, { shadow: { mode: "closed" } });

      resetTestState("<shadow-closed></shadow-closed>");
      await delay();

      const el = document.querySelector("shadow-closed")!;
      expect(el.shadowRoot).toBeNull();
      expect(renderFn).toHaveBeenCalledTimes(1);
      expect(el.querySelector("div")).toBeNull();
    });

    test("re-renders into the shadow root after disconnect and reconnect", async () => {
      const renderFn = mock(() => html`<span>in shadow</span>`);
      element("shadow-reconnect", renderFn, { shadow: true });

      resetTestState("<shadow-reconnect></shadow-reconnect>");
      await delay();
      expect(renderFn).toHaveBeenCalledTimes(1);

      const el = document.querySelector("shadow-reconnect") as HellaElement;
      el.remove();
      document.body.appendChild(el);
      await delay();

      expect(renderFn).toHaveBeenCalledTimes(2);
      expect(el.shadowRoot!.querySelector("span")?.textContent).toBe("in shadow");
    });
  });
});
