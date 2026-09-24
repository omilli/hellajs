import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { hoverIntent } from "@hellajs/dom/bundle";
import { pointerDown, pointerEnter, pointerLeave } from "./helpers";

describe("hoverIntent", () => {
  let now: number;
  let originalNow: () => number;

  beforeEach(() => {
    resetTestState();
    originalNow = Date.now;
    now = originalNow();
    Date.now = () => now;
  });

  afterEach(() => {
    Date.now = originalNow;
  });

  test("opens after the open delay", async () => {
    const onOpen = mock(() => {});
    const onClose = mock(() => {});
    const trigger = document.createElement("button");
    document.body.append(trigger);
    const dispose = hoverIntent(trigger, { onOpen, onClose, openDelay: 5, closeDelay: 5 });

    pointerEnter(trigger);
    expect(onOpen).not.toHaveBeenCalled();
    await delay(30);
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    dispose();
  });

  test("cancels the open when the pointer leaves early", async () => {
    const onOpen = mock(() => {});
    const trigger = document.createElement("button");
    document.body.append(trigger);
    const dispose = hoverIntent(trigger, { onOpen, onClose: onOpen, openDelay: 5, closeDelay: 5 });

    pointerEnter(trigger);
    pointerLeave(trigger);
    await delay(30);
    expect(onOpen).not.toHaveBeenCalled();
    dispose();
  });

  test("honors the close delay after leave", async () => {
    const onOpen = mock(() => {});
    const onClose = mock(() => {});
    const trigger = document.createElement("button");
    document.body.append(trigger);
    const dispose = hoverIntent(trigger, { onOpen, onClose, openDelay: 5, closeDelay: 5 });

    pointerEnter(trigger);
    await delay(30);
    pointerLeave(trigger);
    expect(onClose).not.toHaveBeenCalled();
    await delay(30);
    expect(onClose).toHaveBeenCalledTimes(1);
    dispose();
  });

  test("closes immediately on an outside pointerdown", async () => {
    const onOpen = mock(() => {});
    const onClose = mock(() => {});
    const trigger = document.createElement("button");
    const inside = document.createElement("div");
    document.body.append(trigger, inside);
    const dispose = hoverIntent(trigger, { onOpen, onClose, openDelay: 5, closeDelay: 5 });

    pointerEnter(trigger);
    await delay(30);
    pointerDown(inside);
    expect(onClose).toHaveBeenCalledTimes(1);
    await delay(30);
    expect(onClose).toHaveBeenCalledTimes(1);
    dispose();
  });

  test("fires onOpen instantly within the shared skip-delay window", async () => {
    const onOpen = mock(() => {});
    const onClose = mock(() => {});
    const trigger = document.createElement("button");
    document.body.append(trigger);
    const dispose = hoverIntent(trigger, { onOpen, onClose, openDelay: 5, closeDelay: 5 });

    pointerEnter(trigger);
    await delay(30);
    pointerLeave(trigger);
    await delay(30);
    now += 100;
    pointerEnter(trigger);
    expect(onOpen).toHaveBeenCalledTimes(2);
    dispose();
  });

  test("delays again once the skip-delay window has passed", async () => {
    const onOpen = mock(() => {});
    const onClose = mock(() => {});
    const trigger = document.createElement("button");
    document.body.append(trigger);
    const dispose = hoverIntent(trigger, { onOpen, onClose, openDelay: 5, closeDelay: 5 });

    pointerEnter(trigger);
    await delay(30);
    pointerLeave(trigger);
    await delay(30);
    now += 600;
    pointerEnter(trigger);
    expect(onOpen).toHaveBeenCalledTimes(1);
    await delay(30);
    expect(onOpen).toHaveBeenCalledTimes(2);
    dispose();
  });

  test("opens on focus and closes on blur", async () => {
    const onOpen = mock(() => {});
    const onClose = mock(() => {});
    const trigger = document.createElement("button");
    document.body.append(trigger);
    const dispose = hoverIntent(trigger, { onOpen, onClose, openDelay: 5, closeDelay: 5 });

    trigger.dispatchEvent(new FocusEvent("focus"));
    await delay(30);
    expect(onOpen).toHaveBeenCalledTimes(1);
    trigger.dispatchEvent(new FocusEvent("blur"));
    await delay(30);
    expect(onClose).toHaveBeenCalledTimes(1);
    dispose();
  });

  test("requires target and handlers", () => {
    const el = document.createElement("div");
    expect(() => hoverIntent(null as never, { onOpen: () => {}, onClose: () => {} })).toThrow("[dom] hoverIntent: target is required");
    expect(() => hoverIntent(el, null as never)).toThrow("[dom] hoverIntent: handlers is required");
  });
});
