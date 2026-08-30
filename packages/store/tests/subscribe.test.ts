import { describe, test, expect, mock } from "bun:test";
import { signal, batch } from "@hellajs/core";
import { store } from "@hellajs/store/bundle";

describe("store", () => {
describe("subscribe", () => {
  test("fires the callback with next and prev on write, not on subscribe", () => {
    const data = store({ count: 0 });
    const seen = mock<(next: number, prev: number) => void>(() => {});

    data.subscribe("count", seen);
    expect(seen).not.toHaveBeenCalled();

    data.count(5);

    expect(seen).toHaveBeenCalledTimes(1);
    expect(seen.mock.calls[0]).toEqual([5, 0]);
  });

  test("stops notifications after unsubscribe and tolerates double unsubscribe", () => {
    const data = store({ count: 0 });
    const seen = mock<(next: number, prev: number) => void>(() => {});

    const unsub = data.subscribe("count", seen);
    unsub();
    unsub();

    data.count(5);

    expect(seen).not.toHaveBeenCalled();
  });

  test("does not widen the subscription when the callback reads another signal", () => {
    const other = signal(10);
    const data = store({ count: 0 });
    const seen = mock<(next: number, prev: number) => void>(() => { other(); });

    data.subscribe("count", seen);
    other(99);
    expect(seen).not.toHaveBeenCalled();

    data.count(1);
    expect(seen).toHaveBeenCalledTimes(1);
  });

  test("does not fire on a write equal to the current value", () => {
    const data = store({ count: 0 });
    const seen = mock<(next: number, prev: number) => void>(() => {});

    data.subscribe("count", seen);
    data.count(0);

    expect(seen).not.toHaveBeenCalled();
  });

  test("fires once per subscribed key after a batch of writes", () => {
    const data = store({ count: 0, name: "Alice" });
    const countSeen = mock<(next: number, prev: number) => void>(() => {});
    const nameSeen = mock<(next: string, prev: string) => void>(() => {});

    data.subscribe("count", countSeen);
    data.subscribe("name", nameSeen);

    batch(() => {
      data.count(1);
      data.count(2);
      data.name("Bob");
    });

    expect(countSeen).toHaveBeenCalledTimes(1);
    expect(countSeen.mock.calls[0]).toEqual([2, 0]);
    expect(nameSeen).toHaveBeenCalledTimes(1);
    expect(nameSeen.mock.calls[0]).toEqual(["Bob", "Alice"]);
  });

  test("throws for keys that are not signal-backed", () => {
    const data = store({ nested: { value: 1 }, onSave: () => {}, count: 0 });

    expect(() => {
      // @ts-expect-error nested stores are not settable keys — subscribe on the owning store
      data.subscribe("nested", () => {});
    }).toThrow('[store] subscribe: "nested" is not a settable key');

    expect(() => {
      // @ts-expect-error preserved functions are not settable keys
      data.subscribe("onSave", () => {});
    }).toThrow('[store] subscribe: "onSave" is not a settable key');

    expect(() => {
      // @ts-expect-error unknown keys are not settable keys
      data.subscribe("missing", () => {});
    }).toThrow('[store] subscribe: "missing" is not a settable key');
  });

  test("subscribing to a readonly key never fires the callback", () => {
    const data = store({ count: 0 }, { readonly: ["count"] as const });
    const seen = mock<(next: number, prev: number) => void>(() => {});

    data.subscribe("count", seen);
    expect(() => data.update({ count: 99 })).toThrow('[store] readonly key "count"');
    // @ts-expect-error readonly keys are typed without a setter; the runtime call throws
    expect(() => data.count(99)).toThrow('[store] readonly key "count"');

    expect(seen).not.toHaveBeenCalled();
    expect(data.count()).toBe(0);
  });

  test("subscribes through the store that owns the key", () => {
    const userStore = store({ name: "Alice" });
    const appStore = store({ user: userStore });
    const seen = mock<(next: string, prev: string) => void>(() => {});

    userStore.subscribe("name", seen);
    appStore.user.name("Bob");

    expect(seen).toHaveBeenCalledTimes(1);
    expect(seen.mock.calls[0]).toEqual(["Bob", "Alice"]);

    expect(() => {
      // @ts-expect-error nested stores are not settable keys — subscribe on the owning store
      appStore.subscribe("user", () => {});
    }).toThrow('[store] subscribe: "user" is not a settable key');
  });
});
});
