import { describe, test, expect, beforeEach, mock } from "bun:test";
import { resetTestState } from "@utils/test-helpers.js";
import { onDrag } from "@hellajs/dom/bundle";
import { pointerDown, pointerMove, pointerUp, pointerCancel } from "./helpers";

describe("onDrag", () => {
  beforeEach(() => {
    resetTestState();
  });

  test("emits cumulative deltas from the drag start", () => {
    const onStart = mock<(event: PointerEvent) => void>(() => {});
    const onMove = mock<(delta: { dx: number; dy: number; event: PointerEvent }) => void>(() => {});
    const el = document.createElement("div");
    document.body.append(el);
    const dispose = onDrag(el, { onStart, onMove });

    pointerDown(el);
    pointerMove(el, 5, 7);
    pointerMove(el, 8, 9);
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onMove).toHaveBeenCalledTimes(2);
    expect(onMove).toHaveBeenCalledWith({ dx: 5, dy: 7, event: expect.anything() });
    expect(onMove).toHaveBeenCalledWith({ dx: 8, dy: 9, event: expect.anything() });
    dispose();
  });

  test("fires onEnd on pointerup", () => {
    const onEnd = mock(() => {});
    const onMove = mock(() => {});
    const el = document.createElement("div");
    document.body.append(el);
    const dispose = onDrag(el, { onMove, onEnd });

    pointerDown(el);
    pointerMove(el, 3, 3);
    pointerUp(el);
    expect(onEnd).toHaveBeenCalledTimes(1);
    pointerMove(el, 6, 6);
    expect(onMove).toHaveBeenCalledTimes(1);
    dispose();
  });

  test("fires onEnd on pointercancel", () => {
    const onEnd = mock(() => {});
    const el = document.createElement("div");
    document.body.append(el);
    const dispose = onDrag(el, { onMove: () => {}, onEnd });

    pointerDown(el);
    pointerCancel(el);
    expect(onEnd).toHaveBeenCalledTimes(1);
    dispose();
  });

  test("stops all wiring after dispose", () => {
    const onStart = mock(() => {});
    const onMove = mock(() => {});
    const onEnd = mock(() => {});
    const el = document.createElement("div");
    document.body.append(el);
    const dispose = onDrag(el, { onStart, onMove, onEnd });

    dispose();
    pointerDown(el);
    pointerMove(el, 5, 5);
    pointerUp(el);
    expect(onStart).not.toHaveBeenCalled();
    expect(onMove).not.toHaveBeenCalled();
    expect(onEnd).not.toHaveBeenCalled();
  });

  test("ignores move events before a drag starts", () => {
    const onMove = mock(() => {});
    const el = document.createElement("div");
    document.body.append(el);
    const dispose = onDrag(el, { onMove });

    pointerMove(el, 5, 5);
    expect(onMove).not.toHaveBeenCalled();
    dispose();
  });

  test("ignores non-primary buttons", () => {
    const onStart = mock(() => {});
    const onMove = mock(() => {});
    const el = document.createElement("div");
    document.body.append(el);
    const dispose = onDrag(el, { onStart, onMove });

    el.dispatchEvent(new PointerEvent("pointerdown", { button: 2, bubbles: true }));
    pointerMove(el, 5, 5);
    expect(onStart).not.toHaveBeenCalled();
    expect(onMove).not.toHaveBeenCalled();
    dispose();
  });

  test("ignores pointerdown on disabled descendants", () => {
    const onStart = mock(() => {});
    const onMove = mock(() => {});
    const el = document.createElement("div");
    const disabled = document.createElement("button");
    disabled.disabled = true;
    el.append(disabled);
    document.body.append(el);
    const dispose = onDrag(el, { onStart, onMove });

    pointerDown(disabled);
    pointerMove(el, 5, 5);
    expect(onStart).not.toHaveBeenCalled();
    expect(onMove).not.toHaveBeenCalled();
    dispose();
  });

  test("requires el, handlers, and onMove", () => {
    const el = document.createElement("div");
    expect(() => onDrag(null as never, { onMove: () => {} })).toThrow("[dom] onDrag: el is required");
    expect(() => onDrag(el, null as never)).toThrow("[dom] onDrag: handlers is required");
    expect(() => onDrag(el, {} as never)).toThrow("[dom] onDrag: onMove is required");
  });
});
