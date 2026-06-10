import { describe, test, expect } from "bun:test"
import babel from "@babel/core"
import { findPassthroughComponents, containsComponent } from "../src/utils/traversal.mjs"
import { getTagCallee } from "../src/utils/babel.mjs"
import types from "@babel/types"

type BabelParseResult = {
  program: {
    body: {
      expression: {
        openingElement: {
          name: unknown;
        };
      };
    }[];
  };
};

type BabelNodeWithName = { name: string }

describe("babel", () => {
  describe("getTagCallee", () => {
    test("JSXIdentifier returns identifier", () => {
      const ast = babel.parseSync("<div />", {
        plugins: ["@babel/plugin-syntax-jsx"]
      });
      const openingElement = (ast as BabelParseResult).program.body[0]!.expression.openingElement;
      const callee = getTagCallee(types, openingElement.name);
      expect(types.isIdentifier(callee)).toBe(true);
      expect(callee.name).toBe("div");
    });

    test("JSXMemberExpression returns member expression", () => {
      const ast = babel.parseSync("<UI.Button />", {
        plugins: ["@babel/plugin-syntax-jsx"]
      });
      const openingElement = (ast as BabelParseResult).program.body[0]!.expression.openingElement;
      const callee = getTagCallee(types, openingElement.name);
      expect(types.isMemberExpression(callee)).toBe(true);
      expect(types.isIdentifier(callee.object)).toBe(true);
      expect((callee.object as BabelNodeWithName).name).toBe("UI");
      expect(types.isIdentifier(callee.property)).toBe(true);
      expect((callee.property as BabelNodeWithName).name).toBe("Button");
    });

    test("nested member expression", () => {
      const ast = babel.parseSync("<App.Components.Button />", {
        plugins: ["@babel/plugin-syntax-jsx"]
      });
      const openingElement = (ast as BabelParseResult).program.body[0]!.expression.openingElement;
      const callee = getTagCallee(types, openingElement.name);
      expect(types.isMemberExpression(callee)).toBe(true);
    });

    test("throws on unsupported tag type", () => {
      const invalidNode = {
        type: "JSXNamespacedName",
        namespace: { name: "xml" },
        name: { name: "lang" }
      };
      expect(() => getTagCallee(types, invalidNode as unknown as Parameters<typeof getTagCallee>[1])).toThrow("Unsupported JSX tag type");
    });
  });

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
    })
  })
})
