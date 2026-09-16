import { describe, test, expect, beforeEach, mock } from "bun:test";
import { resetTestState } from "@utils/test-helpers.js";
import { onEscape } from "@hellajs/primitives/bundle";
import { setupButtons, pressKey } from "./helpers";

describe("onEscape", () => {
  beforeEach(() => {
    resetTestState();
  });

  test("fires the handler only on Escape keydown at the target", () => {
    const handler = mock(() => {});
    const { container } = setupButtons(["one"]);
    const dismiss = onEscape(container, handler);

    pressKey(container, "Enter");
    expect(handler).not.toHaveBeenCalled();

    const other = document.createElement("div");
    document.body.append(other);
    pressKey(other, "Escape");
    expect(handler).not.toHaveBeenCalled();

    pressKey(container, "Escape");
    expect(handler).toHaveBeenCalledTimes(1);
    dismiss();
  });

  test("stops firing after dispose and validates inputs", () => {
    const handler = mock(() => {});
    const { container } = setupButtons(["one"]);
    const dismiss = onEscape(container, handler);
    dismiss();

    pressKey(container, "Escape");
    expect(handler).not.toHaveBeenCalled();

    expect(() => onEscape(null as never, handler)).toThrow("[primitives] onEscape: target is required");
    expect(() => onEscape(container, null as never)).toThrow("[primitives] onEscape: handler is required");
  });
});
