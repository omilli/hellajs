import { describe, test, expect, mock } from "bun:test";
import { store } from "@hellajs/store/bundle";

describe("store", () => {
  describe("reserved keys", () => {
    test("throws on $snapshot key collision with non-function value", () => {
      expect(() => store({ $snapshot: 1 })).toThrow("[store] store: reserved key collision, received \"$snapshot\"");
    });

    test("throws on $cleanup key collision with non-function value", () => {
      expect(() => store({ $cleanup: "x" })).toThrow("reserved key collision, received \"$cleanup\"");
    });

    test("throws on nested reserved key collision", () => {
      expect(() => store({ nested: { $update: "x" } })).toThrow("reserved key collision, received \"$update\"");
    });

    test("rejects function values on reserved keys via $snapshot", () => {
      expect(() => store({ $snapshot: () => "snap" })).toThrow("reserved key collision, received \"$snapshot\"");
    });

    test("rejects function values on reserved keys via $update", () => {
      expect(() => store({ $update: () => "helper" })).toThrow("reserved key collision, received \"$update\"");
    });

    test("rejects function value on $cleanup reserved key", () => {
      expect(() => store({ $cleanup: () => "dispose" })).toThrow("reserved key collision, received \"$cleanup\"");
    });

    test("rejects function value on $subscribe reserved key", () => {
      expect(() => store({ $subscribe: () => "listen" })).toThrow("reserved key collision, received \"$subscribe\"");
    });

    test("$update throws on the reserved $snapshot key", () => {
      const data = store({ a: 1 });
      // no type error: reserved names flow into P, so the runtime throw is the contract
      expect(() => data.$update({ $snapshot: "hijack" })).toThrow('[store] $update: reserved key "$snapshot"');
      expect(data.$snapshot()).toEqual({ a: 1 });
    });

    test("$update throws on the reserved $update key", () => {
      const data = store({ count: 0 });

      // no type error: reserved names flow into P, so the runtime throw is the contract
      expect(() => data.$update({ $update: { count: 99 } })).toThrow('[store] $update: reserved key "$update"');

      expect(data.count()).toBe(0);
      expect(data.$snapshot()).toEqual({ count: 0 });
    });

    test("$subscribe throws on a reserved key", () => {
      const data = store({ count: 0 });

      expect(() => {
        // @ts-expect-error $update is reserved — not a settable key
        data.$subscribe("$update", () => {});
      }).toThrow('[store] $subscribe: "$update" is not a settable key');
    });

    test("unprefixed method names are ordinary signal-backed data keys", () => {
      const data = store({
        snapshot: "s1",
        update: "u1",
        cleanup: "c1",
        subscribe: "b1"
      });

      expect(data.snapshot()).toBe("s1");
      expect(data.update()).toBe("u1");
      expect(data.cleanup()).toBe("c1");
      expect(data.subscribe()).toBe("b1");

      const seen = mock<(next: string, prev: string) => void>(() => {});
      data.$subscribe("update", seen);

      data.snapshot("s2");
      data.update("u2");
      data.cleanup("c2");
      data.subscribe("b2");

      expect(data.$snapshot()).toEqual({ snapshot: "s2", update: "u2", cleanup: "c2", subscribe: "b2" });
      expect(seen).toHaveBeenCalledTimes(1);
      expect(seen.mock.calls[0]).toEqual(["u2", "u1"]);
    });

    test("function values on unprefixed names are preserved as-is", () => {
      const listen = () => "listen";
      const data = store({ subscribe: listen });

      expect(data.subscribe).toBe(listen);
      expect(data.subscribe()).toBe("listen");
      expect(data.$snapshot().subscribe).toBe(listen);
    });

    test("nested plain objects under unprefixed names become nested stores", () => {
      const data = store({ update: { count: 0 } });

      expect(data.update.$snapshot()).toEqual({ count: 0 });

      data.$update({ update: { count: 1 } });

      expect(data.update.$snapshot()).toEqual({ count: 1 });
      expect(data.update.count()).toBe(1);
    });
  });
});
