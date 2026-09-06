import { describe, expect, test, beforeEach, afterEach, mock } from "bun:test";
import { resetTestState, getStylesheet } from "@utils/test-helpers.js";
import { css, removeCss } from "@hellajs/css/bundle";
import { getCssSheet } from "./helpers";

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

  test("phantom indexMap entry is not created when insertRule throws", () => {
    // happy-dom rejects @layer, so insertRule will throw.
    // The phantom entry bug would cause a subsequent supported rule to
    // be injected at a stale index, corrupting the sheet.
    css({ "@layer base": { h1: { fontSize: "2rem" } } });
    css({ body: { margin: "0" } });
    const sheet = getCssSheet();
    expect(sheet.cssRules.length).toBe(1);
    expect(sheet.cssRules[0]!.cssText).toContain("body");
    // @layer is rejected by happy-dom, so it is absent from the CSSOM —
    // the failed insert is the premise of this test.
    const content = getStylesheet("hella-css");
    expect(content).not.toContain("@layer");
    expect(content).toContain("body");
  });

  test("re-injecting a failed rule key does not corrupt existing rules", () => {
    // First injection fails (happy-dom rejects @layer).
    css({ "@layer base": { h1: { fontSize: "2rem" } } });
    // Supported rule lands fine.
    css({ body: { margin: "0" } });
    // Re-inject same @layer key with different text — exercises existing-key path.
    css({ "@layer base": { h1: { color: "red" } } });
    const sheet = getCssSheet();
    expect(sheet.cssRules.length).toBe(1);
    expect(sheet.cssRules[0]!.cssText).toContain("body");
  });
});
