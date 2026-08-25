import { describe, expect, test, beforeEach } from "bun:test";
import { resetTestState } from "@utils/test-helpers.js";
import { cssVars } from "@hellajs/css/bundle";

beforeEach(() => {
  resetTestState();
});

describe("cssVars types", () => {
  test("rejects boolean leaf values", () => {
    // @ts-expect-error - boolean leaf rejected at compile time
    cssVars({ flag: true });
  });

  test("rejects boolean in nested object", () => {
    // @ts-expect-error - boolean in nested object rejected at compile time
    cssVars({ data: { active: false } });
  });

  test("rejects Date instances", () => {
    // @ts-expect-error - Date is neither CSSVarLeaf nor CSSVarInputObject
    cssVars({ date: new Date() });
  });

  test("rejects function returning boolean", () => {
    // @ts-expect-error - function returning boolean rejected at compile time
    cssVars({ fn: () => true });
  });

  test("accepts string leaf", () => {
    cssVars({ valid: "string" });
  });

  test("accepts number leaf", () => {
    cssVars({ valid: 42 });
  });

  test("accepts function returning string", () => {
    cssVars({ valid: () => "value" });
  });

  test("accepts nested CSSVarInputObject", () => {
    cssVars({ valid: { nested: "value" } });
  });

  test("return value's leaf type is string", () => {
    const vars = cssVars({ color: "red" });
    const leaf: string = vars.color;
    expect(leaf).toBe("var(--color)");
  });
});
