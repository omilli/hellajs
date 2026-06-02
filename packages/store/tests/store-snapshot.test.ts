import { describe, test, expect, mock } from "bun:test";
import { store } from "@hellajs/store/bundle";

describe("snapshot", () => {
  test("returns plain object with all properties", () => {
    const cart = store({
      items: [{ id: 1 }],
      total: 1.50,
      helper: () => "computed helper"
    });

    const snapshot = cart.snapshot();

    expect(snapshot.items).toEqual([{ id: 1 }]);
    expect(snapshot.total).toBe(1.50);
    expect(snapshot.helper()).toBe("computed helper");
    expect("snapshot" in snapshot).toBe(false);
    expect("computed" in snapshot).toBe(false);
  });

  test("is reactive: effect re-runs on property change", () => {
    const data = store({ name: "Alice", age: 30 });
    let runs = 0;
    let lastSnapshot: { name: string; age: number } | null = null;

    effect(() => {
      lastSnapshot = data.snapshot() as { name: string; age: number };
      runs++;
    });

    expect(runs).toBe(1);
    expect(lastSnapshot!.name).toBe("Alice");

    data.name("Bob");

    expect(runs).toBe(2);
    expect(lastSnapshot!.name).toBe("Bob");
  });

  test("is reactive with deeply nested properties", () => {
    const data = store({
      user: {
        profile: {
          name: "John",
          settings: { theme: "dark" }
        }
      }
    });

    const tracker = mock(() => { });
    let lastSnap: Record<string, unknown> = {};

    effect(() => {
      lastSnap = data.snapshot() as Record<string, unknown>;
      tracker();
    });

    expect(tracker).toHaveBeenCalledTimes(1);
    expect((lastSnap as { user: { profile: { name: string } } }).user.profile.name).toBe("John");

    data.user.profile.settings.theme("light");

    expect(tracker).toHaveBeenCalledTimes(2);
    expect((lastSnap as { user: { profile: { settings: { theme: string } } } }).user.profile.settings.theme).toBe("light");
  });

  test("empty store snapshot", () => {
    const data = store({});
    expect(data.snapshot()).toEqual({});
  });
});
