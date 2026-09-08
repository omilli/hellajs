import { describe, test, expect } from "bun:test";
import { html } from "@hellajs/dom";
import { transformJSX } from "./helpers";

/**
 * Canonical projection erasing presentation-only divergence between the
 * runtime `html` parser (`@hellajs/dom`) and the compiled transform:
 * - `static` flags: runtime marks static subtrees, compiled hoists them.
 * - Empty `props`/`children`: runtime always materializes both, compiled
 *   omits empty fields.
 * - Adjacent string children: compiled joins all-string children into one
 *   literal, runtime keeps them separate (DOM-equivalent either way).
 * - Root-level text: runtime wraps bare root strings in a `$` fragment,
 *   compiled emits the string directly.
 */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) {
    const items: unknown[] = [];
    let i = 0;
    const len = value.length;
    while (i < len) {
      const projected = canonical(value[i++]!);
      const last = items[items.length - 1];
      if (typeof projected === "string" && typeof last === "string") {
        items[items.length - 1] = last + projected;
      } else {
        items.push(projected);
      }
    }
    return items;
  }
  if (typeof value !== "object" || value === null) return value;

  const source = value as Record<string, unknown>;
  const node: Record<string, unknown> = {};
  const keys = Object.keys(source);
  let i = 0;
  const len = keys.length;
  while (i < len) {
    const key = keys[i++]!;
    if (key === "static") continue;
    const val = source[key];
    if (key === "props" && typeof val === "object" && val !== null && Object.keys(val).length === 0) continue;
    if (key === "children" && Array.isArray(val) && val.length === 0) continue;
    node[key] = canonical(val);
  }

  if (node.tag === "$" && Array.isArray(node.children) && node.children.length === 1
    && typeof node.children[0] === "string") {
    return node.children[0];
  }
  return node;
}

function evaluate(source: string, args: Record<string, unknown>): unknown {
  const names = Object.keys(args);
  const fn = new Function(...names, source) as (...values: unknown[]) => unknown;
  return fn(...names.map((name) => args[name]));
}

// Malformed-markup recovery set plus well-formed controls; `${v}` entries
// evaluate with v = "x" on both paths.
const corpus = [
  { template: "<div><br>text</div>" },
  { template: "<br>" },
  { template: "<input value=\"x\">t" },
  { template: "<div><span>a</div>" },
  { template: "<div>a</span>b</div>" },
  { template: "<div><span>x" },
  { template: "<div><br />text</div>" },
  { template: "<div class=\"a\" data-x='b' lang=en><span title=\"c\">d</span></div>" },
  { template: "<><span>a</span><span>b</span></>" },
  { template: "<input value=${v}>t" }
];

describe("babel", () => {
  describe("html parity", () => {
    test("canonical projection maps runtime and compiled shapes to one form", () => {
      const runtimeShape = {
        tag: "div",
        props: {},
        children: ["a", { tag: "br", props: {}, children: [], static: true }, "b"],
        static: true
      };
      const compiledShape = {
        tag: "div",
        children: ["a", { tag: "br" }, "b"],
        static: true
      };
      expect(canonical(runtimeShape)).toEqual({ tag: "div", children: ["a", { tag: "br" }, "b"] });
      expect(canonical(compiledShape)).toEqual(canonical(runtimeShape));
    });

    test("canonical projection unwraps root-level text fragments and joins string children", () => {
      expect(canonical({ tag: "$", children: ["a", "b"], static: true })).toBe("ab");
      expect(canonical("ab")).toBe("ab");
    });

    test.each(corpus)("runtime and compiled parsers agree on \"${template}\"", ({ template }) => {
      const runtimeResult = evaluate("return html`" + template + "`;", { html, v: "x" });
      const compiled = transformJSX("const n = html`" + template + "`;");
      const compiledResult = evaluate(compiled + "; return n;", { v: "x" });

      expect(canonical(compiledResult)).toEqual(canonical(runtimeResult));
    });
  });
});
