import { describe, test, expect, beforeEach, mock } from "bun:test";
import { signal, effect } from "@hellajs/core";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { resource } from "@hellajs/resource/bundle";

describe("resource", () => {
  describe("keepPreviousData", () => {
    beforeEach(() => {
      resetTestState();
    });

    test("keeps previous data visible during a key-change fetch window by default", async () => {
      const userId = signal(1);
      const fetcher = mock((id: number) => delay({ id, name: `User ${id}` }, 30));
      const r = resource(fetcher, { key: () => userId(), refetchOnKeyChange: true });

      const cleanup = effect(() => { r.status(); });

      await delay(50);
      expect(r.data()?.name).toBe("User 1");

      userId(2);
      await delay(10); // mid-window: User 2 fetch still in flight
      expect(r.data()?.name).toBe("User 1");
      expect(r.isLoading()).toBe(false);
      expect(r.isFetching()).toBe(true);

      await delay(50);
      expect(r.data()?.name).toBe("User 2");
      cleanup?.();
    });

    test("clears data to a loading window on key change when false", async () => {
      const userId = signal(1);
      const fetcher = mock((id: number) => delay({ id, name: `User ${id}` }, 30));
      const r = resource(fetcher, {
        key: () => userId(),
        refetchOnKeyChange: true,
        keepPreviousData: false
      });

      const cleanup = effect(() => { r.status(); });

      await delay(50);
      expect(r.data()?.name).toBe("User 1");

      userId(2);
      await delay(10); // mid-window: cleared while User 2 fetches
      expect(r.data()).toBeUndefined();
      expect(r.isLoading()).toBe(true);
      expect(r.status()).toBe("loading");

      await delay(50);
      expect(r.data()?.name).toBe("User 2");
      expect(r.status()).toBe("success");
      cleanup?.();
    });

    test("does not re-apply initialData when clearing on key change", async () => {
      const userId = signal(1);
      const initialUser = { id: 0, name: "Initial" };
      const fetcher = mock((id: number) => delay({ id, name: `User ${id}` }, 30));
      const r = resource(fetcher, {
        key: () => userId(),
        refetchOnKeyChange: true,
        keepPreviousData: false,
        initialData: initialUser
      });

      const cleanup = effect(() => { r.status(); });

      expect(r.data()).toBe(initialUser);
      await delay(50);
      expect(r.data()?.name).toBe("User 1");

      userId(2);
      await delay(10);
      expect(r.data()).toBeUndefined(); // cleared, not restored to initialData
      expect(r.isLoading()).toBe(true);

      await delay(50);
      expect(r.data()?.name).toBe("User 2");
      cleanup?.();
    });

    test("does not clear data when enabled flips with an unchanged key", async () => {
      const userId = signal(1);
      const enabled = signal(false);
      const fetcher = mock((id: number) => delay({ id, name: `User ${id}` }, 30));
      const r = resource(fetcher, {
        key: () => userId(),
        refetchOnKeyChange: true,
        keepPreviousData: false,
        enabled: () => enabled()
      });

      const cleanup = effect(() => { r.status(); });

      await delay(50);
      expect(fetcher).toHaveBeenCalledTimes(0);

      enabled(true);
      await delay(50);
      expect(r.data()?.name).toBe("User 1");

      enabled(false);
      await delay(10);
      enabled(true); // re-runs the effect, key unchanged
      await delay(10);
      expect(fetcher).toHaveBeenCalledTimes(2);
      expect(r.data()?.name).toBe("User 1");
      expect(r.isLoading()).toBe(false);
      cleanup?.();
    });
  });
});
