import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { onLongPress } from "@hellajs/headless";
import { pointerDown, pointerMove, pointerUp, pointerCancel } from "./helpers";

describe("onLongPress", () => {
  beforeEach(() => {
    resetTestState();
  });

  test("fires the handler once with the pointerdown event after the default duration", async () => {
    const handler = vi.fn<(event: PointerEvent) => void>(() => {});
    const el = document.createElement("div");
    document.body.append(el);
    const dispose = onLongPress(el, handler);

    const down = new PointerEvent("pointerdown", { bubbles: true });
    el.dispatchEvent(down);
    expect(handler).not.toHaveBeenCalled();
    await delay(560);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(down);
    dispose();
  });

  test("fires nothing when released before the duration", async () => {
    const handler = vi.fn<(event: PointerEvent) => void>(() => {});
    const el = document.createElement("div");
    document.body.append(el);
    const dispose = onLongPress(el, handler, { duration: 5 });

    pointerDown(el);
    await delay(2);
    pointerUp(el);
    pointerMove(el, 3, 0);
    await delay(20);
    expect(handler).not.toHaveBeenCalled();
    dispose();
  });

  test("cancels when the pointer drifts beyond tolerance", async () => {
    const handler = vi.fn<(event: PointerEvent) => void>(() => {});
    const el = document.createElement("div");
    document.body.append(el);
    const dispose = onLongPress(el, handler, { duration: 10, tolerance: 8 });

    pointerDown(el);
    pointerMove(el, 20, 0);
    await delay(30);
    expect(handler).not.toHaveBeenCalled();
    dispose();
  });

  test("cancels on pointercancel", async () => {
    const handler = vi.fn<(event: PointerEvent) => void>(() => {});
    const el = document.createElement("div");
    document.body.append(el);
    const dispose = onLongPress(el, handler, { duration: 5 });

    pointerDown(el);
    pointerCancel(el);
    await delay(30);
    expect(handler).not.toHaveBeenCalled();
    dispose();
  });

  test("honors a custom duration", async () => {
    const short = vi.fn<(event: PointerEvent) => void>(() => {});
    const long = vi.fn<(event: PointerEvent) => void>(() => {});
    const fast = document.createElement("div");
    const slow = document.createElement("div");
    document.body.append(fast, slow);
    const disposeFast = onLongPress(fast, short, { duration: 5 });
    const disposeSlow = onLongPress(slow, long);

    pointerDown(fast);
    pointerDown(slow);
    await delay(20);
    expect(short).toHaveBeenCalledTimes(1);
    expect(long).not.toHaveBeenCalled();
    disposeFast();
    disposeSlow();
  });

  test("ignores non-primary buttons and disabled descendants", async () => {
    const handler = vi.fn<(event: PointerEvent) => void>(() => {});
    const el = document.createElement("div");
    const disabled = document.createElement("button");
    disabled.disabled = true;
    el.append(disabled);
    document.body.append(el);
    const dispose = onLongPress(el, handler, { duration: 5 });

    el.dispatchEvent(new PointerEvent("pointerdown", { button: 2, bubbles: true }));
    pointerUp(el);
    pointerDown(disabled);
    pointerUp(disabled);
    await delay(30);
    expect(handler).not.toHaveBeenCalled();
    dispose();
  });

  test("dispose clears the pending timer", async () => {
    const handler = vi.fn<(event: PointerEvent) => void>(() => {});
    const el = document.createElement("div");
    document.body.append(el);
    const dispose = onLongPress(el, handler, { duration: 5 });

    pointerDown(el);
    dispose();
    await delay(30);
    expect(handler).not.toHaveBeenCalled();
  });

  test("requires el and handler", () => {
    const el = document.createElement("div");
    expect(() => onLongPress(null as never, () => {})).toThrow(
      "[headless] onLongPress: el is required",
    );
    expect(() => onLongPress(el, null as never)).toThrow(
      "[headless] onLongPress: handler is required",
    );
  });
});
