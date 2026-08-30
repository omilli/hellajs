import { describe, expect, test, beforeEach, afterEach, mock } from "bun:test";
import { resetTestState } from "@utils/test-helpers.js";
import { css, removeCss } from "@hellajs/css/bundle";

let originalWarn: typeof console.warn;
let warn: ReturnType<typeof mock<(message: string) => void>>;

beforeEach(() => {
  resetTestState();
  originalWarn = console.warn;
  warn = mock(() => {});
  console.warn = warn as unknown as typeof console.warn;
});

afterEach(() => {
  console.warn = originalWarn;
});

describe("css platform-rejected rules", () => {
  test("warns when insertRule rejects a rule", () => {
    css({ "@layer base": { body: { margin: 0 } } });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      "[css] rule rejected by the platform and skipped: @layer base{body{margin:0px}}"
    );
  });

  test("does not warn when insertRule accepts a rule", () => {
    css({ body: { margin: 0 } });
    expect(warn).not.toHaveBeenCalled();
  });

  test("does not warn when removing a rejected rule", () => {
    css({ "@layer base": { body: { margin: 0 } } });
    warn.mockClear();
    removeCss({ "@layer base": { body: { margin: 0 } } });
    expect(warn).not.toHaveBeenCalled();
  });
});
