import { describe, test, expect, beforeEach, mock } from "bun:test";
import { flush, signal } from "@hellajs/core";
import { resetTestState, delay } from "@utils/test-helpers.js";
// The bare "@hellajs/dom" index, not the bundle: the compiled registry components import the bare
// specifier, so the harness mount shares one dom instance with the components.
import { peekState } from "@hellajs/dom";
import {
  assertAttrForwarded,
  assertHandlerForwarded,
  assertStructuralParity,
  classTokens,
  inlineStyles,
  inputOtpPartModules,
  inputOtpVariants,
  renderVariant,
} from "./helpers/variants";
import type { HellaChildren, HellaNode } from "@hellajs/dom";
import type { AnyModule, ComponentVariant, InputOtpVariantProps } from "./helpers/variants";

beforeEach(() => {
  resetTestState();
});

/** Polls (microtask hops) until the observer-driven mount walk has wired the root's afterMount hooks. */
async function awaitWiring(root: HTMLElement): Promise<void> {
  for (let i = 0; i < 50; i++) {
    if (peekState(root)?.isMounted) return;
    await delay();
  }
  expect(peekState(root)?.isMounted).toBe(true);
}

/** The hidden single-input control inside the rendered root. */
function control(root: HTMLElement): HTMLInputElement {
  return root.querySelector<HTMLInputElement>("[data-input-otp]")!;
}

function slotsOf(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>("[data-slot='input-otp-slot']"));
}

function activeSlot(root: HTMLElement): number {
  return slotsOf(root).findIndex((slot) => slot.hasAttribute("data-active"));
}

/** Emulates the browser-side result of a native edit: value and selection already moved, then the events fire. */
function edit(root: HTMLElement, value: string, caret: number): void {
  const input = control(root);
  input.value = value;
  input.setSelectionRange(caret, caret);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  document.dispatchEvent(new Event("selectionchange"));
}

/** Collapses the native selection like an arrow/Home/End press would, then fires selectionchange. */
function moveCaret(root: HTMLElement, caret: number): void {
  const input = control(root);
  input.setSelectionRange(caret, caret);
  document.dispatchEvent(new Event("selectionchange"));
}

function focusInput(root: HTMLElement): void {
  control(root).focus();
}

function paste(root: HTMLElement, text: string): void {
  const input = control(root);
  const transfer = new DataTransfer();
  transfer.setData("text/plain", text);
  input.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: transfer }));
}

const parts = inputOtpPartModules[0]!;
const Group = parts.InputOTPGroup as unknown as (props: { children?: HellaChildren }) => HellaNode;
const Slot = parts.InputOTPSlot as unknown as (props: { index: number }) => HellaNode;
const Separator = parts.InputOTPSeparator as unknown as (props: { class?: string }) => HellaNode;

function slots(from: number, to: number): HellaNode[] {
  const out: HellaNode[] = [];
  let i = from;
  while (i < to) {
    out.push(Slot({ index: i }));
    i++;
  }
  return out;
}

/** The canonical three-plus-separator-plus-three composition over `length` 6. */
function code(): HellaChildren {
  return [Group({ children: slots(0, 3) }), Separator({}), Group({ children: slots(3, 6) })];
}

/** The same composition built from the part module matching the variant's own flavor. */
function flavoredCode(variant: ComponentVariant<InputOtpVariantProps>): HellaChildren {
  return codeFrom(inputOtpPartModules[inputOtpVariants.indexOf(variant)]!);
}

function codeFrom(partsModule: AnyModule): HellaChildren {
  const group = partsModule.InputOTPGroup as unknown as (props: { children?: HellaChildren }) => HellaNode;
  const slot = partsModule.InputOTPSlot as unknown as (props: { index: number }) => HellaNode;
  const separator = partsModule.InputOTPSeparator as unknown as (props: { class?: string }) => HellaNode;
  const part = (index: number): HellaNode => slot({ index });
  return [
    group({ children: [part(0), part(1), part(2)] }),
    separator({}),
    group({ children: [part(3), part(4), part(5)] }),
  ];
}

type Suite = ComponentVariant<InputOtpVariantProps> & { child: () => HellaChildren };

function suites(): Suite[] {
  return inputOtpVariants.map((variant) => ({ ...variant, child: code }));
}

describe("input-otp", () => {
  test.each(inputOtpVariants)("$format/$style renders the composed slots and hides the control input", (variant) => {
    const root = renderVariant(variant, { length: 6, children: code() }) as HTMLElement;
    expect(slotsOf(root).length).toBe(6);
    expect(slotsOf(root).map((slot) => slot.getAttribute("data-index"))).toEqual(["0", "1", "2", "3", "4", "5"]);
    const input = control(root);
    expect(input.getAttribute("autocomplete")).toBe("one-time-code");
    expect(input.getAttribute("inputmode")).toBe("numeric");
    expect(input.getAttribute("data-input-otp")).toBe("true");
    const separator = root.querySelector("[data-slot='input-otp-separator']") as HTMLElement;
    expect(separator.getAttribute("role")).toBe("separator");
    expect(separator.querySelector("path")?.getAttribute("d")).toBe("M5 12h14");
  });

  test.each(inputOtpVariants)("$format/$style fills slots sequentially while typing and tracks the caret slot", async (variant) => {
    const onChange = mock((value: string) => value);
    const root = renderVariant(variant, { length: 6, children: code(), onChange }) as HTMLElement;
    await awaitWiring(root);
    focusInput(root);
    expect(activeSlot(root)).toBe(0);
    const caretWrap = slotsOf(root)[0]!.querySelector("div") as HTMLElement;
    expect(inlineStyles(caretWrap).includes("display:none")).toBe(false);
    edit(root, "1", 1);
    edit(root, "12", 2);
    expect(slotsOf(root)[0]!.textContent).toBe("1");
    expect(slotsOf(root)[1]!.textContent).toBe("2");
    expect(slotsOf(root)[2]!.textContent).toBe("");
    expect(activeSlot(root)).toBe(2);
    // The active empty slot shows the fake caret bar; filled slots hide it.
    expect(inlineStyles(slotsOf(root)[2]!.querySelector("div") as HTMLElement).includes("display:none")).toBe(false);
    expect(inlineStyles(caretWrap).includes("display:none")).toBe(true);
  });

  test.each(inputOtpVariants)("$format/$style places the caret on the next empty slot at focus and clears it on blur", async (variant) => {
    const root = renderVariant(variant, { length: 6, children: code(), value: "12" }) as HTMLElement;
    await awaitWiring(root);
    expect(slotsOf(root)[0]!.textContent).toBe("1");
    focusInput(root);
    expect(activeSlot(root)).toBe(2);
    control(root).blur();
    expect(activeSlot(root)).toBe(-1);
  });

  test.each(inputOtpVariants)("$format/$style clears the active slot on backspace and moves the highlight back", async (variant) => {
    const onChange = mock((value: string) => value);
    const root = renderVariant(variant, { length: 6, children: code(), onChange }) as HTMLElement;
    await awaitWiring(root);
    focusInput(root);
    edit(root, "1", 1);
    edit(root, "12", 2);
    edit(root, "123", 3);
    expect(activeSlot(root)).toBe(3);
    // Backspace at the collapsed end caret deletes slot 2's char; the remapped selection highlights it.
    edit(root, "12", 2);
    expect(slotsOf(root)[2]!.textContent).toBe("");
    expect(activeSlot(root)).toBe(2);
    expect(onChange.mock.calls[3]).toEqual(["12"]);
  });

  test.each(inputOtpVariants)("$format/$style moves the active slot with arrows, Home, and End", async (variant) => {
    const root = renderVariant(variant, { length: 6, children: code(), value: "1234" }) as HTMLElement;
    await awaitWiring(root);
    focusInput(root);
    expect(activeSlot(root)).toBe(4);
    // ArrowLeft from the end caret: native collapse to 3, remapped onto slot 3.
    moveCaret(root, 3);
    expect(activeSlot(root)).toBe(3);
    // ArrowLeft again: native collapse of the [3,4) slot selection back to 3, offset lands on slot 2.
    moveCaret(root, 3);
    expect(activeSlot(root)).toBe(2);
    // ArrowRight: native collapse to the selection's right edge, slot 3 again.
    moveCaret(root, 3);
    expect(activeSlot(root)).toBe(3);
    moveCaret(root, 3);
    expect(activeSlot(root)).toBe(2);
    moveCaret(root, 0);
    expect(activeSlot(root)).toBe(0);
    moveCaret(root, 4);
    expect(activeSlot(root)).toBe(4);
  });

  test.each(inputOtpVariants)("$format/$style fills from the caret on paste and clips to length", async (variant) => {
    const onChange = mock((value: string) => value);
    const onComplete = mock((value: string) => value);
    const root = renderVariant(variant, { length: 6, children: code(), value: "12", onChange, onComplete }) as HTMLElement;
    await awaitWiring(root);
    focusInput(root);
    paste(root, "345678");
    const chars = slotsOf(root).map((slot) => slot.textContent);
    expect(chars).toEqual(["1", "2", "3", "4", "5", "6"]);
    expect(control(root).value).toBe("123456");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]).toEqual(["123456"]);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0]).toEqual(["123456"]);
  });

  test.each(inputOtpVariants)("$format/$style rejects edits that break the pattern mask and re-emits the pattern attribute", async (variant) => {
    const onChange = mock((value: string) => value);
    const root = renderVariant(variant, { length: 4, children: code(), pattern: "^\\d+$", onChange }) as HTMLElement;
    await awaitWiring(root);
    expect(control(root).getAttribute("pattern")).toBe("^\\d+$");
    focusInput(root);
    edit(root, "a", 1);
    expect(control(root).value).toBe("");
    expect(slotsOf(root)[0]!.textContent).toBe("");
    expect(onChange).not.toHaveBeenCalled();
    edit(root, "1", 1);
    expect(slotsOf(root)[0]!.textContent).toBe("1");
    expect(onChange.mock.calls[0]).toEqual(["1"]);
  });

  test.each(inputOtpVariants)("$format/$style reports every accepted step through onChange", async (variant) => {
    const onChange = mock((value: string) => value);
    const root = renderVariant(variant, { length: 6, children: code(), onChange }) as HTMLElement;
    await awaitWiring(root);
    focusInput(root);
    edit(root, "1", 1);
    edit(root, "12", 2);
    edit(root, "123", 3);
    expect(onChange.mock.calls.map((call) => call[0])).toEqual(["1", "12", "123"]);
  });

  test.each(inputOtpVariants)("$format/$style fires onComplete exactly on the transition to full", async (variant) => {
    const onComplete = mock((value: string) => value);
    const root = renderVariant(variant, { length: 6, children: code(), onComplete }) as HTMLElement;
    await awaitWiring(root);
    focusInput(root);
    edit(root, "12345", 5);
    expect(onComplete).not.toHaveBeenCalled();
    edit(root, "123456", 5);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0]).toEqual(["123456"]);
    // A redundant write at full does not refire; clearing and refilling does.
    edit(root, "123456", 5);
    expect(onComplete).toHaveBeenCalledTimes(1);
    edit(root, "12345", 5);
    edit(root, "123456", 5);
    expect(onComplete).toHaveBeenCalledTimes(2);
  });

  test.each(inputOtpVariants)("$format/$style re-renders slots when a controlled value() writes from outside", async (variant) => {
    const external = signal("12");
    const root = renderVariant(variant, { length: 6, children: code(), value: () => external() }) as HTMLElement;
    await awaitWiring(root);
    expect(slotsOf(root).map((slot) => slot.textContent)).toEqual(["1", "2", "", "", "", ""]);
    expect(control(root).value).toBe("12");
    external("998877");
    flush();
    expect(slotsOf(root).map((slot) => slot.textContent)).toEqual(["9", "9", "8", "8", "7", "7"]);
    expect(control(root).value).toBe("998877");
  });

  test.each(inputOtpVariants)("$format/$style blocks edits and paste while disabled", async (variant) => {
    const onChange = mock((value: string) => value);
    const root = renderVariant(variant, { length: 6, children: code(), disabled: true, onChange }) as HTMLElement;
    await awaitWiring(root);
    expect(control(root).disabled).toBe(true);
    focusInput(root);
    edit(root, "9", 1);
    paste(root, "12");
    expect(onChange).not.toHaveBeenCalled();
    expect(slotsOf(root)[0]!.textContent).toBe("");
  });

  test.each(inputOtpVariants)("$format/$style carries the component classes for both flavors", (variant) => {
    const root = renderVariant(variant, { length: 6, children: flavoredCode(variant) }) as HTMLElement;
    const slotEl = slotsOf(root)[0]!;
    if (variant.style === "tailwind") {
      expect(classTokens(root)).toContain("has-disabled:opacity-50");
      expect(classTokens(slotEl)).toContain("shadow-xs");
      expect(classTokens(slotEl)).toContain("data-[active=true]:ring-[3px]");
      expect(classTokens(control(root))).toContain("disabled:cursor-not-allowed");
    } else {
      expect(classTokens(root).some((token) => token.startsWith("input-otp"))).toBe(true);
      expect(classTokens(slotEl).some((token) => token.startsWith("input-otp-slot"))).toBe(true);
    }
  });

  test.each(inputOtpVariants)("$format/$style disposes the selection wiring when the root unmounts", async (variant) => {
    const onChange = mock((value: string) => value);
    const root = renderVariant(variant, { length: 6, children: code(), onChange }) as HTMLElement;
    await awaitWiring(root);
    root.remove();
    for (let i = 0; i < 50; i++) {
      if (!peekState(root)) break;
      await delay();
    }
    expect(peekState(root)).toBeUndefined();
    edit(root, "9", 1);
    expect(onChange).not.toHaveBeenCalled();
  });

  test("forwards user attrs onto the root across all four variants", () => {
    assertAttrForwarded(suites(), { title: "Hella" }, "title", "Hella");
  });

  test("fires a user on:click handler across all four variants", () => {
    const onClick = mock(() => {});
    assertHandlerForwarded(suites(), { "on:click": onClick }, "on:click", "click", onClick);
  });

  test.each(inputOtpVariants)("$format/$style merges props.class into the class attribute", (variant) => {
    const root = renderVariant(variant, { length: 6, children: code(), class: "my-otp" }) as HTMLElement;
    expect(classTokens(root).at(-1)).toBe("my-otp");
  });

  test("keeps structural parity across all four variants", () => {
    assertStructuralParity(suites(), { length: 6 });
    assertStructuralParity(suites(), { length: 4, disabled: true, class: "tracking-widest" });
  });
});
