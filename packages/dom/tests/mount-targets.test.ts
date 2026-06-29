import { describe, test, expect, beforeEach } from "bun:test";
import {resetTestState} from "@utils/test-helpers.js";
import { mount, html } from "@hellajs/dom/bundle";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("mount targets", () => {
    test("mounts to selector or element", () => {
      mount(html`<div id="default">Default</div>`);
      expect(document.getElementById("default")).not.toBeNull();

      resetTestState();
      resetTestState('<div id="custom"></div>');
      mount(html`<span>Custom</span>`, "#custom");
      expect(document.querySelector("#custom span")).not.toBeNull();

      const container = document.createElement("div");
      document.body.appendChild(container);
      mount(html`<b>Direct</b>`, container);
      expect(container.querySelector("b")?.textContent).toBe("Direct");
    });
  });
});
