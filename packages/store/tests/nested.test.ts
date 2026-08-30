import { describe, test, expect, mock } from "bun:test";
import { effect } from "@hellajs/core";
import { store } from "@hellajs/store/bundle";

describe("store", () => {
  describe("nested", () => {
    test("reads properties through composed store", () => {
      const userStore = store({
        name: "John Doe",
        email: "john@example.com",
        preferences: {
          theme: "dark",
          language: "en"
        }
      });

      const uiStore = store({
        sidebarOpen: false,
        activeTab: "dashboard"
      });

      const appStore = store({
        user: userStore,
        ui: uiStore
      });

      expect(appStore.user.name()).toBe("John Doe");
      expect(appStore.user.email()).toBe("john@example.com");
      expect(appStore.user.preferences.theme()).toBe("dark");
      expect(appStore.ui.sidebarOpen()).toBe(false);
      expect(appStore.ui.activeTab()).toBe("dashboard");
    });

    test("writes propagate from composed store to original", () => {
      const userStore = store({
        name: "John Doe",
        preferences: {
          theme: "dark"
        }
      });

      const uiStore = store({
        sidebarOpen: false
      });

      const appStore = store({
        user: userStore,
        ui: uiStore
      });

      appStore.user.name("Jane Doe");
      appStore.user.preferences.theme("light");
      appStore.ui.sidebarOpen(true);

      expect(appStore.user.name()).toBe("Jane Doe");
      expect(appStore.user.preferences.theme()).toBe("light");
      expect(appStore.ui.sidebarOpen()).toBe(true);

      expect(userStore.name()).toBe("Jane Doe");
      expect(uiStore.sidebarOpen()).toBe(true);
    });

    test("writes propagate from original store to composed store", () => {
      const userStore = store({
        email: "john@example.com"
      });

      const appStore = store({
        user: userStore
      });

      userStore.email("jane@example.com");
      expect(appStore.user.email()).toBe("jane@example.com");
    });

    test("snapshot on composed store flattens nested stores", () => {
      const userStore = store({ name: "Alice" });
      const settingsStore = store({ theme: "dark" });

      const appStore = store({
        user: userStore,
        settings: settingsStore
      });

      const snap = appStore.snapshot();

      expect(snap.user.name).toBe("Alice");
      expect(snap.settings.theme).toBe("dark");
    });

    test("update on composed store propagates to nested stores", () => {
      const userStore = store({ name: "Alice", age: 30 });
      const appStore = store({ user: userStore });

      // @ts-expect-error composed-store partial: PartialDeep recurses and types name as Signal<string>, but the draft path accepts the plain value
      appStore.update({ user: { name: "Bob" } });

      expect(appStore.user.name()).toBe("Bob");
      expect(appStore.user.age()).toBe(30);
      expect(userStore.name()).toBe("Bob");
      expect(userStore.age()).toBe(30);
    });

    test("update with draft mutator on composed store", () => {
      const userStore = store({ name: "Alice" });
      const appStore = store({ user: userStore });

      appStore.update(draft => {
        draft.user.name = "Bob";
      });

      expect(appStore.user.name()).toBe("Bob");
      expect(userStore.name()).toBe("Bob");
    });

    test("cleanup on composed store cleans up nested stores", () => {
      const inner = store({ value: "a", nested: { count: 0 } });
      const outer = store({ inner });

      const nestedCleaned = mock(() => {});
      const origCleanup = outer.inner.nested.cleanup;
      // Store methods are non-writable — redefine via defineProperty to spy (configurable stays true)
      Object.defineProperty(outer.inner.nested, "cleanup", {
        value: function () {
          nestedCleaned();
          origCleanup.call(this);
        },
        writable: false,
        enumerable: true,
        configurable: true
      });

      outer.cleanup();

      expect(nestedCleaned).toHaveBeenCalledTimes(1);
    });

    test("cleanup on composed store is idempotent", () => {
      const inner = store({ x: 1 });
      const outer = store({ inner });

      expect(() => {
        outer.cleanup();
        outer.cleanup();
      }).not.toThrow();
    });

    test("composed pre-configured readonly store keeps readonly inside a writable parent", () => {
      const readonlyUser = store({ name: "Alice" }, { readonly: true });
      const appStore = store({ user: readonlyUser });

      // @ts-expect-error user retains its own readonly config under composition
      expect(() => appStore.user.name("Bob")).toThrow('[store] readonly key "name"');

      expect(appStore.user.name()).toBe("Alice");
    });

    test("composed writable store stays writable inside a readonly: true parent", () => {
      const userStore = store({ name: "Alice" });
      const appStore = store({ user: userStore }, { readonly: true });

      appStore.user.name("Bob");

      expect(appStore.user.name()).toBe("Bob");
      expect(userStore.name()).toBe("Bob"); // same signal reference — adoption keeps signals
    });

    test("snapshot is reactive across composed stores", () => {
      const userStore = store({ name: "Alice" });
      const appStore = store({ user: userStore });
      const tracker = mock(() => {});

      effect(() => {
        appStore.snapshot();
        tracker();
      });

      expect(tracker).toHaveBeenCalledTimes(1);

      userStore.name("Bob");

      expect(tracker).toHaveBeenCalledTimes(2);
    });
  });
});
