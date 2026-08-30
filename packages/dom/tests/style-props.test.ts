import { describe, test, expect, beforeEach } from "bun:test";
import { flush, signal } from "@hellajs/core";
import { resetTestState } from "@utils/test-helpers.js";
import { mount, html } from "@hellajs/dom/bundle";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("style object props", () => {
    test("serializes a static style object to kebab-case declarations", () => {
      mount(html`<div id="el" style=${{ color: "red", fontSize: "12px" }}></div>`);

      expect(document.getElementById("el")!.getAttribute("style")).toBe("color:red; font-size:12px");
    });

    test("re-serializes a reactive style object when the signal changes", () => {
      const theme = signal("light");
      mount(html`<div id="el" style=${() => ({ color: theme() === "dark" ? "#fff" : "#000" })}></div>`);

      expect(document.getElementById("el")!.getAttribute("style")).toBe("color:#000");

      theme("dark");
      flush();
      expect(document.getElementById("el")!.getAttribute("style")).toBe("color:#fff");
    });

    test("skips falsy declarations inside a style object", () => {
      mount(html`<div id="el" style=${{ color: "red", background: null }}></div>`);

      expect(document.getElementById("el")!.getAttribute("style")).toBe("color:red");
    });

    test("renders string style values unchanged", () => {
      mount(html`<div id="el" style=${"color:red;font-size:12px"}></div>`);

      expect(document.getElementById("el")!.getAttribute("style")).toBe("color:red;font-size:12px");
    });
  });
});
