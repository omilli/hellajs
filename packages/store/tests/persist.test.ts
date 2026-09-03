import { describe, test, expect, mock } from "bun:test";
import { effect } from "@hellajs/core";
import { delay } from "@utils/test-helpers.js";
import { store, persistStore } from "@hellajs/store/bundle";

const createAdaptor = (initial: string | null) => {
  let stored: string | null = initial;
  const read = mock(() => stored);
  const write = mock((value: string) => {
    stored = value;
  });
  const clear = mock(() => {
    stored = null;
  });
  return { read, write, clear };
};

const deferredAdaptor = () => {
  let resolveRead!: (value: string | null) => void;
  const promise = new Promise<string | null>((resolve) => {
    resolveRead = resolve;
  });
  const read = mock(() => promise);
  const write = mock(() => {});
  const clear = mock(() => {});
  return { read, write, clear, resolveRead };
};

describe("store", () => {
describe("persist", () => {
  test("applies persisted state synchronously before persistStore returns", () => {
    const adaptor = createAdaptor('{"theme":"dark","fontSize":14}');
    const data = store({ theme: "light", fontSize: 12 });
    const handle = persistStore(data, adaptor);

    expect(data.theme()).toBe("dark");
    expect(data.fontSize()).toBe(14);
    expect(handle.hydrated()).toBe(true);
  });

  test("flips hydrated reactively when an async read resolves and applies the state", async () => {
    const { read, write, clear, resolveRead } = deferredAdaptor();
    const data = store({ theme: "light" });
    const handle = persistStore(data, { read, write, clear });

    const reads = mock(() => handle.hydrated());
    effect(reads);
    expect(reads).toHaveBeenCalledTimes(1);

    resolveRead('{"theme":"dark"}');
    await delay(0);

    expect(reads).toHaveBeenCalledTimes(2);
    expect(data.theme()).toBe("dark");
    expect(handle.hydrated()).toBe(true);
  });

  test("persists the initial state once when storage is empty", () => {
    const adaptor = createAdaptor(null);
    const data = store({ theme: "light" });
    const handle = persistStore(data, adaptor);

    expect(adaptor.write).toHaveBeenCalledTimes(1);
    expect(adaptor.write).toHaveBeenCalledWith('{"theme":"light"}');
    expect(handle.hydrated()).toBe(true);
  });

  test("skips persisted state when a projected key was written before an async read resolves", async () => {
    const { read, write, clear, resolveRead } = deferredAdaptor();
    const data = store({ theme: "light" });
    const handle = persistStore(data, { read, write, clear });

    data.theme("dark");
    resolveRead('{"theme":"blue"}');
    await delay(0);

    expect(data.theme()).toBe("dark");
    expect(handle.hydrated()).toBe(true);
    expect(write).not.toHaveBeenCalled();

    data.theme("red");
    expect(write).toHaveBeenCalledWith('{"theme":"red"}');
  });

  test("applies persisted state when a non-projected key was written before the read resolves", async () => {
    const { read, write, clear, resolveRead } = deferredAdaptor();
    const data = store({ theme: "light", session: "abc" });
    const handle = persistStore(data, { read, write, clear }, {
      partialize: (s) => ({ theme: s.theme })
    });

    data.session("xyz");
    resolveRead('{"theme":"dark"}');
    await delay(0);

    expect(data.theme()).toBe("dark");
    expect(data.session()).toBe("xyz");
    expect(handle.hydrated()).toBe(true);
    expect(write).not.toHaveBeenCalled();
  });

  test("writes through on every post-hydration change", () => {
    const adaptor = createAdaptor('{"theme":"dark"}');
    const data = store({ theme: "light" });
    persistStore(data, adaptor);

    data.theme("blue");
    expect(adaptor.write).toHaveBeenCalledWith('{"theme":"blue"}');
  });

  test("skips adaptor write when a change leaves the persisted projection unchanged", () => {
    const adaptor = createAdaptor('{"theme":"dark"}');
    const data = store({ theme: "light", session: "abc" });
    persistStore(data, adaptor, {
      partialize: (s) => ({ theme: s.theme })
    });

    data.session("xyz");
    expect(adaptor.write).not.toHaveBeenCalled();
  });

  test("persists only the partialized projection", () => {
    const adaptor = createAdaptor(null);
    const data = store({ theme: "light", session: "abc" });
    persistStore(data, adaptor, {
      partialize: (s) => ({ theme: s.theme })
    });

    data.theme("dark");
    expect(adaptor.write.mock.calls.at(-1)).toEqual(['{"theme":"dark"}']);
  });

  test("uses custom serialize and deserialize on both directions", () => {
    const adaptor = createAdaptor("theme=dark");
    const serialize = mock((state: { theme?: string }) => `theme=${state.theme}`);
    const deserialize = mock((raw: string) => ({ theme: raw.slice(6) }));
    const data = store({ theme: "light" });
    persistStore(data, adaptor, { serialize, deserialize });

    expect(deserialize).toHaveBeenCalledWith("theme=dark");
    expect(data.theme()).toBe("dark");

    data.theme("blue");
    expect(serialize.mock.calls.at(-1)).toEqual([{ theme: "blue" }]);
    expect(adaptor.write.mock.calls.at(-1)).toEqual(["theme=blue"]);
  });

  test("clears storage, keeps initial state, and fires onError when deserialize throws", () => {
    const adaptor = createAdaptor("{corrupt");
    const onError = mock((error: unknown) => error);
    const data = store({ theme: "light" });
    const handle = persistStore(data, adaptor, {
      deserialize: () => {
        throw new Error("bad json");
      },
      onError
    });

    expect(data.theme()).toBe("light");
    expect(adaptor.clear).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(handle.hydrated()).toBe(true);
  });

  test("clears storage and keeps initial state when persisted state contains unknown keys", () => {
    const adaptor = createAdaptor('{"gone":true,"theme":"dark"}');
    const onError = mock((error: unknown) => error);
    const data = store({ theme: "light" });
    const handle = persistStore(data, adaptor, { onError });

    expect(data.theme()).toBe("light");
    expect(adaptor.clear).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(handle.hydrated()).toBe(true);
  });

  test("reports a read rejection via onError without clearing storage", async () => {
    const read = mock(() => Promise.reject(new Error("storage down")));
    const write = mock(() => {});
    const clear = mock(() => {});
    const onError = mock((error: unknown) => error);
    const data = store({ theme: "light" });
    const handle = persistStore(data, { read, write, clear }, { onError });
    await delay(0);

    expect(onError).toHaveBeenCalledTimes(1);
    expect(clear).not.toHaveBeenCalled();
    expect(handle.hydrated()).toBe(true);
    await handle.ready;

    data.theme("dark");
    expect(write).toHaveBeenCalledWith('{"theme":"dark"}');
  });

  test("reports a write rejection via onError", async () => {
    const read = mock(() => '{"theme":"dark"}');
    const write = mock(() => Promise.reject(new Error("quota exceeded")));
    const clear = mock(() => {});
    const onError = mock((error: unknown) => error);
    const data = store({ theme: "light" });
    persistStore(data, { read, write, clear }, { onError });

    data.theme("red");
    await delay(0);

    expect(onError).toHaveBeenCalledTimes(1);
  });

  test("reports a clear rejection via onError during corrupt-state fallback", async () => {
    const read = mock(() => '{"gone":true}');
    const write = mock(() => {});
    const clear = mock(() => Promise.reject(new Error("clear failed")));
    const onError = mock((error: unknown) => error);
    const data = store({ theme: "light" });
    const handle = persistStore(data, { read, write, clear }, { onError });
    await delay(0);

    expect(onError).toHaveBeenCalledTimes(2);
    expect(handle.hydrated()).toBe(true);
  });

  test("coalesces rapid writes into one storage write under debounce", async () => {
    const adaptor = createAdaptor('{"count":0}');
    const data = store({ count: 0 });
    persistStore(data, adaptor, { debounce: 20 });

    data.count(1);
    data.count(2);
    expect(adaptor.write).not.toHaveBeenCalled();

    await delay(30);
    expect(adaptor.write).toHaveBeenCalledTimes(1);
    expect(adaptor.write).toHaveBeenCalledWith('{"count":2}');
  });

  test("flushes a pending debounced write on pagehide", () => {
    const adaptor = createAdaptor('{"count":0}');
    const data = store({ count: 0 });
    persistStore(data, adaptor, { debounce: 100 });

    data.count(1);
    expect(adaptor.write).not.toHaveBeenCalled();

    window.dispatchEvent(new Event("pagehide"));
    expect(adaptor.write).toHaveBeenCalledTimes(1);
    expect(adaptor.write).toHaveBeenCalledWith('{"count":1}');
  });

  test("stops write-through and cancels a pending debounced write after dispose", async () => {
    const adaptor = createAdaptor('{"count":0}');
    const data = store({ count: 0 });
    const handle = persistStore(data, adaptor, { debounce: 10 });

    data.count(1);
    handle.dispose();
    await delay(30);
    expect(adaptor.write).not.toHaveBeenCalled();

    data.count(2);
    await delay(30);
    expect(adaptor.write).not.toHaveBeenCalled();
  });

  test("resolves ready after hydration settles", async () => {
    const { read, write, clear, resolveRead } = deferredAdaptor();
    const data = store({ theme: "light" });
    const handle = persistStore(data, { read, write, clear });

    const onReady = mock(() => {});
    handle.ready.then(onReady);
    expect(onReady).not.toHaveBeenCalled();

    resolveRead('{"theme":"dark"}');
    await handle.ready;
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(data.theme()).toBe("dark");
  });

  test("runs store middleware on hydration apply", () => {
    const adaptor = createAdaptor('{"name":"  Jane  "}');
    const data = store({ name: "" }, {
      middleware: { name: (v: string) => v.trim() }
    });
    persistStore(data, adaptor);

    expect(data.name()).toBe("Jane");
  });

  test("is inert without window", async () => {
    const adaptor = createAdaptor('{"theme":"dark"}');
    const win = globalThis.window;
    Reflect.deleteProperty(globalThis, "window");
    try {
      const data = store({ theme: "light" });
      const handle = persistStore(data, adaptor);

      expect(adaptor.read).not.toHaveBeenCalled();
      expect(adaptor.write).not.toHaveBeenCalled();
      expect(handle.hydrated()).toBe(true);
      await handle.ready;
      expect(handle.hydrated()).toBe(true);

      handle.dispose();
      // noop — verifies the SSR branch's noop does not throw
    } finally {
      globalThis.window = win;
    }
  });
});
});
