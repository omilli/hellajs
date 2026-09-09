import { describe, test, expect, mock } from "bun:test";
import { signalSet, effect, untracked } from "@hellajs/core";

describe("signalSet", () => {
  test("has readers wake on add and delete of their value only", () => {
    const tags = signalSet(["a"]);
    const hasA = mock((present: boolean) => present);
    effect(() => hasA(tags.has("a")));
    tags.add("b");
    expect(hasA).toHaveBeenCalledTimes(1); // Different value: no wake
    tags.delete("b");
    expect(hasA).toHaveBeenCalledTimes(1);
    tags.delete("a");
    expect(hasA).toHaveBeenCalledTimes(2);
    expect(hasA).toHaveBeenLastCalledWith(false);
    tags.add("a");
    expect(hasA).toHaveBeenCalledTimes(3);
    expect(hasA).toHaveBeenLastCalledWith(true);
  });

  test("adding a present value wakes nothing", () => {
    const tags = signalSet(["a"]);
    const reader = mock((value: Set<string>) => value);
    effect(() => reader(tags()));
    const hasA = mock((present: boolean) => present);
    effect(() => hasA(tags.has("a")));
    tags.add("a");
    expect(reader).toHaveBeenCalledTimes(1);
    expect(hasA).toHaveBeenCalledTimes(1);
  });

  test("size and the callable track structural changes", () => {
    const tags = signalSet<string>();
    const size = mock((value: number) => value);
    effect(() => size(tags.size()));
    expect(size).toHaveBeenLastCalledWith(0);
    expect(tags.add("a")).toBe(tags); // add returns the container
    expect(size).toHaveBeenCalledTimes(2);
    const snapshot = tags();
    snapshot.add("z");
    expect(tags.size()).toBe(1); // Snapshot mutation never touches the container
    tags.add("b");
    expect(size).toHaveBeenCalledTimes(3);
    expect(size).toHaveBeenLastCalledWith(2);
    tags.delete("a");
    expect(tags()).toEqual(new Set(["b"]));
  });

  test("delete of an absent value returns false without waking", () => {
    const tags = signalSet(["a"]);
    const reader = mock((value: Set<string>) => value);
    effect(() => reader(tags()));
    expect(tags.delete("zz")).toBe(false);
    expect(reader).toHaveBeenCalledTimes(1);
  });

  test("forEach readers wake on structural changes", () => {
    const tags = signalSet(["a"]);
    const each = mock((value: string) => value);
    effect(() => tags.forEach(each));
    expect(each).toHaveBeenCalledTimes(1);
    tags.add("b");
    expect(each).toHaveBeenCalledTimes(3); // Full re-iteration: a + b
    tags.delete("a");
    expect(each).toHaveBeenCalledTimes(4); // b only
  });

  test("the reconcile-setter adds missing and drops absent values", () => {
    const tags = signalSet(["a", "b"]);
    tags(new Set(["b", "c"]));
    expect(tags()).toEqual(new Set(["b", "c"]));
    tags(new Set(["b", "c"])); // No membership change: no wake
    expect(tags.size()).toBe(2);
  });

  test("reads inside untracked subscribe to nothing", () => {
    const tags = signalSet(["a"]);
    const reader = mock((present: boolean) => present);
    effect(() => reader(untracked(() => tags.has("a"))));
    tags.add("b");
    tags.delete("a");
    expect(reader).toHaveBeenCalledTimes(1);
  });

  test("wrap converts initial values, adds, and reconcile entries", () => {
    const tags = signalSet(["a"], { wrap: (v: string) => v.toUpperCase() });
    tags.add("b");
    // The reconcile setter replaces membership: raw "a"/"b" match their wrapped forms
    tags(new Set(["a", "b", "c"]));
    expect(tags()).toEqual(new Set(["A", "B", "C"]));
    tags(new Set(["c"]));
    expect(tags()).toEqual(new Set(["C"])); // Wrapped "c" survives; A and B are absent from the input
  });

  test("wrapped values key membership, so raw lookups miss", () => {
    const tags = signalSet<unknown>(["a"], { wrap: (v) => ({ id: v }) });
    expect(tags.has("a")).toBe(false); // Raw value never entered membership
    const member = [...tags()][0]!;
    expect(tags.has(member)).toBe(true); // The wrapped member matches
    expect(tags.delete("a")).toBe(false);
    expect(tags.size()).toBe(1);
  });
});
