import { describe, test, expect, beforeEach } from "bun:test";
import { resetTestState } from "@utils/test-helpers.js";
import { css, style, removeStyle, removeCss, vars, removeVars, cssText } from "@hellajs/css/bundle";
import { getCssSheet, getVarsSheet } from "./helpers";

/**
 * Seeds the SSR shape: a style element carrying delivered text the client
 * registration state does not know. Setting textContent is the whole seed —
 * the platform parses it into the element's sheet exactly as it would for
 * server-shipped markup.
 */
function seedSsr(id: string, text: string): HTMLStyleElement {
  const el = document.createElement("style");
  el.id = id;
  document.head.appendChild(el);
  el.textContent = text;
  return el;
}

beforeEach(() => {
  resetTestState();
});

describe("sheet adoption", () => {
  test("claims delivered rules for the subset the client re-registers", () => {
    css({ ".a": { color: "red" } });
    css({ ".b": { color: "green" } });
    const delivered = cssText();
    resetTestState();
    seedSsr("hella-css", delivered);

    css({ ".b": { color: "green" } });

    expect(document.querySelectorAll("#hella-css").length).toBe(1);
    expect(getCssSheet().cssRules.length).toBe(2);
    expect(getCssSheet().cssRules[0]!.cssText).toContain(".a");
    expect(getCssSheet().cssRules[1]!.cssText).toContain(".b");
  });

  test("removes claimed rules at zero refs while unclaimed deliveries stay", () => {
    seedSsr("hella-css", ".a {\n  color: red;\n}\n\n.b {\n  color: green;\n}");

    css({ ".a": { color: "red" } });
    expect(getCssSheet().cssRules.length).toBe(2);
    removeCss({ ".a": { color: "red" } });

    expect(getCssSheet().cssRules.length).toBe(1);
    expect(getCssSheet().cssRules[0]!.cssText).toContain(".b");
  });

  test("claims every sub-rule of a multi-rule registration at its delivered index", () => {
    const input = { ".base": { color: "red" }, "@media (min-width: 500px)": { ".m": { color: "blue" } } };
    css(input);
    const delivered = cssText();
    resetTestState();
    seedSsr("hella-css", delivered);

    css(input);

    expect(getCssSheet().cssRules.length).toBe(2);
    expect(getCssSheet().cssRules[0]!.cssText).toContain(".base");
    expect(getCssSheet().cssRules[1]!.cssText).toContain("@media");

    removeCss(input);
    expect(getCssSheet().cssRules.length).toBe(0);
  });

  test("claims delivered vars buckets, updates in place, and removes emptied buckets", () => {
    const a = { a: "1" };
    vars(a);
    vars({ b: "2" }, { media: "(min-width: 500px)" });
    const delivered = cssText();
    resetTestState();
    seedSsr("hella-vars", delivered);

    vars(a);
    expect(getVarsSheet().cssRules.length).toBe(2);
    expect(getVarsSheet().cssRules[0]!.cssText).toContain("--a");
    expect(getVarsSheet().cssRules[1]!.cssText).toContain("@media");

    vars({ a: "9" });
    expect(getVarsSheet().cssRules.length).toBe(2);
    expect(getVarsSheet().cssRules[0]!.cssText).toContain("--a: 9");

    removeVars(a);
    expect(getVarsSheet().cssRules.length).toBe(1);
    expect(getVarsSheet().cssRules[0]!.cssText).toContain("--b");
  });

  test("an altered delivery misses its claim and duplicates without deleting", () => {
    seedSsr("hella-css", ".a {\n  color: purple;\n}");

    css({ ".a": { color: "red" } });

    expect(getCssSheet().cssRules.length).toBe(2);
    expect(getCssSheet().cssRules[0]!.cssText).toContain("purple");
    expect(getCssSheet().cssRules[1]!.cssText).toContain("red");
  });

  test("a quoted-blank-line delivery never duplicates or deletes", () => {
    // The blank line inside the quoted value mis-splits the delivered text.
    // What happens next is engine-dependent — a strict insertRule rejects the
    // broken pieces and the adoption drains; happy-dom's lenient insertRule
    // normalizes the fragment and the claims branch seeds. Both branches
    // preserve the invariant pinned here: nothing the server shipped is
    // deleted, and a client registration never duplicates it.
    seedSsr("hella-css", '.a::after {\n  content: "x\n\ny";\n}\n\n.b {\n  color: red;\n}');

    css({ ".c": { color: "blue" } });

    expect(getCssSheet().cssRules.length).toBe(3);
    expect(getCssSheet().cssRules[0]!.cssText).toContain(".a::after");
    expect(getCssSheet().cssRules[1]!.cssText).toContain(".b");
    expect(getCssSheet().cssRules[2]!.cssText).toContain(".c");
  });

  test("a delivery the sheet cannot have parsed falls back to the drain", () => {
    // happy-dom's element parse truncates at @charset (one rule survives)
    // while the probe still accepts the segments after it: accepted count
    // diverges from the parsed count, the text cannot be aligned with the
    // sheet, and the adoption drains — braced rules cleared, client
    // registrations repopulate the same element.
    seedSsr("hella-css", '.a {\n  color: red;\n}\n\n@charset "utf-8";\n\n.b {\n  color: green;\n}');
    expect(getCssSheet().cssRules.length).toBe(1);

    css({ ".x": { color: "blue" } });
    expect(getCssSheet().cssRules.length).toBe(1);
    expect(getCssSheet().cssRules[0]!.cssText).toContain(".x");

    css({ ".y": { color: "purple" } });
    expect(getCssSheet().cssRules.length).toBe(2);
  });

  test("rebases claims when a claimed rule is removed before a later claim", () => {
    seedSsr("hella-css", ".a {\n  color: red;\n}\n\n.b {\n  color: green;\n}\n\n.c {\n  color: blue;\n}");

    css({ ".a": { color: "red" } });
    removeCss({ ".a": { color: "red" } });
    css({ ".c": { color: "blue" } });

    // A stale claim would point .c at its pre-shift index 2.
    expect(getCssSheet().cssRules.length).toBe(2);
    expect(getCssSheet().cssRules[1]!.cssText).toContain(".c");

    removeCss({ ".c": { color: "blue" } });
    expect(getCssSheet().cssRules.length).toBe(1);
    expect(getCssSheet().cssRules[0]!.cssText).toContain(".b");

    // .b's claim survived both rebases: registering it adopts the delivered
    // rule in place (a stale index would insert a duplicate instead).
    css({ ".b": { color: "green" } });
    expect(getCssSheet().cssRules.length).toBe(1);

    removeCss({ ".b": { color: "green" } });
    expect(getCssSheet().cssRules.length).toBe(0);
  });

  test("claims align when the platform drops a delivered rule at parse", () => {
    // happy-dom drops an @layer block at element parse and rejects it at
    // insertRule (Chrome does the same with vendor-prefixed selectors): the
    // probe rejects the same segment, so accepted segments align with the
    // parsed rules minus it and claims seed at post-drop indexes instead of
    // draining.
    seedSsr("hella-css", '.a {\n  color: red;\n}\n\n@layer base {\n  .b {\n    color: blue;\n  }\n}\n\n.c {\n  color: green;\n}');
    expect(getCssSheet().cssRules.length).toBe(2);

    css({ ".a": { color: "red" } });
    css({ ".c": { color: "green" } });

    expect(getCssSheet().cssRules.length).toBe(2);
    expect(getCssSheet().cssRules[0]!.cssText).toContain(".a");
    expect(getCssSheet().cssRules[1]!.cssText).toContain(".c");
  });

  test("adopts a pre-existing element once and appends later registrations", () => {
    seedSsr("hella-css", ".one {\n  color: red;\n}");

    css({ ".one": { color: "red" } });
    expect(getCssSheet().cssRules.length).toBe(1);
    const cls = style({ color: "blue" }, { label: "adopt-new" });
    expect(getCssSheet().cssRules.length).toBe(2);
    expect(getCssSheet().cssRules[1]!.cssText).toContain(cls);
    removeStyle({ color: "blue" }, { label: "adopt-new" });
    expect(getCssSheet().cssRules.length).toBe(1);
    expect(getCssSheet().cssRules[0]!.cssText).toContain(".one");
    expect(document.querySelectorAll("#hella-css").length).toBe(1);
  });
});
