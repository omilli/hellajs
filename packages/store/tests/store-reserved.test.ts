import { describe, test, expect } from "bun:test";
import { store } from "@hellajs/store/bundle";

describe("reserved keys", () => {
  test("throws on snapshot key collision with non-function value", () => {
    expect(() => store({ snapshot: 1 })).toThrow("Reserved key \"snapshot\"");
  });

  test("throws on cleanup key collision with non-function value", () => {
    expect(() => store({ cleanup: "x" })).toThrow("Reserved key \"cleanup\"");
  });

  test("throws on nested reserved key collision", () => {
    expect(() => store({ nested: { snapshot: 1 } })).toThrow("Reserved key \"snapshot\"");
  });

  test("function values on reserved keys are rejected", () => {
    expect(() => store({ update: () => "helper" })).toThrow("Reserved key \"update\"");
    expect(() => store({ snapshot: () => "snap" })).toThrow("Reserved key \"snapshot\"");
  });
});

