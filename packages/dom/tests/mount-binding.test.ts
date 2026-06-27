import { describe, test, expect, beforeEach } from "bun:test";
import { flush, signal } from "@hellajs/core";
import {resetTestState} from "../../../utils/test-helpers.js";
import { mount, html } from "@hellajs/dom/bundle";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("mount binding", () => {
    test("value set via direct property with falsy fallback", () => {
      const inputValue = signal("hello");

      mount(html`
        <div>
          <input id="val-input" bind:value=${inputValue} />
        </div>
      `);

      const valInput = document.getElementById("val-input") as HTMLInputElement;

      expect(valInput.value).toBe("hello");

      inputValue("");
      flush();

      expect(valInput.value).toBe("");

      inputValue("restored");
      flush();
      expect(valInput.value).toBe("restored");
    });
  });
});
