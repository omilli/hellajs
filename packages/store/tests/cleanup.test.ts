import { describe, test, expect, mock } from "bun:test";
import { effect } from "@hellajs/core";
import { store } from "@hellajs/store/bundle";

describe("store", () => {
describe("cleanup", () => {
  test("calls nested store cleanup methods", () => {
    const data = store({
      level1: { level2: { value: "deep" } }
    });

    const level1Cleaned = mock(() => {});
    const level2Cleaned = mock(() => {});

    const originalLevel1Cleanup = data.level1.cleanup;
    const originalLevel2Cleanup = data.level1.level2.cleanup;

    data.level1.cleanup = function () {
      level1Cleaned();
      originalLevel1Cleanup.call(this);
    };

    data.level1.level2.cleanup = function () {
      level2Cleaned();
      originalLevel2Cleanup.call(this);
    };

    data.cleanup();

    expect(level1Cleaned).toHaveBeenCalledTimes(1);
    expect(level2Cleaned).toHaveBeenCalledTimes(1);
  });

  test("signals remain usable after cleanup", () => {
    const data = store({ count: 0, nested: { value: "a" } });

    data.cleanup();

    data.count(99);
    expect(data.count()).toBe(99);
  });

  test("cleanup does not dispose individual signals: effects still fire", () => {
    const data = store({ nested: { count: 0 } });
    const tracker = mock(() => { });

    effect(() => {
      data.nested.count();
      tracker();
    });

    expect(tracker).toHaveBeenCalledTimes(1);

    data.nested.count(1);
    expect(tracker).toHaveBeenCalledTimes(2);

    // Cleanup only disposes nested store references, not individual signals
    data.cleanup();

    data.nested.count(2);
    // Signal still works: effect still fires
    expect(tracker).toHaveBeenCalledTimes(3);
  });

  test("cleanup is idempotent", () => {
    const data = store({ nested: { value: "a" } });

    expect(() => {
      data.cleanup();
      data.cleanup();
      data.cleanup();
    }).not.toThrow();
  });

  test("cleanup on flat (non-nested) store", () => {
    const data = store({ x: 1, y: 2 });
    expect(() => data.cleanup()).not.toThrow();
    expect(data.x()).toBe(1);
  });
});
});
