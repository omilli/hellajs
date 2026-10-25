import { describe, test, expect, beforeEach } from "vite-plus/test";
import { resetTestState } from "@utils/test-helpers.js";
import { mount } from "@hellajs/dom";

class MockIcon extends HTMLElement {}

customElements.define("my-icon", MockIcon);

beforeEach(() => {
  resetTestState();
});

// No feature import here by design: this file compiles `<my-icon>` through the babel
// plugin, so the custom-elements side-effect import rides the emission automatically —
// the clone upgrading at all is the proof (the runtime default never upgrades).
describe("dom", () => {
  describe("custom-element clone upgrade via compiled emission", () => {
    test("compiles a hyphenated tag whose template clone upgrades to the defined element", () => {
      mount(<my-icon id="icon"></my-icon>);

      expect(document.getElementById("icon")).toBeInstanceOf(MockIcon);
    });
  });
});
