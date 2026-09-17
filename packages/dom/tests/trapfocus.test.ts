import { describe, test, expect, beforeEach } from "bun:test";
import { resetTestState } from "@utils/test-helpers.js";
import { trapFocus } from "@hellajs/dom/bundle";
import { setupButtons, pressKey } from "./helpers";

describe("trapFocus", () => {
  beforeEach(() => {
    resetTestState();
  });

  test("wraps Tab from the last focusable to the first and Shift+Tab from the first to the last", () => {
    const { container, buttons } = setupButtons(["one", "two", "three"]);
    const release = trapFocus(container);
    buttons[2]!.focus();

    pressKey(buttons[2]!, "Tab");
    expect(document.activeElement).toBe(buttons[0]!);

    pressKey(buttons[0]!, "Tab", true);
    expect(document.activeElement).toBe(buttons[2]!);
    release();
  });

  test("honors initialFocus and restores the pre-trap activeElement on release", () => {
    const outside = document.createElement("button");
    document.body.append(outside);
    outside.focus();

    const { container, buttons } = setupButtons(["one", "two"]);
    const release = trapFocus(container, { initialFocus: () => buttons[1] });
    expect(document.activeElement).toBe(buttons[1]!);
    release();
    expect(document.activeElement).toBe(outside);

    const keep = trapFocus(container, { initialFocus: () => buttons[0], restoreFocus: false });
    buttons[1]!.focus();
    keep();
    expect(document.activeElement).toBe(buttons[1]!);
  });

  test("stops intercepting Tab after release and ignores non-Tab keys while trapped", () => {
    const { container, buttons } = setupButtons(["one", "two"]);
    const release = trapFocus(container);
    buttons[1]!.focus();

    const trapped = pressKey(buttons[1]!, "Tab");
    expect(trapped.defaultPrevented).toBe(true);
    release();

    const freed = pressKey(buttons[1]!, "Tab");
    expect(freed.defaultPrevented).toBe(false);

    const releaseAgain = trapFocus(container);
    buttons[1]!.focus();
    const arrow = pressKey(buttons[1]!, "ArrowRight");
    expect(arrow.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(buttons[1]!);
    releaseAgain();

    expect(() => trapFocus(null as never)).toThrow("[dom] trapFocus: container is required");
  });
});
