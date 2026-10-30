import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { flush, signal } from "@hellajs/core";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { mount, peekState } from "@hellajs/dom";
import { inputOtp } from "@hellajs/headless";

beforeEach(() => {
  resetTestState();
});

/** Mounts a rendered node into a fresh body container and returns its root element. */
function mountPart(node: JSX.Element): HTMLElement {
  const container = document.createElement("div");
  document.body.append(container);
  mount(node, container);
  return container.firstElementChild as HTMLElement;
}

/** Polls (microtask hops) until the observer-driven mount walk has wired the node's hooks. */
async function awaitWiring(root: HTMLElement): Promise<void> {
  for (let i = 0; i < 50; i++) {
    if (peekState(root)?.isMounted) return;
    await delay();
  }
  expect(peekState(root)?.isMounted).toBe(true);
}

/** The transparent single-input control inside the rendered root. */
function control(root: HTMLElement): HTMLInputElement {
  return root.querySelector<HTMLInputElement>("[data-input-otp]")!;
}

function slotsOf(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>("[data-slot='input-otp-slot']"));
}

function activeSlot(root: HTMLElement): number {
  return slotsOf(root).findIndex((slot) => slot.hasAttribute("data-active"));
}

/** Mounts the root with `count` slots and returns the wired root, its input, and its slots. */
async function mountOtp(
  parts: ReturnType<typeof inputOtp>,
  count = 6,
): Promise<{ root: HTMLElement; input: HTMLInputElement; slots: HTMLElement[] }> {
  const slots: JSX.Element[] = [];
  let i = 0;
  while (i < count) {
    slots.push(parts.Slot({ index: i }));
    i++;
  }
  const root = mountPart(parts.Root({ children: parts.Group({ children: slots }) }));
  await awaitWiring(root);
  return { root, input: control(root), slots: slotsOf(root) };
}

/** Emulates the browser-side result of a native edit: value and selection already moved, then the events fire. */
function edit(input: HTMLInputElement, value: string, caret: number): void {
  input.value = value;
  input.setSelectionRange(caret, caret);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  document.dispatchEvent(new Event("selectionchange"));
}

/** Delivers a paste of `text` at the input's current selection. */
function paste(input: HTMLInputElement, text: string): ClipboardEvent {
  const transfer = new DataTransfer();
  transfer.setData("text/plain", text);
  const event = new ClipboardEvent("paste", {
    bubbles: true,
    cancelable: true,
    clipboardData: transfer,
  });
  input.dispatchEvent(event);
  return event;
}

describe("inputOtp", () => {
  test("typing fills slots in order and advances the active slot", async () => {
    const onValueChange = vi.fn((value: string) => value);
    const onComplete = vi.fn((value: string) => value);
    const parts = inputOtp({ onValueChange, onComplete });
    const { root, input, slots } = await mountOtp(parts);
    input.focus();
    edit(input, "1", 1);
    expect(slots[0]!.textContent).toBe("1");
    expect(activeSlot(root)).toBe(1);
    edit(input, "12", 2);
    expect(slots[1]!.textContent).toBe("2");
    expect(activeSlot(root)).toBe(2);
    edit(input, "123456", 6);
    expect(slots.map((slot) => slot.textContent)).toEqual(["1", "2", "3", "4", "5", "6"]);
    expect(onValueChange).toHaveBeenCalledTimes(3);
    expect(onValueChange.mock.calls.map((call) => call[0])).toEqual(["1", "12", "123456"]);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0]).toEqual(["123456"]);
  });

  test("backspace clears the active slot and retreats", async () => {
    const onValueChange = vi.fn((value: string) => value);
    const parts = inputOtp({ onValueChange });
    const { root, input, slots } = await mountOtp(parts);
    input.focus();
    edit(input, "12", 2);
    onValueChange.mockClear();
    edit(input, "1", 1);
    expect(slots[0]!.textContent).toBe("1");
    expect(slots[1]!.textContent).toBe("");
    expect(activeSlot(root)).toBe(1);
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls[0]).toEqual(["1"]);
  });

  test("paste fills from the focused slot and reports the merged code", async () => {
    const onValueChange = vi.fn((value: string) => value);
    const onComplete = vi.fn((value: string) => value);
    const parts = inputOtp({ onValueChange, onComplete });
    const { root, input, slots } = await mountOtp(parts);
    input.focus();
    edit(input, "12", 2);
    onValueChange.mockClear();
    onComplete.mockClear();
    const event = paste(input, "3456");
    expect(event.defaultPrevented).toBe(true);
    expect(input.value).toBe("123456");
    expect(slots.map((slot) => slot.textContent)).toEqual(["1", "2", "3", "4", "5", "6"]);
    expect(activeSlot(root)).toBe(5);
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls[0]).toEqual(["123456"]);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  test("a controlled value accessor reports edits and follows external writes", async () => {
    const value = signal("");
    const onValueChange = vi.fn((next: string) => next);
    const parts = inputOtp({ value: () => value(), onValueChange });
    const { input, slots } = await mountOtp(parts);
    input.focus();
    edit(input, "1", 1);
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls[0]).toEqual(["1"]);
    value("998877");
    flush();
    expect(input.value).toBe("998877");
    expect(slots.map((slot) => slot.textContent)).toEqual(["9", "9", "8", "8", "7", "7"]);
  });

  test("focus marks the caret slot active and blur clears it", async () => {
    const parts = inputOtp({});
    const { root, input, slots } = await mountOtp(parts);
    expect(activeSlot(root)).toBe(-1);
    input.focus();
    expect(activeSlot(root)).toBe(0);
    expect(slots[0]!.hasAttribute("data-active")).toBe(true);
    const caretWrap = slots[0]!.querySelector("div") as HTMLElement;
    expect(caretWrap.style.display).toBe("");
    input.blur();
    expect(activeSlot(root)).toBe(-1);
    expect(caretWrap.style.display).toBe("none");
  });

  test("maxLength caps the accepted value and lands onComplete at the cap", async () => {
    const onValueChange = vi.fn((value: string) => value);
    const onComplete = vi.fn((value: string) => value);
    const parts = inputOtp({ maxLength: 4, value: "12", onValueChange, onComplete });
    const { input, slots } = await mountOtp(parts, 4);
    expect(input.value).toBe("12");
    input.focus();
    paste(input, "345678");
    expect(input.value).toBe("1234");
    expect(slots.map((slot) => slot.textContent)).toEqual(["1", "2", "3", "4"]);
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls[0]).toEqual(["1234"]);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0]).toEqual(["1234"]);
  });

  test("root disposal stops the selection and value wiring", async () => {
    const value = signal("1");
    const parts = inputOtp({ value: () => value() });
    const { root, input } = await mountOtp(parts, 4);
    expect(input.value).toBe("1");
    root.remove();
    for (let i = 0; i < 50; i++) {
      if (!peekState(root)) break;
      await delay();
    }
    expect(peekState(root)).toBeUndefined();
    value("7777");
    flush();
    expect(input.value).toBe("1");
    document.dispatchEvent(new Event("selectionchange"));
  });
});
