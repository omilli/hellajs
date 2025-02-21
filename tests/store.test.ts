import { describe, test, expect, mock, spyOn } from "bun:test";
import { store } from "../lib/store";
import { tick } from "./utils";
import { effect, signal } from "../lib/reactive";

describe("store", () => {
  describe("basic ", () => {
    test("initial", () => {
      const testStore = store({
        count: 0,
        name: "test",
      });

      expect(testStore.count()).toBe(0);
      expect(testStore.name()).toBe("test");
    });

    test("nested", () => {
      const testStore = store({
        user: {
          name: "test",
          age: 25,
        },
      });

      expect(testStore.user().name).toBe("test");
      expect(testStore.user().age).toBe(25);
    });

    test("readonly", () => {
      const testStore = store(
        {
          count: 0,
          version: "1.0.0",
        },
        {
          readonly: ["version"],
        }
      );

      expect(() => {
        testStore.version.set("2.0.0");
      }).toThrow();

      testStore.count.set(1);
      expect(testStore.count()).toBe(1);
    });
  });

  describe("computed", () => {
    test("functions", () => {
      const testStore = store(() => {
        const items = signal([1, 2, 3]);

        return {
          items,
          total: () => items().reduce((sum, n) => sum + n, 0),
          addItem(n: number) {
            items.set([...items(), n]);
          },
        };
      });

      expect(testStore.total()).toBe(6);
      testStore.addItem(4);
      expect(testStore.total()).toBe(10);
    });

    // test("memoized", async () => {
    //   const calculator = mock(() => 42);
    //   const testStore = store({
    //     expensive: calculator,
    //   });

    //   testStore.expensive();
    //   testStore.expensive();
    //   await tick();
    //   expect(calculator).toHaveBeenCalledTimes(1);
    // });
  });

  describe("actions", () => {
    test("methods", async () => {
      const testStore = store((state) => ({
        count: 0,
        increment() {
          state.count.set(state.count() + 1);
        },
      }));

      testStore.increment();
      expect(testStore.count()).toBe(1);
    });

    test("external", () => {
      const testStore = store({
        count: 0,
      });

      function incrementStore() {
        testStore.count.set(testStore.count() + 1);
      }

      incrementStore();
      expect(testStore.count()).toBe(1);
    });

    test("batched", () => {
      const testStore = store({
        count: 0,
        name: "test",
      });

      testStore.set({
        count: 1,
        name: "updated",
      });

      expect(testStore.count()).toBe(1);
      expect(testStore.name()).toBe("updated");

      testStore.set((state) => ({
        count: state.count() + 1,
      }));

      expect(testStore.count()).toBe(2);
    });
  });

  describe("cleanup", () => {
    test("signals", () => {
      const testStore = store({
        count: 0,
      });

      testStore.cleanup();
      testStore.count.set(1);
      expect(testStore.count()).toBe(0);
    });

    test("effects", async () => {
      const spy = mock((_?: any) => {});
      const testStore = store({
        count: 0,
      });

      effect(() => spy(testStore.computed()));

      testStore.count.set(1);
      await tick();
      expect(spy).toHaveBeenCalledTimes(1);
      testStore.cleanup();
      await tick();
      testStore.count.set(2);
      await tick();
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe("errors", () => {
    test("undefined", () => {
      const testStore = store({
        count: 0,
      });

      expect(() => {
        // @ts-ignore - Testing runtime error
        testStore.undefined();
      }).toThrow();
    });

    test("disposed store", () => {
      const testStore = store({
        count: 0,
      });

      testStore.cleanup();
      expect(() => {
        testStore.set({ count: 1 });
      }).toThrow("Attempting to update a disposed store");
    });
  });
});
