import { describe, test, expect, beforeEach, mock } from "bun:test";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { onDoubleTap } from "@hellajs/dom/bundle";
import { pointerDown, pointerUp, pointerCancel } from "./helpers";

describe("onDoubleTap", () => {
  beforeEach(() => {
    resetTestState();
  });

  test("fires onDoubleTap once with the second tap's event when two taps land within the interval", () => {
    const onDouble = mock<(event: PointerEvent) => void>(() => {});
    const el = document.createElement("div");
    document.body.append(el);
    const dispose = onDoubleTap(el, { onDoubleTap: onDouble, interval: 50 });

    pointerDown(el);
    pointerUp(el);
    pointerDown(el);
    const second = new PointerEvent("pointerup", { bubbles: true });
    el.dispatchEvent(second);
    expect(onDouble).toHaveBeenCalledTimes(1);
    expect(onDouble).toHaveBeenCalledWith(second);
    dispose();
  });

  test("fires nothing when one tap lands and no onSingleTap is provided", async () => {
    const onDouble = mock<(event: PointerEvent) => void>(() => {});
    const el = document.createElement("div");
    document.body.append(el);
    const dispose = onDoubleTap(el, { onDoubleTap: onDouble, interval: 5 });

    pointerDown(el);
    pointerUp(el);
    await delay(20);
    expect(onDouble).not.toHaveBeenCalled();
    dispose();
  });

  test("fires onSingleTap once with the first tap's event after the interval", async () => {
    const onDouble = mock<(event: PointerEvent) => void>(() => {});
    const onSingle = mock<(event: PointerEvent) => void>(() => {});
    const el = document.createElement("div");
    document.body.append(el);
    const dispose = onDoubleTap(el, { onDoubleTap: onDouble, onSingleTap: onSingle, interval: 5 });

    pointerDown(el);
    const first = new PointerEvent("pointerup", { bubbles: true });
    el.dispatchEvent(first);
    expect(onSingle).not.toHaveBeenCalled();
    await delay(20);
    expect(onSingle).toHaveBeenCalledTimes(1);
    expect(onSingle).toHaveBeenCalledWith(first);
    dispose();
  });

  test("a double tap suppresses the pending single tap", async () => {
    const onDouble = mock<(event: PointerEvent) => void>(() => {});
    const onSingle = mock<(event: PointerEvent) => void>(() => {});
    const el = document.createElement("div");
    document.body.append(el);
    const dispose = onDoubleTap(el, { onDoubleTap: onDouble, onSingleTap: onSingle, interval: 5 });

    pointerDown(el);
    pointerUp(el);
    pointerDown(el);
    pointerUp(el);
    await delay(20);
    expect(onDouble).toHaveBeenCalledTimes(1);
    expect(onSingle).not.toHaveBeenCalled();
    dispose();
  });

  test("taps spaced beyond the interval count as two single taps", async () => {
    const onDouble = mock<(event: PointerEvent) => void>(() => {});
    const onSingle = mock<(event: PointerEvent) => void>(() => {});
    const el = document.createElement("div");
    document.body.append(el);
    const dispose = onDoubleTap(el, { onDoubleTap: onDouble, onSingleTap: onSingle, interval: 5 });

    pointerDown(el);
    pointerUp(el);
    await delay(20);
    expect(onSingle).toHaveBeenCalledTimes(1);
    pointerDown(el);
    pointerUp(el);
    await delay(20);
    expect(onSingle).toHaveBeenCalledTimes(2);
    expect(onDouble).not.toHaveBeenCalled();
    dispose();
  });

  test("a tap whose pointerup drifts beyond the tolerance does not count", async () => {
    const onDouble = mock<(event: PointerEvent) => void>(() => {});
    const onSingle = mock<(event: PointerEvent) => void>(() => {});
    const el = document.createElement("div");
    document.body.append(el);
    const dispose = onDoubleTap(el, { onDoubleTap: onDouble, onSingleTap: onSingle, interval: 50 });

    pointerDown(el);
    el.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: 20, clientY: 0 }));
    pointerDown(el);
    el.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: 20, clientY: 0 }));
    await delay(70);
    expect(onDouble).not.toHaveBeenCalled();
    expect(onSingle).not.toHaveBeenCalled();
    dispose();
  });

  test("pointercancel voids the in-flight tap", async () => {
    const onDouble = mock<(event: PointerEvent) => void>(() => {});
    const onSingle = mock<(event: PointerEvent) => void>(() => {});
    const el = document.createElement("div");
    document.body.append(el);
    const dispose = onDoubleTap(el, { onDoubleTap: onDouble, onSingleTap: onSingle, interval: 5 });

    pointerDown(el);
    pointerCancel(el);
    pointerUp(el);
    await delay(20);
    expect(onDouble).not.toHaveBeenCalled();
    expect(onSingle).not.toHaveBeenCalled();
    dispose();
  });

  test("ignores non-primary buttons and disabled descendants", async () => {
    const onDouble = mock<(event: PointerEvent) => void>(() => {});
    const onSingle = mock<(event: PointerEvent) => void>(() => {});
    const el = document.createElement("div");
    const disabled = document.createElement("button");
    disabled.disabled = true;
    el.append(disabled);
    document.body.append(el);
    const dispose = onDoubleTap(el, { onDoubleTap: onDouble, onSingleTap: onSingle, interval: 5 });

    el.dispatchEvent(new PointerEvent("pointerdown", { button: 2, bubbles: true }));
    pointerUp(el);
    pointerDown(disabled);
    pointerUp(disabled);
    await delay(20);
    expect(onDouble).not.toHaveBeenCalled();
    expect(onSingle).not.toHaveBeenCalled();
    dispose();
  });

  test("dispose clears the pending single tap", async () => {
    const onDouble = mock<(event: PointerEvent) => void>(() => {});
    const onSingle = mock<(event: PointerEvent) => void>(() => {});
    const el = document.createElement("div");
    document.body.append(el);
    const dispose = onDoubleTap(el, { onDoubleTap: onDouble, onSingleTap: onSingle, interval: 5 });

    pointerDown(el);
    pointerUp(el);
    dispose();
    await delay(20);
    expect(onDouble).not.toHaveBeenCalled();
    expect(onSingle).not.toHaveBeenCalled();
  });

  test("requires el, options, and onDoubleTap", () => {
    const el = document.createElement("div");
    expect(() => onDoubleTap(null as never, { onDoubleTap: () => {} })).toThrow("[dom] onDoubleTap: el is required");
    expect(() => onDoubleTap(el, null as never)).toThrow("[dom] onDoubleTap: options is required");
    expect(() => onDoubleTap(el, { onDoubleTap: null as never })).toThrow("[dom] onDoubleTap: onDoubleTap is required");
  });
});
