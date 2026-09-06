import { describe, test, expect, beforeEach, mock } from "bun:test";
import { flush, signal } from "@hellajs/core";
import { resetTestState } from "@utils/test-helpers.js";
import { mount, hydrate, html } from "@hellajs/dom/bundle";
import { ssrContainer } from "./helpers";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("fragment roots", () => {
    test("unmount removes every root of a multi-root mount", () => {
      const app = mount(html`<span>a</span><span>b</span>`);
      expect(app.container.childNodes.length).toBe(2);

      app.unmount();

      expect(app.container.childNodes.length).toBe(0);
    });

    test("unmount of a multi-root mount disposes effects inside the roots", () => {
      const count = signal(0);
      const tracker = mock(() => count());
      const app = mount(html`<span id="fx">${tracker}</span><span>b</span>`);
      expect(tracker).toHaveBeenCalledTimes(1);

      app.unmount();
      count(99);
      flush();

      expect(tracker).toHaveBeenCalledTimes(1);
      expect(app.container.childNodes.length).toBe(0);
    });

    test("unmount removes every adopted child of a hydrated fragment root", () => {
      const view = html`<span id="a">a</span><span id="b">b</span>`;
      const container = ssrContainer(view);

      const app = hydrate(view, container);
      expect(container.childNodes.length).toBe(2);

      app.unmount();

      expect(container.childNodes.length).toBe(0);
    });

    test("unmount of a hydrated fragment root disposes prop effects", () => {
      const cls = signal("initial");
      const view = html`<span id="a" class=${cls}>a</span><span id="b">b</span>`;
      const container = ssrContainer(view);
      const span = container.querySelector("#a")!;

      const app = hydrate(view, container);
      app.unmount();
      cls("updated");
      flush();

      expect(span.className).toBe("initial");
      expect(container.childNodes.length).toBe(0);
    });

    test("afterMount fires for every root of a multi-root mount", () => {
      const first = mock(() => {});
      const second = mock(() => {});
      mount(html`<span id="h1" hook:afterMount=${first}>a</span><span id="h2" hook:afterMount=${second}>b</span>`);

      expect(first).toHaveBeenCalledTimes(1);
      expect(second).toHaveBeenCalledTimes(1);
    });
  });
});
