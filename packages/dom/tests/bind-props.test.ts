import { describe, test, expect, beforeEach } from "bun:test";
import { flush, signal } from "@hellajs/core";
import { resetTestState } from "@utils/test-helpers.js";
import { mount, html, $ref } from "@hellajs/dom/bundle";

class MockPanel extends HTMLElement {
  data: { series: number[] } | null = null;
}

customElements.define("x-panel", MockPanel);

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("bind prop values", () => {
    test("boolean function-ref renders a bare attribute and removes it when false", () => {
      const locked = signal(true);
      mount(html`<input id="toggle" />`);
      $ref("#toggle").bind({ disabled: () => locked() });

      const input = document.getElementById("toggle") as HTMLInputElement;
      expect(input.getAttribute("disabled")).toBe("");
      expect(input.disabled).toBe(true);

      locked(false);
      flush();
      expect(input.getAttribute("disabled")).toBe(null);
      expect(input.disabled).toBe(false);
    });

    test("joins class arrays with spaces", () => {
      mount(html`<div id="el"></div>`);
      $ref("#el").bind({ class: ["a", "b"] });

      expect(document.getElementById("el")!.getAttribute("class")).toBe("a b");
    });

    test("serializes a static style object to kebab-case declarations", () => {
      mount(html`<div id="hero"></div>`);
      $ref("#hero").bind({ style: { color: "red", fontSize: "12px" } });

      expect(document.getElementById("hero")!.getAttribute("style")).toBe("color:red; font-size:12px");
    });

    test("re-serializes a reactive style object when the signal changes", () => {
      const theme = signal("light");
      mount(html`<div id="hero"></div>`);
      $ref("#hero").bind({ style: () => ({ color: theme() === "dark" ? "#fff" : "#000" }) });

      expect(document.getElementById("hero")!.getAttribute("style")).toBe("color:#000");

      theme("dark");
      flush();
      expect(document.getElementById("hero")!.getAttribute("style")).toBe("color:#fff");
    });

    test("assigns an object prop to a custom element property by reference", () => {
      const points = { series: [1, 2, 3] };
      mount(html`<x-panel id="panel"></x-panel>`);
      $ref("#panel").bind({ data: points });

      expect((document.getElementById("panel") as MockPanel).data).toBe(points);
    });
  });
});
