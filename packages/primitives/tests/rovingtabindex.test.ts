import { describe, test, expect, beforeEach } from "bun:test";
import { resetTestState } from "@utils/test-helpers.js";
import { rovingTabIndex } from "@hellajs/primitives/bundle";
import { setupButtons, pressKey } from "./helpers";

describe("rovingTabIndex", () => {
  beforeEach(() => {
    resetTestState();
  });

  test("moves focus with the arrow keys along the active orientation", () => {
    const { container, buttons } = setupButtons(["one", "two", "three"]);
    const dispose = rovingTabIndex(container);
    expect(buttons[0]!.tabIndex).toBe(0);
    expect(buttons[1]!.tabIndex).toBe(-1);

    const outside = pressKey(buttons[0]!, "ArrowRight");
    expect(outside.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(document.body);

    buttons[0]!.focus();
    pressKey(buttons[0]!, "ArrowRight");
    expect(document.activeElement).toBe(buttons[1]!);
    pressKey(buttons[1]!, "ArrowDown");
    expect(document.activeElement).toBe(buttons[2]!);
    pressKey(buttons[2]!, "ArrowLeft");
    expect(document.activeElement).toBe(buttons[1]!);
    pressKey(buttons[1]!, "ArrowUp");
    expect(document.activeElement).toBe(buttons[0]!);
    dispose();

    const vertical = setupButtons(["a", "b"]);
    const disposeVertical = rovingTabIndex(vertical.container, { orientation: "vertical" });
    vertical.buttons[0]!.focus();
    const filtered = pressKey(vertical.buttons[0]!, "ArrowRight");
    expect(filtered.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(vertical.buttons[0]!);

    pressKey(vertical.buttons[0]!, "ArrowDown");
    expect(document.activeElement).toBe(vertical.buttons[1]!);
    disposeVertical();
  });

  test("jumps to the ends with Home and End while tabindex roves", () => {
    const container = document.createElement("div");
    const tabs = ["a", "b", "c"].map((label) => {
      const tab = document.createElement("span");
      tab.className = "tab";
      tab.tabIndex = 0;
      tab.textContent = label;
      return tab;
    });
    container.append(...tabs);
    document.body.append(container);
    const dispose = rovingTabIndex(container, { selector: ".tab" });

    tabs[0]!.focus();
    pressKey(tabs[0]!, "End");
    expect(document.activeElement).toBe(tabs[2]!);
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([-1, -1, 0]);

    pressKey(tabs[2]!, "Home");
    expect(document.activeElement).toBe(tabs[0]!);
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1]);
    dispose();
  });

  test("wraps by default and stops at the ends when loop is false", () => {
    const wrap = setupButtons(["one", "two"]);
    const disposeWrap = rovingTabIndex(wrap.container);
    wrap.buttons[1]!.focus();
    pressKey(wrap.buttons[1]!, "ArrowRight");
    expect(document.activeElement).toBe(wrap.buttons[0]!);
    disposeWrap();

    const clamp = setupButtons(["one", "two"]);
    const disposeClamp = rovingTabIndex(clamp.container, { loop: false });
    clamp.buttons[1]!.focus();
    pressKey(clamp.buttons[1]!, "ArrowRight");
    expect(document.activeElement).toBe(clamp.buttons[1]!);

    clamp.buttons[0]!.focus();
    pressKey(clamp.buttons[0]!, "ArrowLeft");
    expect(document.activeElement).toBe(clamp.buttons[0]!);
    disposeClamp();
  });

  test("restores original tabindex attributes and removes wiring on dispose", () => {
    const container = document.createElement("div");
    const first = document.createElement("button");
    const second = document.createElement("span");
    second.setAttribute("tabindex", "2");
    const excluded = document.createElement("button");
    excluded.tabIndex = -1;
    container.append(first, second, excluded);
    document.body.append(container);

    const dispose = rovingTabIndex(container);
    expect(first.tabIndex).toBe(0);
    expect(second.tabIndex).toBe(-1);
    expect(excluded.tabIndex).toBe(-1);

    dispose();
    expect(first.hasAttribute("tabindex")).toBe(false);
    expect(second.getAttribute("tabindex")).toBe("2");

    first.focus();
    pressKey(first, "ArrowRight");
    expect(document.activeElement).toBe(first);

    expect(() => rovingTabIndex(null as never)).toThrow("[primitives] rovingTabIndex: container is required");
  });
});
