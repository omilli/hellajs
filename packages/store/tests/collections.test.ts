import { describe, test, expect, mock } from "bun:test";
import { effect } from "@hellajs/core";
import { delay } from "@utils/test-helpers.js";
import { store } from "@hellajs/store/bundle";
import type { SignalArray } from "@hellajs/core";
import type { Store } from "@hellajs/store";

type Todo = { id: number; text: string; completed: boolean };

const isPlainObject = (value: unknown): boolean =>
  typeof value === "object" && value !== null && Object.getPrototypeOf(value) === Object.prototype;

describe("store", () => {
describe("collections", () => {
  test("dispatches Array/Map/Set keys to granular containers", () => {
    const data = store({
      items: [1, 2, 3],
      lookup: new Map([["a", 1]]),
      tags: new Set(["x"])
    });

    expect(data.items.get(0)).toBe(1);
    data.items.set(0, 9);
    expect(data.items.push(4)).toBe(4);
    expect(data.items()).toEqual([9, 2, 3, 4]);

    expect(data.lookup.get("a")).toBe(1);
    data.lookup.set("b", 2);
    expect(data.lookup.has("b")).toBe(true);
    expect(data.$snapshot().lookup).toEqual(new Map([["a", 1], ["b", 2]]));

    expect(data.tags.has("x")).toBe(true);
    data.tags.add("y");
    expect(data.$snapshot().tags).toEqual(new Set(["x", "y"]));
  });

  test("converts object elements to granular stores", () => {
    const data = store({
      todos: [
        { id: 1, text: "write plans", completed: false },
        { id: 2, text: "ship", completed: true }
      ] as Todo[]
    });
    const firstCompleted = mock((value: boolean) => value);
    const firstText = mock((value: string) => value);
    const secondCompleted = mock((value: boolean) => value);
    effect(() => firstCompleted(data.todos.get(0)!.completed()));
    effect(() => firstText(data.todos.get(0)!.text()));
    effect(() => secondCompleted(data.todos.get(1)!.completed()));

    expect(firstCompleted).toHaveBeenLastCalledWith(false);
    data.todos.get(0)!.text("rewrite");
    expect(firstCompleted).toHaveBeenCalledTimes(1); // Field write: only text readers wake
    expect(firstText).toHaveBeenCalledTimes(2);
    data.todos.get(1)!.completed(false);
    expect(secondCompleted).toHaveBeenCalledTimes(2);
    expect(firstCompleted).toHaveBeenCalledTimes(1); // Todo 1 writes never wake todo 0 readers
    expect(firstText).toHaveBeenCalledTimes(2);
  });

  test("direct field writes wake only that field's readers", () => {
    const data = store({ todos: [{ id: 1, text: "write plans", completed: false }] as Todo[] });
    const completedTracker = mock(() => {});
    const textTracker = mock(() => {});
    effect(() => { data.todos.get(0)!.completed(); completedTracker(); });
    effect(() => { data.todos.get(0)!.text(); textTracker(); });

    data.todos.get(0)!.completed(true);

    expect(completedTracker).toHaveBeenCalledTimes(2);
    expect(textTracker).toHaveBeenCalledTimes(1);
  });

  test("set(i, partial) patches the element store in place", () => {
    const data = store({ todos: [{ id: 1, text: "write plans", completed: false }] as Todo[] });
    const completedTracker = mock(() => {});
    const textTracker = mock(() => {});
    effect(() => { data.todos.get(0)!.completed(); completedTracker(); });
    effect(() => { data.todos.get(0)!.text(); textTracker(); });

    data.todos.set(0, { completed: true });

    expect(data.todos.get(0)!.text()).toBe("write plans"); // Patch keeps untouched fields
    expect(completedTracker).toHaveBeenCalledTimes(2);
    expect(textTracker).toHaveBeenCalledTimes(1);
  });

  test("update(partial) reconciles arrays position-wise through patches", () => {
    const data = store({
      todos: [
        { id: 1, text: "write plans", completed: false },
        { id: 2, text: "ship", completed: false }
      ] as Todo[]
    });
    const firstCompleted = mock(() => {});
    const secondText = mock(() => {});
    const positional = mock(() => {});
    effect(() => { data.todos.get(0)!.completed(); firstCompleted(); });
    effect(() => { data.todos.get(1)!.text(); secondText(); });
    effect(() => { data.todos.get(0); positional(); });

    data.$update({
      todos: [
        { id: 1, text: "write plans", completed: true },
        { id: 2, text: "ship", completed: false }
      ]
    });

    expect(firstCompleted).toHaveBeenCalledTimes(2); // Only the changed field's readers wake
    expect(secondText).toHaveBeenCalledTimes(1);

    data.$update({
      todos: [
        { id: 1, text: "write plans", completed: true },
        { id: 2, text: "ship", completed: false },
        { id: 3, text: "rest", completed: false }
      ]
    });

    expect(positional).toHaveBeenCalledTimes(2); // Length change is structural: positional readers wake
    expect(data.todos.length()).toBe(3);
  });

  test("draft mutations patch only the changed positions", () => {
    const data = store({
      todos: [
        { id: 1, text: "write plans", completed: false },
        { id: 2, text: "ship", completed: false }
      ] as Todo[]
    });
    const firstCompleted = mock(() => {});
    const secondCompleted = mock(() => {});
    effect(() => { data.todos.get(0)!.completed(); firstCompleted(); });
    effect(() => { data.todos.get(1)!.completed(); secondCompleted(); });

    data.$update(draft => {
      draft.todos[0]!.completed = true;
    });

    expect(firstCompleted).toHaveBeenCalledTimes(2);
    expect(secondCompleted).toHaveBeenCalledTimes(1);
  });

  test("nested collections recurse with full granularity", () => {
    const data = store({ grid: [[1, 2], [3, 4]] });
    const inner00 = mock((value: number) => value);
    const inner01 = mock((value: number) => value);
    effect(() => inner00(data.grid.get(0)!.get(0)!));
    effect(() => inner01(data.grid.get(0)!.get(1)!));

    expect(inner00).toHaveBeenLastCalledWith(1);
    data.grid.get(0)!.set(0, 9);
    expect(inner00).toHaveBeenCalledTimes(2); // Only inner-index-0 readers wake
    expect(inner01).toHaveBeenCalledTimes(1);
    expect(data.grid.get(0)!.get(1)).toBe(2);
  });

  test("Map values convert to granular stores and patch on write", () => {
    const data = store({ lookup: new Map([["a", { n: 1 }]]) });
    const nTracker = mock((value: number) => value);
    effect(() => nTracker(data.lookup.get("a")!.n()));

    expect(nTracker).toHaveBeenLastCalledWith(1);
    data.lookup.set("a", { n: 2 });
    expect(nTracker).toHaveBeenCalledTimes(2); // Patched, not replaced
    const plain = data.$snapshot().lookup;
    expect(plain).toBeInstanceOf(Map);
    expect(plain.get("a")).toEqual({ n: 2 });
    expect(isPlainObject(plain.get("a"))).toBe(true);
  });

  test("Set members store converted elements, so identity matches the member not the raw input", () => {
    const raw = { id: 1 };
    const data = store({ members: new Set([raw]) });

    const member = Array.from(data.members())[0]!;
    expect(data.members.has(member)).toBe(true);
    expect(data.members.has(raw)).toBe(false); // wrap changed object identity

    const primitives = store({ tags: new Set(["x"]) });
    expect(primitives.tags.has("x")).toBe(true); // Primitive sets match by value
  });

  test("snapshot returns a deep-plain structure", () => {
    const data = store({
      todos: [{ id: 1, text: "write plans", completed: false }] as Todo[],
      grid: [[1, 2]],
      lookup: new Map([["a", { n: 1 }]]),
      tags: new Set([{ id: 7 }])
    });

    const plain = data.$snapshot();
    expect(Array.isArray(plain.todos)).toBe(true);
    expect(isPlainObject(plain.todos[0])).toBe(true);
    expect(typeof plain.todos[0]!.text).toBe("string"); // Fields are values, not signals
    expect(Array.isArray(plain.grid[0])).toBe(true);
    expect(plain.grid[0]).toEqual([1, 2]);
    expect(plain.lookup).toBeInstanceOf(Map);
    expect(isPlainObject(plain.lookup.get("a"))).toBe(true);
    expect(plain.tags).toBeInstanceOf(Set);
    expect(isPlainObject(Array.from(plain.tags)[0])).toBe(true);
  });

  test("element references stay stable across whole-callable reads", () => {
    const data = store({ todos: [{ id: 1, text: "write plans", completed: false }] as Todo[] });

    expect(data.todos()[0]).toBe(data.todos()[0]);
    data.todos.push({ id: 2, text: "ship", completed: false });
    expect(data.todos()[0]).toBe(data.todos()[0]);
    expect(data.todos()[1]).toBe(data.todos()[1]);
  });

  test("subscribe fires on container changes only, with plain arrays", () => {
    const data = store({
      items: [1, 2, 3],
      todos: [{ id: 1, text: "write plans", completed: false }] as Todo[]
    });
    const itemsSubscriber = mock((next: number[], prev: number[]) => [next, prev]);
    const todosSubscriber = mock(() => {});
    data.$subscribe("items", itemsSubscriber);
    data.$subscribe("todos", todosSubscriber);

    data.items.push(4);
    expect(itemsSubscriber).toHaveBeenCalledTimes(1);
    expect(itemsSubscriber).toHaveBeenLastCalledWith([1, 2, 3, 4], [1, 2, 3]); // Raw elements: plain arrays

    data.todos.push({ id: 2, text: "ship", completed: false });
    expect(todosSubscriber).toHaveBeenCalledTimes(1); // Container-level change fires it

    data.todos.get(0)!.completed(true); // Element field writes do not touch the container
    expect(itemsSubscriber).toHaveBeenCalledTimes(1);
    expect(todosSubscriber).toHaveBeenCalledTimes(1);
  });

  test("readonly collection keys read through and throw on every write path", () => {
    const data = store({
      todos: [{ id: 1, text: "write plans", completed: false }] as Todo[]
    }, { readonly: ["todos"] });
    // The typed surface is the plain getter; the mutator guards are runtime-only,
    // so this test drives them through the container shape
    const todos = data.todos as unknown as SignalArray<Store<Todo>, Todo>;

    expect(todos.get(0)!.text()).toBe("write plans"); // Reads pass through
    expect(data.todos().length).toBe(1);
    expect(() => todos.push({ id: 2, text: "ship", completed: false })).toThrow('[store] readonly key "todos"');
    expect(() => todos([{ id: 9, text: "x", completed: false }])).toThrow('[store] readonly key "todos"');
    // Deep readonly threads into element stores: the element's own guard throws
    expect(() => todos.get(0)!.completed(true)).toThrow('[store] readonly key "completed"');
    expect(todos.get(0)!.completed()).toBe(false);
  });

  test("collects element stores after cleanup and reference drop", async () => {
    const holdCanary = () => {
      const data = store({ todos: [{ id: 1, text: "write plans", completed: false }] as Todo[] });
      const element = data.todos.get(0)!;
      const ref = new WeakRef(element);
      data.$cleanup();
      return ref;
    };
    const ref = holdCanary();

    await delay(0); // Macrotask turn before GC
    Bun.gc(true);
    Bun.gc(true);
    Bun.gc(true);

    expect(ref.deref()).toBeUndefined();
  });

  test("per-element equals gates raw element writes; store elements patch without consulting it", () => {
    const near = mock((previous: number, next: number) => Math.abs(next - previous) < 3);
    const todoEquals = mock<(previous: Todo[], next: Todo[]) => boolean>(() => true);
    const data = store({ items: [0], todos: [{ id: 1, text: "write plans", completed: false }] as Todo[] }, {
      equals: {
        // Runtime applies collection comparators per element; the declared type keeps the whole-value shape
        items: near as unknown as (previous: number[], next: number[]) => boolean,
        todos: todoEquals
      }
    });
    const itemsTracker = mock(() => {});
    const completedTracker = mock(() => {});
    effect(() => { data.items(); itemsTracker(); });
    effect(() => { data.todos.get(0)!.completed(); completedTracker(); });

    data.items.set(0, 2);
    expect(near).toHaveBeenLastCalledWith(0, 2);
    expect(itemsTracker).toHaveBeenCalledTimes(1); // Comparator said equal: no wake
    data.items.set(0, 10);
    expect(itemsTracker).toHaveBeenCalledTimes(2); // Unequal: wakes

    data.todos.set(0, { completed: true });
    expect(completedTracker).toHaveBeenCalledTimes(2); // Routed through the patch path
    expect(todoEquals).not.toHaveBeenCalled(); // Store elements never consult the comparator
    expect(data.todos.get(0)!.text()).toBe("write plans");
  });

  test("middleware transforms whole-collection writes and keeps the method surface", () => {
    const data = store({ items: [2, 1] }, {
      middleware: { items: (value: number[]) => [...value].sort((a, b) => a - b) }
    });

    data.items([3, 1]); // Container-level middleware applies to whole-collection setter calls
    expect(data.items()).toEqual([1, 3]);

    data.items.push(0); // Container methods bypass middleware
    expect(data.items()).toEqual([1, 3, 0]);
    expect(data.items.length()).toBe(3); // Forwarded methods stay callable through the wrapper
    expect(data.items.get(2)).toBe(0);
  });

  test("throws at create time for an invalid equals value on a collection key", () => {
    expect(() => store({ items: [1, 2] }, {
      equals: {
        // @ts-expect-error 42 is neither a comparator nor "structural" — create must reject it
        items: 42
      }
    })).toThrow('[store] store: equals for "items" must be a function or "structural", received number');
  });

  test("cleanup tears down element stores behind Map, Set, and nested containers", () => {
    const data = store({
      lookup: new Map([["a", { n: 1 }]]),
      members: new Set([{ id: 1 }]),
      grid: [[1, 2]]
    });

    data.$cleanup();

    // Teardown walks every container kind; signals remain functional afterwards
    expect(data.lookup.get("a")!.n()).toBe(1);
    expect(Array.from(data.members())[0]!.id()).toBe(1);
    expect(data.grid.get(0)!.get(1)).toBe(2);
  });
});
});
