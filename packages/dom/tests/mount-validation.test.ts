import { describe, test, expect, beforeEach } from "bun:test";
import {resetTestState} from "@utils/test-helpers.js";
import { mount, html } from "@hellajs/dom/bundle";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("mount validation", () => {
    test("throws for selector that does not match any element", () => {
      expect(() => mount(html`<div>test</div>`, "#nonexistent")).toThrow('[dom] mount: target "#nonexistent" not found in document');
    });
  });
});
