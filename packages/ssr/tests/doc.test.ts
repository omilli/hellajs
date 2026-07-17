import { describe, test, expect } from "bun:test";
import { doc } from "@hellajs/ssr/bundle";
import type { DocOptions } from "@hellajs/ssr";

describe("doc", () => {
  test("emits a stable skeleton with an empty head for a minimal body", () => {
    expect(doc({ body: "X" })).toBe("<!DOCTYPE html><html><head></head><body>X</body></html>");
  });

  test("emits <html lang> when lang is set and a bare <html> when unset", () => {
    expect(doc({ body: "X", lang: "en" })).toBe("<!DOCTYPE html><html lang=\"en\"><head></head><body>X</body></html>");
    expect(doc({ body: "X" })).toContain("<html>");
  });

  test("renders head.title inside a <title> element", () => {
    expect(doc({ body: "X", head: { title: "Home" } })).toBe("<!DOCTYPE html><html><head><title>Home</title></head><body>X</body></html>");
  });

  test("escapes head.title text (<, >, &, \")", () => {
    expect(doc({ body: "X", head: { title: "<b>&\"" } })).toContain("<title>&lt;b&gt;&amp;&quot;</title>");
  });

  test("renders one void <meta> per head.meta entry, in order", () => {
    expect(doc({ body: "X", head: { meta: [{ name: "a" }, { name: "b" }] } })).toContain("<meta name=\"a\"><meta name=\"b\">");
  });

  test("renders a charset meta tag", () => {
    expect(doc({ body: "X", head: { meta: [{ charset: "utf-8" }] } })).toContain("<meta charset=\"utf-8\">");
  });

  test("escapes head.meta attribute values", () => {
    expect(doc({ body: "X", head: { meta: [{ name: "x", content: "<a>" }] } })).toContain("<meta name=\"x\" content=\"&lt;a&gt;\">");
  });

  test("renders void <link> tags in order", () => {
    expect(doc({ body: "X", head: { links: [{ rel: "stylesheet", href: "/a.css" }, { rel: "icon", href: "/f.ico" }] } })).toContain("<link rel=\"stylesheet\" href=\"/a.css\"><link rel=\"icon\" href=\"/f.ico\">");
  });

  test("joins head.styles into one <style> without re-escaping", () => {
    expect(doc({ body: "X", head: { styles: [".a{x:1}", ".b{y:<}"] } })).toContain("<style>.a{x:1}.b{y:<}</style>");
  });

  test("renders an external script from { src }", () => {
    expect(doc({ body: "X", head: { scripts: [{ src: "/app.js" }] } })).toContain("<script src=\"/app.js\"></script>");
  });

  test("renders an inline script from { content } without escaping", () => {
    expect(doc({ body: "X", head: { scripts: [{ content: "if(a<b){}" }] } })).toContain("<script>if(a<b){}</script>");
  });

  test("renders async bare when true and omits it when false", () => {
    expect(doc({ body: "X", head: { scripts: [{ src: "/a.js", async: true }] } })).toContain("<script src=\"/a.js\" async></script>");
    expect(doc({ body: "X", head: { scripts: [{ src: "/a.js", async: false }] } })).toContain("<script src=\"/a.js\"></script>");
  });

  test("appends head.raw verbatim inside <head>", () => {
    expect(doc({ body: "X", head: { raw: "<!--ga-->" } })).toContain("<head><!--ga--></head>");
  });

  test("places body verbatim without re-escaping", () => {
    expect(doc({ body: "<b>a&b\"c</b>" })).toContain("<body><b>a&b\"c</b></body>");
  });

  test("omits absent optional head fields", () => {
    const out = doc({ body: "X", head: { title: "T" } });
    expect(out).not.toContain("<meta");
    expect(out).not.toContain("<style");
    expect(out).not.toContain("<script");
    expect(out).not.toContain("<link");
  });

  test("throws when body is omitted", () => {
    expect(() => doc({} as DocOptions)).toThrow(/^\[ssr\] doc: body is required, received undefined$/);
  });
});
