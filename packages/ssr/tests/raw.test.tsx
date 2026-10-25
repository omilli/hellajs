import { describe, test, expect } from "vite-plus/test";
import { raw } from "@hellajs/dom";
import { ssr } from "@hellajs/ssr";

describe("ssr raw child", () => {
  test("emits a raw child verbatim inside <!--[-->…<!--]--> markers", () => {
    expect(ssr(<main>{raw("<h1>Hi</h1><p>slot</p>")}</main>)).toBe(
      "<main><!--[--><h1>Hi</h1><p>slot</p><!--]--></main>",
    );
  });

  test("does not escape raw HTML (< and > survive, unlike a resolved string child)", () => {
    expect(ssr(<div>{raw("<b>x</b>")}</div>)).toBe("<div><!--[--><b>x</b><!--]--></div>");
  });

  test("ssr.async produces byte-identical output to ssr for a raw child", async () => {
    const node = <main>{raw("<h1>Hi</h1><p>slot</p>")}</main>;
    expect(await ssr.async(node)).toBe(ssr(node));
  });
});
