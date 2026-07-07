import { describe, test, expect } from "bun:test";
import { findPassthroughComponents, containsComponent } from "../src/utils/traversal.mjs";

describe("babel", () => {
  describe("findPassthroughComponents", () => {
    test("finds ForEach", () => {
      const ast = {
        tag: "ForEach",
        props: {},
        children: []
      };
      const found = findPassthroughComponents(ast);
      expect(found.has("ForEach")).toBe(true);
    });

    test("finds Portal", () => {
      const ast = {
        tag: "Portal",
        props: {},
        children: []
      };
      const found = findPassthroughComponents(ast);
      expect(found.has("Portal")).toBe(true);
    });

    test("finds Lazy", () => {
      const ast = {
        tag: "Lazy",
        props: {},
        children: []
      };
      const found = findPassthroughComponents(ast);
      expect(found.has("Lazy")).toBe(true);
    });

    test("finds multiple passthrough components", () => {
      const ast = {
        tag: "div",
        props: {},
        children: [
          { tag: "ForEach", props: {}, children: [] },
          { tag: "Portal", props: {}, children: [] }
        ]
      };
      const found = findPassthroughComponents(ast);
      expect(found.has("ForEach")).toBe(true);
      expect(found.has("Portal")).toBe(true);
    });

    test("finds nested passthrough components", () => {
      const ast = {
        tag: "div",
        props: {},
        children: [
          {
            tag: "section",
            props: {},
            children: [
              { tag: "Lazy", props: {}, children: [] }
            ]
          }
        ]
      };
      const found = findPassthroughComponents(ast);
      expect(found.has("Lazy")).toBe(true);
    });

    test("non-passthrough components are not found", () => {
      const ast = {
        tag: "Button",
        props: {},
        children: []
      };
      const found = findPassthroughComponents(ast);
      expect(found.size).toBe(0);
    });

    test("lowercase elements are not found", () => {
      const ast = {
        tag: "div",
        props: {},
        children: []
      };
      const found = findPassthroughComponents(ast);
      expect(found.size).toBe(0);
    });

    test("null/undefined handling", () => {
      expect(findPassthroughComponents(null).size).toBe(0);
      expect(findPassthroughComponents(undefined).size).toBe(0);
    });

    test("primitive values", () => {
      expect(findPassthroughComponents("string").size).toBe(0);
      expect(findPassthroughComponents(123).size).toBe(0);
    });
  });

  describe("containsComponent", () => {
    test("detects uppercase component", () => {
      const ast = {
        tag: "Button",
        props: {},
        children: []
      };
      expect(containsComponent(ast)).toBe(true);
    });

    test("detects slot tag (dynamic component)", () => {
      const ast = {
        tag: "__SLOT_0__",
        props: {},
        children: []
      };
      expect(containsComponent(ast)).toBe(true);
    });

    test("does not detect lowercase element", () => {
      const ast = {
        tag: "div",
        props: {},
        children: []
      };
      expect(containsComponent(ast)).toBe(false);
    });

    test("finds component in children", () => {
      const ast = {
        tag: "div",
        props: {},
        children: [
          { tag: "Button", props: {}, children: [] }
        ]
      };
      expect(containsComponent(ast)).toBe(true);
    });

    test("finds component in nested children", () => {
      const ast = {
        tag: "div",
        props: {},
        children: [
          {
            tag: "section",
            props: {},
            children: [
              { tag: "Input", props: {}, children: [] }
            ]
          }
        ]
      };
      expect(containsComponent(ast)).toBe(true);
    });

    test("excludes passthrough names", () => {
      const ast = {
        tag: "ForEach",
        props: {},
        children: []
      };
      expect(containsComponent(ast, new Set(["ForEach"]))).toBe(false);
    });

    test("finds component when excluding passthrough", () => {
      const ast = {
        tag: "div",
        props: {},
        children: [
          { tag: "ForEach", props: {}, children: [] },
          { tag: "Button", props: {}, children: [] }
        ]
      };
      expect(containsComponent(ast, new Set(["ForEach"]))).toBe(true);
    });

    test("checks children of excluded passthrough", () => {
      const ast = {
        tag: "ForEach",
        props: {},
        children: [
          { tag: "Button", props: {}, children: [] }
        ]
      };
      expect(containsComponent(ast, new Set(["ForEach"]))).toBe(true);
    });

    test("null/undefined handling", () => {
      expect(containsComponent(null)).toBe(false);
      expect(containsComponent(undefined)).toBe(false);
    });

    test("primitive values", () => {
      expect(containsComponent("string")).toBe(false);
      expect(containsComponent(123)).toBe(false);
    });

    test("empty children array", () => {
      const ast = {
        tag: "div",
        props: {},
        children: []
      };
      expect(containsComponent(ast)).toBe(false);
    });

    test("fragment tag is not a component", () => {
      const ast = {
        tag: "$",
        props: {},
        children: []
      };
      expect(containsComponent(ast)).toBe(false);
    });

    test("multiple uppercase letters", () => {
      const ast = {
        tag: "UIComponent",
        props: {},
        children: []
      };
      expect(containsComponent(ast)).toBe(true);
    });
  });
});
