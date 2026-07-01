import { describe, test, expect } from "bun:test";
import { store } from "@hellajs/store/bundle";

describe("store", () => {
  describe("data", () => {
    test("creates store with all data types", () => {
      const data = store({
        num: 42,
        str: "hello",
        bool: true,
        arr: [1, 2, 3],
        obj: { nested: "value" },
        nullVal: null,
        undefinedVal: undefined,
        func: () => "helper"
      });

      expect(data.num()).toBe(42);
      expect(data.str()).toBe("hello");
      expect(data.bool()).toBe(true);
      expect(data.arr()).toEqual([1, 2, 3]);
      expect(data.obj.nested()).toBe("value");
      expect(data.nullVal()).toBe(null);
      expect(data.undefinedVal()).toBeUndefined();
      expect(data.func()).toBe("helper");
    });

    test("sets values on primitives and nested objects", () => {
      const data = store({
        num: 42,
        str: "hello",
        obj: { nested: "value" }
      });

      data.num(100);
      data.str("world");
      data.obj.nested("updated");

      expect(data.num()).toBe(100);
      expect(data.str()).toBe("world");
      expect(data.obj.nested()).toBe("updated");
    });
  });
});
