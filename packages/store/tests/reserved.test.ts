import { describe, test, expect } from "bun:test";
import { store } from "@hellajs/store/bundle";

describe("store", () => {
  describe("reserved keys", () => {
    test("throws on snapshot key collision with non-function value", () => {
      expect(() => store({ snapshot: 1 })).toThrow("reserved key collision, received \"snapshot\"");
    });

    test("throws on cleanup key collision with non-function value", () => {
      expect(() => store({ cleanup: "x" })).toThrow("reserved key collision, received \"cleanup\"");
    });

    test("throws on nested reserved key collision", () => {
      expect(() => store({ nested: { snapshot: 1 } })).toThrow("reserved key collision, received \"snapshot\"");
    });

    test("rejects function values on reserved keys via snapshot", () => {
      expect(() => store({ snapshot: () => "snap" })).toThrow("reserved key collision, received \"snapshot\"");
    });

    test("rejects function values on reserved keys via update", () => {
      expect(() => store({ update: () => "helper" })).toThrow("reserved key collision, received \"update\"");
    });

    test("rejects function value on cleanup reserved key", () => {
      expect(() => store({ cleanup: () => "dispose" })).toThrow("reserved key collision, received \"cleanup\"");
    });

    test("update method skips keys not present in initial object", () => {
      const data = store({ a: 1 });
      // @ts-expect-error snapshot is reserved — update must skip reserved keys
      data.update({ snapshot: "hijack" });
      expect(data.snapshot()).toEqual({ a: 1 });
    });
  });
});
