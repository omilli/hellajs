import { describe, test, expect } from "bun:test";
import { cx } from "@hellajs/css/bundle";

describe("cx", () => {
  test("joins strings and stringifies numbers", () => {
    expect(cx("a", 1, "b")).toBe("a 1 b");
  });

  test("drops falsy arguments", () => {
    expect(cx("a", false, null, undefined, 0, "", "b")).toBe("a b");
  });

  test("keeps keys with truthy values from objects", () => {
    expect(cx({ a: true, b: false, c: 1, d: 0, e: "x", f: "" })).toBe("a c e");
    expect(cx({})).toBe("");
  });

  test("flattens nested arrays", () => {
    expect(cx(["a", ["b", ["c"]]], "d")).toBe("a b c d");
    expect(cx(["a", 0, ["", "b"]], [{ c: true }])).toBe("a b c");
  });

  test("returns an empty string with no arguments", () => {
    expect(cx()).toBe("");
    expect(cx([], {})).toBe("");
  });
});
