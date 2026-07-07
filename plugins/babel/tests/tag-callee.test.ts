import { describe, test, expect } from "bun:test";
import babel from "@babel/core";
import { getTagCallee } from "../src/utils/babel.mjs";
import types from "@babel/types";

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

type BabelNodeWithName = { name: string };

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
});
