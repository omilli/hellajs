import { describe, test, expect, mock } from "bun:test";
import { delay } from "@utils/test-helpers.js";
import { html, Suspense } from "@hellajs/dom/bundle";
import { ssr, doc } from "@hellajs/ssr/bundle";
import type { DocOptions } from "@hellajs/ssr";
import type { HellaNode } from "@hellajs/dom";
import { collect } from "./helpers";

/** A ReadableStream<string> that emits the given chunks then closes — a deterministic body. */
function streamOf(...chunks: string[]): ReadableStream<string> {
  return new ReadableStream<string>({
    start(controller) {
      let i = 0;
      while (i < chunks.length) {
        controller.enqueue(chunks[i]!);
        i++;
      }
      controller.close();
    },
  });
}

/** Collects a stream's chunks as an array — preserves emission boundaries for ordering asserts. */
async function collectChunks(stream: ReadableStream<string>): Promise<string[]> {
  const reader = stream.getReader();
  const out: string[] = [];
  let chunk = await reader.read();
  while (!chunk.done) { out.push(chunk.value); chunk = await reader.read(); }
  return out;
}

/** Extracts the hella-data payload text — the content between the payload open tag and its closing `</script>`. */
function payloadOf(page: string): string {
  const open = "<script type=\"application/json\" id=\"hella-data\">";
  return page.slice(page.indexOf(open) + open.length, page.indexOf("</script></body>"));
}

describe("doc", () => {
  test("emits a stable skeleton with an empty head for a minimal body", () => {
    expect(doc({ body: "X" })).toBe("<!DOCTYPE html><html><head></head><body>X</body></html>");
  });

  test("emits <html lang> when lang is set", () => {
    expect(doc({ body: "X", lang: "en" })).toBe("<!DOCTYPE html><html lang=\"en\"><head></head><body>X</body></html>");
  });

  test("emits a bare <html> when lang is unset", () => {
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

  test("drops src when content is set (inline wins — a <script src> would ignore its body)", () => {
    const out = doc({ body: "X", head: { scripts: [{ src: "/a.js", content: "console.log(1)" }] } });
    expect(out).toContain("<script>console.log(1)</script>");
    expect(out).not.toContain("src=");
  });

  test("keeps non-src attrs on an inline script when content is set", () => {
    const out = doc({ body: "X", head: { scripts: [{ src: "/a.js", type: "module", content: "x" }] } });
    expect(out).toContain('<script type="module">x</script>');
    expect(out).not.toContain("src=");
  });

  test("renders a script async bare when async is true", () => {
    expect(doc({ body: "X", head: { scripts: [{ src: "/a.js", async: true }] } })).toContain("<script src=\"/a.js\" async></script>");
  });

  test("omits async when async is false", () => {
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
    expect(() => doc({} as DocOptions & { body: string })).toThrow(/^\[ssr\] doc: body is required, received undefined$/);
  });

  test("wraps the body in <div id=\"app\"> for an id-only string mount", () => {
    expect(doc({ body: "X", mount: "#app" })).toContain("<body><div id=\"app\">X</div></body>");
  });

  test("emits the mount's tag for a tag#id string mount", () => {
    expect(doc({ body: "X", mount: "main#app" })).toContain("<body><main id=\"app\">X</main></body>");
  });

  test("joins class mounts with spaces (string body)", () => {
    expect(doc({ body: "X", mount: ".wrap.x" })).toContain("<body><div class=\"wrap x\">X</div></body>");
  });

  test("string mode equals the streamed mode byte-for-byte for the same body", async () => {
    expect(doc({ body: "X", lang: "en", mount: "#app", head: { title: "T" } }))
      .toBe(await collect(doc({ body: streamOf("X"), lang: "en", mount: "#app", head: { title: "T" } })));
  });

  test("wraps streamed body chunks in the full document skeleton, in emission order", async () => {
    expect(await collect(doc({ body: streamOf("a", "b", "c") }))).toBe("<!DOCTYPE html><html><head></head><body>abc</body></html>");
  });

  test("emits <html lang> for a streamed body when lang is set", async () => {
    expect(await collect(doc({ body: streamOf("X"), lang: "en" }))).toBe("<!DOCTYPE html><html lang=\"en\"><head></head><body>X</body></html>");
  });

  test("renders the streamed head through the shared builder", async () => {
    const out = await collect(doc({
      body: streamOf("X"),
      head: {
        title: "Home",
        meta: [{ charset: "utf-8" }],
        styles: [".x{color:red}"],
        scripts: [{ src: "/c.js", type: "module" }],
      },
    }));
    expect(out).toContain("<head><title>Home</title><meta charset=\"utf-8\"><style>.x{color:red}</style><script src=\"/c.js\" type=\"module\"></script></head>");
  });

  test("wraps a streamed body in <div id=\"app\"> for an id-only mount", async () => {
    expect(await collect(doc({ body: streamOf("X"), mount: "#app" }))).toContain("<body><div id=\"app\">X</div></body>");
  });

  test("emits the mount's tag for a tag#id mount (streamed body)", async () => {
    expect(await collect(doc({ body: streamOf("X"), mount: "main#app" }))).toContain("<body><main id=\"app\">X</main></body>");
  });

  test("throws the mount error on unsupported selectors in BOTH modes", () => {
    for (const mount of ["a > b", "[x]", ":hover", "", "#a#b", "#a[x]", ".a[x]"]) {
      expect(() => doc({ body: "X", mount })).toThrow(`[ssr] doc: mount supports tag/#id/.class only, received "${mount}"`);
      expect(() => doc({ body: streamOf("X"), mount })).toThrow(`[ssr] doc: mount supports tag/#id/.class only, received "${mount}"`);
    }
  });

  test("throws when a streamed call omits body", () => {
    expect(() => doc({} as unknown as { body: ReadableStream<string> })).toThrow("[ssr] doc: body is required, received undefined");
  });

  test("errors the document stream when the body stream errors", async () => {
    const body = new ReadableStream<string>({
      start(controller) { controller.error(new Error("boom")); },
    });
    await expect(collect(doc({ body }))).rejects.toThrow("boom");
  });

  test("cancels the body stream when the document stream is cancelled", async () => {
    const cancelBody = mock(() => {});
    const body = new ReadableStream<string>({ cancel: cancelBody });
    const stream = doc({ body });
    await stream.getReader().cancel("gone");
    expect(cancelBody).toHaveBeenCalledTimes(1);
  });

  test("holds the suffix until staged <Suspense> swaps flush", async () => {
    const node = html`<div><${Suspense} fallback=${html`<i>wait</i>`}>${() => delay(5).then(() => html`<b>late</b>`)}</${Suspense}></div>` as HellaNode;
    const chunks = await collectChunks(doc({ mount: "#app", body: ssr.stream(node) }));
    expect(chunks[chunks.length - 1]!).toBe("</div></body></html>");
    const swapIndex = chunks.findIndex((chunk) => chunk.includes("<template id=\"hs"));
    expect(swapIndex).toBeGreaterThan(-1);
    expect(swapIndex).toBeLessThan(chunks.length - 1);
  });

  test("propagates backpressure — the body producer stays parked while the document consumer idles", async () => {
    const step = mock(() => Promise.resolve("b"));    // each call = the body walk reached that child
    const body = ssr.stream(html`<div>${step}${step}${step}${step}${step}${step}</div>` as HellaNode);
    const reader = doc({ body }).getReader();
    const first = await reader.read();              // the document shell — pulls the prefix only, not the body walk
    expect(first.value).toContain("<!DOCTYPE html>");
    await delay(25);                                 // a start()-drained body finishes all six getters inside this window
    expect(step.mock.calls.length).toBeLessThanOrEqual(2);   // read-ahead bounded by the two queues' high-water marks
    let chunk = await reader.read();                 // resume consuming — the document and body advance with the reads
    while (!chunk.done) { chunk = await reader.read(); }
    expect(step.mock.calls.length).toBe(6);          // draining the document drains (and completes) the body
  });

  test("emits the data payload after the mount wrapper, before </body> (string mode)", () => {
    expect(doc({ body: "X", mount: "#app", head: { title: "T" }, data: { user: "Ada" } }))
      .toBe("<!DOCTYPE html><html><head><title>T</title></head><body><div id=\"app\">X</div><script type=\"application/json\" id=\"hella-data\">{\"user\":\"Ada\"}</script></body></html>");
  });

  test("emits nothing when data is omitted", () => {
    expect(doc({ body: "X", mount: "#app" }))
      .toBe("<!DOCTYPE html><html><head></head><body><div id=\"app\">X</div></body></html>");
  });

  test("joins the payload to the suffix in stream mode, before </body></html>", async () => {
    const page = await collect(doc({ body: streamOf("X"), mount: "#app", data: { user: "Ada" } }));
    expect(page)
      .toBe("<!DOCTYPE html><html><head></head><body><div id=\"app\">X</div><script type=\"application/json\" id=\"hella-data\">{\"user\":\"Ada\"}</script></body></html>");
    expect(JSON.parse(payloadOf(page))).toEqual({ user: "Ada" });
  });

  test("escapes < in the payload so </script> cannot break out", () => {
    const hostile = "</script><script>alert(1)</script>";
    const page = doc({ body: "X", data: { s: hostile } });
    expect(payloadOf(page)).toBe("{\"s\":\"\\u003c/script>\\u003cscript>alert(1)\\u003c/script>\"}");
    expect(JSON.parse(payloadOf(page))).toEqual({ s: hostile });
  });

  test("throws the wrapped error for data JSON.stringify cannot serialize", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => doc({ body: "X", data: circular })).toThrow("[ssr] doc: data must be JSON-serializable");
    expect(() => doc({ body: streamOf("X"), data: circular })).toThrow("[ssr] doc: data must be JSON-serializable");
    expect(() => doc({ body: "X", data: () => 1 })).toThrow("[ssr] doc: data must be JSON-serializable");
  });

  test("emits a bag collected by ssr into <head> end-to-end (string mode)", () => {
    const head = ssr.head();
    const body = ssr(html`<div><title>Collected</title><meta name="description" content="d" /><style>a{color:red}</style><p>x</p></div>` as HellaNode, { head });
    expect(doc({ body, head, mount: "#app" }))
      .toBe("<!DOCTYPE html><html><head><title>Collected</title><meta name=\"description\" content=\"d\"><style>a{color:red}</style></head><body><div id=\"app\"><div><p>x</p></div></div></body></html>");
  });
});
