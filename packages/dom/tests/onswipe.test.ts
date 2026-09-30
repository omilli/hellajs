import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { resetTestState } from "@utils/test-helpers.js";
import { onSwipe } from "@hellajs/dom/bundle";
import type { SwipeCommit, SwipeState } from "@hellajs/dom";
import { pointerDown, pointerMove, pointerUp } from "./helpers";

type SwipeCase = [number, number, SwipeCommit["direction"]];

describe("onSwipe", () => {
  const originalNow = performance.now;
  let now = 0;

  beforeEach(() => {
    resetTestState();
    now = 0;
    performance.now = () => now;
  });

  afterEach(() => {
    performance.now = originalNow;
  });

  test("fires onStart on primary pointerdown", () => {
    const onStart = mock<(event: PointerEvent) => void>(() => {});
    const el = document.createElement("div");
    document.body.append(el);
    const dispose = onSwipe(el, { onStart, onMove: () => {} });

    pointerDown(el);
    expect(onStart).toHaveBeenCalledTimes(1);
    dispose();
  });

  test("ignores non-primary buttons", () => {
    const onStart = mock<(event: PointerEvent) => void>(() => {});
    const onMove = mock<(state: SwipeState) => void>(() => {});
    const el = document.createElement("div");
    document.body.append(el);
    const dispose = onSwipe(el, { onStart, onMove });

    el.dispatchEvent(new PointerEvent("pointerdown", { button: 2, bubbles: true }));
    pointerMove(el, 60, 0);
    pointerUp(el);
    expect(onStart).not.toHaveBeenCalled();
    expect(onMove).not.toHaveBeenCalled();
    dispose();
  });

  test("ignores pointerdown on disabled descendants", () => {
    const onStart = mock<(event: PointerEvent) => void>(() => {});
    const onMove = mock<(state: SwipeState) => void>(() => {});
    const el = document.createElement("div");
    const disabled = document.createElement("button");
    disabled.disabled = true;
    el.append(disabled);
    document.body.append(el);
    const dispose = onSwipe(el, { onStart, onMove });

    pointerDown(disabled);
    pointerMove(el, 60, 0);
    expect(onStart).not.toHaveBeenCalled();
    expect(onMove).not.toHaveBeenCalled();
    dispose();
  });

  test("reports cumulative deltas across moves", () => {
    const onMove = mock<(state: SwipeState) => void>(() => {});
    const el = document.createElement("div");
    document.body.append(el);
    const dispose = onSwipe(el, { onMove });

    pointerDown(el);
    pointerMove(el, 5, 7);
    pointerMove(el, 8, 9);
    expect(onMove).toHaveBeenCalledTimes(2);
    expect(onMove).toHaveBeenCalledWith({ dx: 5, dy: 7, event: expect.anything() });
    expect(onMove).toHaveBeenCalledWith({ dx: 8, dy: 9, event: expect.anything() });
    dispose();
  });

  test.each([
    [60, 0, "right"],
    [-60, 0, "left"],
    [0, 60, "down"],
    [0, -60, "up"]
  ] as SwipeCase[])("commits a dominant-axis release past the threshold toward %s", (dx, dy, direction) => {
    const onCommit = mock<(info: SwipeCommit) => void>(() => {});
    const onCancel = mock(() => {});
    const el = document.createElement("div");
    document.body.append(el);
    const dispose = onSwipe(el, { onMove: () => {}, onCommit, onCancel });

    pointerDown(el);
    pointerMove(el, dx, dy);
    pointerUp(el);
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith({ direction, dx, dy });
    expect(onCancel).not.toHaveBeenCalled();
    dispose();
  });

  test("cancels a release below threshold with low velocity", () => {
    const onCommit = mock<(info: SwipeCommit) => void>(() => {});
    const onCancel = mock(() => {});
    const el = document.createElement("div");
    document.body.append(el);
    const dispose = onSwipe(el, { onMove: () => {}, onCommit, onCancel });

    pointerDown(el);
    now = 90;
    pointerMove(el, 10, 0);
    pointerUp(el);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onCommit).not.toHaveBeenCalled();
    dispose();
  });

  test("commits a below-threshold release whose velocity crosses a custom floor", () => {
    const onCommit = mock<(info: SwipeCommit) => void>(() => {});
    const onCancel = mock(() => {});
    const el = document.createElement("div");
    document.body.append(el);
    const dispose = onSwipe(el, { onMove: () => {}, onCommit, onCancel }, { velocity: 0.1 });

    pointerDown(el);
    now = 90;
    pointerMove(el, 30, 0);
    pointerUp(el);
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith({ direction: "right", dx: 30, dy: 0 });
    expect(onCancel).not.toHaveBeenCalled();
    dispose();
  });

  test("cancels when the distance stays under a custom threshold", () => {
    const onCommit = mock<(info: SwipeCommit) => void>(() => {});
    const onCancel = mock(() => {});
    const el = document.createElement("div");
    document.body.append(el);
    const dispose = onSwipe(el, { onMove: () => {}, onCommit, onCancel }, { threshold: 100 });

    pointerDown(el);
    now = 200;
    pointerMove(el, 60, 0);
    pointerUp(el);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onCommit).not.toHaveBeenCalled();
    dispose();
  });

  test("stops all wiring after dispose", () => {
    const onStart = mock<(event: PointerEvent) => void>(() => {});
    const onMove = mock<(state: SwipeState) => void>(() => {});
    const onCommit = mock<(info: SwipeCommit) => void>(() => {});
    const onCancel = mock(() => {});
    const el = document.createElement("div");
    document.body.append(el);
    const dispose = onSwipe(el, { onStart, onMove, onCommit, onCancel });

    dispose();
    pointerDown(el);
    pointerMove(el, 60, 0);
    pointerUp(el);
    expect(onStart).not.toHaveBeenCalled();
    expect(onMove).not.toHaveBeenCalled();
    expect(onCommit).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
    dispose();
  });

  test("requires el, handlers, and onMove", () => {
    const el = document.createElement("div");
    expect(() => onSwipe(null as never, { onMove: () => {} })).toThrow("[dom] onSwipe: el is required");
    expect(() => onSwipe(el, null as never)).toThrow("[dom] onSwipe: handlers is required");
    expect(() => onSwipe(el, {} as never)).toThrow("[dom] onSwipe: onMove is required");
  });
});
