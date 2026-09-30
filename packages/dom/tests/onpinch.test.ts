import { describe, test, expect, beforeEach, mock } from "bun:test";
import { resetTestState } from "@utils/test-helpers.js";
import { onPinch } from "@hellajs/dom/bundle";
import type { PinchState } from "@hellajs/dom";

const pinchDown = (target: Node, pointerId: number, x = 0, y = 0): void => {
  target.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, pointerId, clientX: x, clientY: y }));
};

const pinchMove = (target: Node, pointerId: number, x: number, y: number): void => {
  target.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, pointerId, clientX: x, clientY: y }));
};

const pinchUp = (target: Node, pointerId: number): void => {
  target.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId }));
};

describe("onPinch", () => {
  beforeEach(() => {
    resetTestState();
  });

  test("requires el, handlers, and onMove", () => {
    const el = document.createElement("div");
    expect(() => onPinch(null as never, { onMove: () => {} })).toThrow("[dom] onPinch: el is required");
    expect(() => onPinch(el, null as never)).toThrow("[dom] onPinch: handlers is required");
    expect(() => onPinch(el, {} as never)).toThrow("[dom] onPinch: onMove is required");
  });

  test("ignores a single pointer moving alone", () => {
    const onStart = mock<(event: PointerEvent) => void>(() => {});
    const onMove = mock<(state: PinchState) => void>(() => {});
    const el = document.createElement("div");
    document.body.append(el);
    const dispose = onPinch(el, { onStart, onMove });

    pinchDown(el, 1, 100, 100);
    pinchMove(el, 1, 140, 60);
    expect(onStart).not.toHaveBeenCalled();
    expect(onMove).not.toHaveBeenCalled();
    dispose();
  });

  test("starts on the second pointerdown and reports unit scale from the baseline", () => {
    const onStart = mock<(event: PointerEvent) => void>(() => {});
    const onMove = mock<(state: PinchState) => void>(() => {});
    const el = document.createElement("div");
    document.body.append(el);
    const dispose = onPinch(el, { onStart, onMove });

    pinchDown(el, 1, 100, 100);
    pinchDown(el, 2, 200, 100);
    pinchMove(el, 2, 200, 100);
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMove).toHaveBeenCalledWith({ scale: 1, dx: 0, dy: 0 });
    dispose();
  });

  test("scales up as the pair spreads and down as it pinches", () => {
    const onMove = mock<(state: PinchState) => void>(() => {});
    const el = document.createElement("div");
    document.body.append(el);
    const dispose = onPinch(el, { onMove });

    pinchDown(el, 1, 100, 100);
    pinchDown(el, 2, 200, 100);
    pinchMove(el, 2, 250, 100);
    expect(onMove).toHaveBeenLastCalledWith({ scale: 1.5, dx: 25, dy: 0 });
    pinchMove(el, 2, 150, 100);
    expect(onMove).toHaveBeenLastCalledWith({ scale: 0.5, dx: -25, dy: 0 });
    dispose();
  });

  test("follows the centroid when both pointers translate", () => {
    const onMove = mock<(state: PinchState) => void>(() => {});
    const el = document.createElement("div");
    document.body.append(el);
    const dispose = onPinch(el, { onMove });

    pinchDown(el, 1, 100, 100);
    pinchDown(el, 2, 200, 100);
    pinchMove(el, 1, 130, 120);
    pinchMove(el, 2, 230, 120);
    expect(onMove).toHaveBeenLastCalledWith({ scale: 1, dx: 30, dy: 20 });
    dispose();
  });

  test("ends once when one tracked pointer lifts and ignores later single-pointer moves", () => {
    const onEnd = mock(() => {});
    const onMove = mock<(state: PinchState) => void>(() => {});
    const el = document.createElement("div");
    document.body.append(el);
    const dispose = onPinch(el, { onMove, onEnd });

    pinchDown(el, 1, 100, 100);
    pinchDown(el, 2, 200, 100);
    pinchUp(el, 2);
    expect(onEnd).toHaveBeenCalledTimes(1);
    pinchMove(el, 1, 140, 60);
    pinchUp(el, 1);
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(onMove).not.toHaveBeenCalled();
    dispose();
  });

  test("keeps the tracked pair stable when a third pointer joins", () => {
    const onStart = mock<(event: PointerEvent) => void>(() => {});
    const onMove = mock<(state: PinchState) => void>(() => {});
    const el = document.createElement("div");
    document.body.append(el);
    const dispose = onPinch(el, { onStart, onMove });

    pinchDown(el, 1, 100, 100);
    pinchDown(el, 2, 200, 100);
    pinchDown(el, 3, 300, 300);
    pinchMove(el, 3, 400, 400);
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onMove).not.toHaveBeenCalled();
    pinchMove(el, 2, 250, 100);
    expect(onMove).toHaveBeenLastCalledWith({ scale: 1.5, dx: 25, dy: 0 });
    dispose();
  });

  test("keeps non-primary buttons and disabled descendants out of the pointer map", () => {
    const onStart = mock<(event: PointerEvent) => void>(() => {});
    const el = document.createElement("div");
    const disabled = document.createElement("button");
    disabled.disabled = true;
    el.append(disabled);
    document.body.append(el);
    const dispose = onPinch(el, { onStart, onMove: () => {} });

    pinchDown(el, 1, 100, 100);
    el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, pointerId: 2, button: 2, clientX: 200, clientY: 100 }));
    pinchDown(disabled, 2, 200, 100);
    expect(onStart).not.toHaveBeenCalled();
    dispose();
  });

  test("stops all wiring after dispose", () => {
    const onStart = mock<(event: PointerEvent) => void>(() => {});
    const onMove = mock<(state: PinchState) => void>(() => {});
    const onEnd = mock(() => {});
    const el = document.createElement("div");
    document.body.append(el);
    const dispose = onPinch(el, { onStart, onMove, onEnd });

    dispose();
    pinchDown(el, 1, 100, 100);
    pinchDown(el, 2, 200, 100);
    pinchMove(el, 2, 250, 100);
    pinchUp(el, 2);
    expect(onStart).not.toHaveBeenCalled();
    expect(onMove).not.toHaveBeenCalled();
    expect(onEnd).not.toHaveBeenCalled();
    dispose();
  });
});
