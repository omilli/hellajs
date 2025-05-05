import { describe, it, expect } from "bun:test";
import { For } from "../for";
import { signal } from "../../reactive";

describe("For", () => {
  it("maps items and assigns _item", () => {
    const data = signal([1, 2, 3]);
    const calls: any[] = [];
    const mapFn = (item: number, i: number) => {
      calls.push([item, i]);
      return { tag: "li", props: {}, children: [item] };
    };
    const result = For(data, mapFn)();
    expect(result).toHaveLength(3);
    expect(calls[0]).toEqual([1, 0]);
    expect(result[0]._item).toBe(1);
  });
});
