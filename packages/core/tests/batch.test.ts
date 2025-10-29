import { describe, test, expect } from "bun:test";

describe("batch", () => {
  test("groups multiple signal changes into a single effect", () => {
    const userName = signal("Alice");
    const userAge = signal(25);
    let updateCount = 0;

    effect(() => {
      userName();
      userAge();
      updateCount++;
    });

    expect(updateCount).toBe(1);

    batch(() => {
      userName("Bob");
      userAge(30);
    });

    expect(updateCount).toBe(2);

    expect(userName()).toBe("Bob");
    expect(userAge()).toBe(30);
  });

  test("returns primitive value from batch function", () => {
    const count = signal(0);

    const result = batch(() => {
      count(5);
      return 42;
    });

    expect(result).toBe(42);
    expect(count()).toBe(5);
  });

  test("maintains backward compatibility with void functions", () => {
    const count = signal(0);

    // Should work without return value
    const result = batch(() => {
      count(10);
    });

    expect(result).toBe(undefined);
    expect(count()).toBe(10);
  });

  test("deduplicates subscribers when signal changes multiple times in batch", () => {
    const count = signal(0);
    let effectRuns = 0;

    effect(() => {
      count();
      effectRuns++;
    });

    expect(effectRuns).toBe(1);

    batch(() => {
      count(1);
      count(2);
      count(3);
    });

    expect(effectRuns).toBe(2);
    expect(count()).toBe(3);
  });

  test("handles nested batching correctly", () => {
    const a = signal(0);
    const b = signal(0);
    let runs = 0;

    effect(() => {
      a();
      b();
      runs++;
    });

    expect(runs).toBe(1);

    batch(() => {
      a(1);
      batch(() => {
        b(1);
      });
      a(2);
    });

    expect(runs).toBe(2);
    expect(a()).toBe(2);
    expect(b()).toBe(1);
  });

  test("flush manually triggers batched updates", () => {
    const count = signal(0);
    let runs = 0;

    effect(() => {
      count();
      runs++;
    });

    expect(runs).toBe(1);

    batch(() => {
      count(1);
      expect(runs).toBe(1);
      flush();
      expect(runs).toBe(2);
      count(2);
    });

    expect(runs).toBe(3);
  });
});
