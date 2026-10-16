import { describe, test, expect } from "vite-plus/test";
import { raw } from "@hellajs/dom";
import { ssr } from "@hellajs/ssr";
import type { HellaNode } from "@hellajs/dom";

describe("ssr raw child", () => {
  test("emits a raw child verbatim inside <!--[-->…<!--]--> markers", () => {
    expect(ssr((<main>{raw("<h1>Hi</h1><p>slot</p>")}</main>) as HellaNode)).toBe(
      "<main><!--[--><h1>Hi</h1><p>slot</p><!--]--></main>",
    );
  });

  test("does not escape raw HTML (< and > survive, unlike a resolved string child)", () => {
    expect(ssr((<div>{raw("<b>x</b>")}</div>) as HellaNode)).toBe(
      "<div><!--[--><b>x</b><!--]--></div>",
    );
  });

  test("ssr.async produces byte-identical output to ssr for a raw child", async () => {
    const node = <main>{raw("<h1>Hi</h1><p>slot</p>")}</main>;
    expect(await ssr.async(node)).toBe(ssr(node));
  });
});
