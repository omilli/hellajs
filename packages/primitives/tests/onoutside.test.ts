import { describe, test, expect, beforeEach, mock } from "bun:test";
import { resetTestState } from "@utils/test-helpers.js";
import { onOutside } from "@hellajs/primitives/bundle";
import { setupButtons, pointerDown } from "./helpers";

describe("onOutside", () => {
  beforeEach(() => {
    resetTestState();
  });

  test("fires on document pointerdown outside every resolved target, never inside any", () => {
    const handler = mock(() => {});
    const { container, buttons } = setupButtons(["one", "two"]);
    const dismiss = onOutside(() => [container], handler);

    pointerDown(buttons[0]!);
    expect(handler).not.toHaveBeenCalled();
    pointerDown(container);
    expect(handler).not.toHaveBeenCalled();

    const stray = document.createElement("div");
    document.body.append(stray);
    pointerDown(stray);
    expect(handler).toHaveBeenCalledTimes(1);
    dismiss();
  });

  test("ignores null getter entries, stops after dispose, and validates inputs", () => {
    const handler = mock(() => {});
    const { container } = setupButtons(["one"]);
    const dismiss = onOutside(() => [null, container], handler);

    pointerDown(container);
    expect(handler).not.toHaveBeenCalled();

    const stray = document.createElement("div");
    document.body.append(stray);
    pointerDown(stray);
    expect(handler).toHaveBeenCalledTimes(1);

    dismiss();
    pointerDown(stray);
    expect(handler).toHaveBeenCalledTimes(1);

    expect(() => onOutside(null as never, handler)).toThrow("[primitives] onOutside: targets is required");
    expect(() => onOutside(() => [], null as never)).toThrow("[primitives] onOutside: handler is required");
  });
});
