import { describe, test, expect, mock } from "bun:test";
import { signalMap, effect, batch, untracked } from "@hellajs/core";

describe("signalMap", () => {
  test("get readers wake on their key's value writes only", () => {
    const scores = signalMap<string, number>([
      ["alice", 1],
      ["bob", 2],
    ]);
    const alice = mock((value: number | undefined) => value);
    effect(() => alice(scores.get("alice")));
    scores.set("bob", 20);
    expect(alice).toHaveBeenCalledTimes(1);
    scores.set("alice", 10);
    expect(alice).toHaveBeenCalledTimes(2);
    expect(alice).toHaveBeenLastCalledWith(10);
  });

  test("delete wakes key readers with undefined", () => {
    const scores = signalMap<string, number>([["alice", 1]]);
    const alice = mock((value: number | undefined) => value);
    effect(() => alice(scores.get("alice")));
    expect(scores.delete("alice")).toBe(true);
    expect(alice).toHaveBeenCalledTimes(2);
    expect(alice).toHaveBeenLastCalledWith(undefined);
    expect(scores.delete("alice")).toBe(false);
  });

  test("keys readers wake on membership changes but not value writes", () => {
    const scores = signalMap<string, number>([["alice", 1]]);
    const keys = mock((value: string[]) => value);
    effect(() => keys(scores.keys()));
    scores.set("alice", 10); // Value-only write
    expect(keys).toHaveBeenCalledTimes(1);
    scores.set("bob", 2);
    expect(keys).toHaveBeenCalledTimes(2);
    expect(keys).toHaveBeenLastCalledWith(["alice", "bob"]);
    scores.delete("alice");
    expect(keys).toHaveBeenCalledTimes(3);
    expect(keys).toHaveBeenLastCalledWith(["bob"]);
  });

  test("has readers track membership without waking on value writes", () => {
    const scores = signalMap<string, number>([["alice", 1]]);
    const aliceHas = mock((present: boolean) => present);
    effect(() => aliceHas(scores.has("alice")));
    scores.set("alice", 10); // Value write: membership unchanged
    expect(aliceHas).toHaveBeenCalledTimes(1);
    scores.delete("alice");
    expect(aliceHas).toHaveBeenCalledTimes(2);
    expect(aliceHas).toHaveBeenLastCalledWith(false);
  });

  test("size readers wake on membership changes", () => {
    const scores = signalMap<string, number>();
    const size = mock((value: number) => value);
    effect(() => size(scores.size()));
    expect(size).toHaveBeenLastCalledWith(0);
    scores.set("alice", 1);
    expect(size).toHaveBeenCalledTimes(2);
    expect(size).toHaveBeenLastCalledWith(1);
  });

  test("entry returns a stable handle reading undefined for absent keys", () => {
    const scores = signalMap<string, number>();
    const alice = scores.entry("alice");
    expect(alice()).toBeUndefined();
    const reader = mock((value: number | undefined) => value);
    effect(() => reader(alice()));
    scores.set("alice", 5);
    expect(reader).toHaveBeenCalledTimes(2);
    expect(reader).toHaveBeenLastCalledWith(5);
    expect(scores.entry("alice") === alice).toBe(true); // Stable identity
    scores.delete("alice");
    expect(reader).toHaveBeenCalledTimes(3);
    expect(reader).toHaveBeenLastCalledWith(undefined);
    scores.set("carol", 9); // Unrelated structural change: absorbed by the equality gate
    expect(reader).toHaveBeenCalledTimes(3);
  });

  test("the callable returns a fresh plain Map tracking every change", () => {
    const scores = signalMap<string, number>([["alice", 1]]);
    const snapshot = scores();
    expect(snapshot).toEqual(new Map([["alice", 1]]));
    snapshot.set("zoe", 0);
    expect(scores.size()).toBe(1); // Snapshot mutation never touches the container

    const reader = mock((value: Map<string, number>) => value);
    effect(() => reader(scores()));
    scores.set("alice", 10);
    expect(reader).toHaveBeenCalledTimes(2);
    scores.delete("alice");
    expect(reader).toHaveBeenCalledTimes(3);
    expect(reader).toHaveBeenLastCalledWith(new Map());
  });

  test("forEach and values track iteration reads", () => {
    const scores = signalMap<string, number>([
      ["alice", 1],
      ["bob", 2],
    ]);
    const each = mock((value: number, key: string) => `${key}:${value}`);
    effect(() => scores.forEach(each));
    expect(each).toHaveBeenCalledTimes(2);
    scores.set("alice", 10);
    expect(each).toHaveBeenCalledTimes(4); // Full re-iteration

    const values = mock((value: number[]) => value);
    effect(() => values(scores.values()));
    expect(values).toHaveBeenLastCalledWith([10, 2]);
  });

  test("the reconcile-setter keeps equal values, adds new keys, and drops missing keys", () => {
    const scores = signalMap<string, number>([
      ["alice", 1],
      ["bob", 2],
    ]);
    // An entry handle tracks only its key's signal: it reruns iff the child was written
    const alice = mock((value: number | undefined) => value);
    effect(() => alice(scores.entry("alice")()));
    scores(
      new Map([
        ["alice", 1],
        ["carol", 3],
      ])
    );
    expect(alice).toHaveBeenCalledTimes(1); // Equal value kept: no child write
    expect(scores()).toEqual(
      new Map([
        ["alice", 1],
        ["carol", 3],
      ])
    );
    expect(scores.has("bob")).toBe(false);
  });

  test("wrap and merge flow through value writes", () => {
    type Item = { n: number };
    const merge = mock<(prev: Item, next: Item) => boolean>((prev, next) => {
      prev.n = next.n;
      return true;
    });
    const rows = signalMap<string, Item>([["a", { n: 1 }]], {
      merge,
      equals: (a, b) => a.n === b.n,
    });
    const reader = mock((value: Item | undefined) => value);
    effect(() => reader(rows.get("a")));
    rows.set("a", { n: 5 });
    expect(reader).toHaveBeenCalledTimes(1); // Merged in place: no child write
    expect(rows.get("a")?.n).toBe(5);
  });

  test("mutations inside batch propagate once", () => {
    const scores = signalMap<string, number>([["alice", 1]]);
    const reader = mock((value: Map<string, number>) => value);
    effect(() => reader(scores()));
    batch(() => {
      scores.set("alice", 10);
      scores.set("bob", 2);
    });
    expect(reader).toHaveBeenCalledTimes(2);
    expect(reader).toHaveBeenLastCalledWith(
      new Map([
        ["alice", 10],
        ["bob", 2],
      ])
    );
  });

  test("reads inside untracked subscribe to nothing", () => {
    const scores = signalMap<string, number>([["alice", 1]]);
    const reader = mock((value: number | undefined) => value);
    effect(() => reader(untracked(() => scores.get("alice"))));
    scores.set("alice", 10);
    scores.delete("alice");
    expect(reader).toHaveBeenCalledTimes(1);
  });

  test("throws when options members are not functions", () => {
    expect(() => signalMap([["a", 1]], { equals: 1 as unknown as undefined })).toThrow(
      "[core] signalMap: equals must be a function, received number"
    );
    expect(() => signalMap([["a", 1]], { wrap: "x" as unknown as undefined })).toThrow(
      "[core] signalMap: wrap must be a function, received string"
    );
    expect(() => signalMap([["a", 1]], { merge: true as unknown as undefined })).toThrow(
      "[core] signalMap: merge must be a function, received boolean"
    );
  });
});
