import { describe, test, expect } from "bun:test";
import { html, raw } from "@hellajs/dom/bundle";
import { ssr } from "@hellajs/ssr/bundle";
import type { HellaNode } from "@hellajs/dom";

describe("ssr raw child", () => {
  test("emits a raw child verbatim inside <!--[-->…<!--]--> markers", () => {
    expect(ssr(html`<main>${raw("<h1>Hi</h1><p>slot</p>")}</main>` as HellaNode))
      .toBe("<main><!--[--><h1>Hi</h1><p>slot</p><!--]--></main>");
  });

  test("does not escape raw HTML (< and > survive, unlike a resolved string child)", () => {
    expect(ssr(html`<div>${raw("<b>x</b>")}</div>` as HellaNode))
      .toBe("<div><!--[--><b>x</b><!--]--></div>");
  });

  test("ssr.async produces byte-identical output to ssr for a raw child", async () => {
    const node = html`<main>${raw("<h1>Hi</h1><p>slot</p>")}</main>` as HellaNode;
    expect(await ssr.async(node)).toBe(ssr(node));
  });
});
