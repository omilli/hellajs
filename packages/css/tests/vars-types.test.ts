import { describe, expect, test, beforeEach } from "bun:test";
import { resetTestState } from "@utils/test-helpers.js";
import { vars } from "@hellajs/css/bundle";

beforeEach(() => {
  resetTestState();
});

describe("vars types", () => {
  test("rejects boolean leaf values", () => {
    // @ts-expect-error - boolean leaf rejected at compile time
    vars({ flag: true });
  });

  test("rejects boolean in nested object", () => {
    // @ts-expect-error - boolean in nested object rejected at compile time
    vars({ data: { active: false } });
  });

  test("rejects Date instances", () => {
    // @ts-expect-error - Date is neither CSSVarLeaf nor CSSVarInputObject
    vars({ date: new Date() });
  });

  test("rejects function returning boolean", () => {
    // @ts-expect-error - function returning boolean rejected at compile time
    vars({ fn: () => true });
  });

  test("accepts string leaf", () => {
    vars({ valid: "string" });
  });

  test("accepts number leaf", () => {
    vars({ valid: 42 });
  });

  test("accepts function returning string", () => {
    vars({ valid: () => "value" });
  });

  test("accepts nested CSSVarInputObject", () => {
    vars({ valid: { nested: "value" } });
  });

  test("return value's leaf type is string", () => {
    const varsObj = vars({ color: "red" });
    const leaf: string = varsObj.color;
    expect(leaf).toBe("var(--color)");
  });
});
