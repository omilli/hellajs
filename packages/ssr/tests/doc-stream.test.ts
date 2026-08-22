import { describe, test, expect, mock } from "bun:test";
import { html, Suspense } from "@hellajs/dom/bundle";
import { ssrStream, docStream } from "@hellajs/ssr/bundle";
import type { HellaNode } from "@hellajs/dom";
import { collect } from "./helpers";
import { delay } from "@utils/test-helpers.js";

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

describe("docStream", () => {
  test("wraps streamed body chunks in the full document skeleton, in emission order", async () => {
    expect(await collect(docStream({ body: streamOf("a", "b", "c") }))).toBe("<!DOCTYPE html><html><head></head><body>abc</body></html>");
  });

  test("emits <html lang> when lang is set", async () => {
    expect(await collect(docStream({ body: streamOf("X"), lang: "en" }))).toBe("<!DOCTYPE html><html lang=\"en\"><head></head><body>X</body></html>");
  });

  test("emits a bare <html> when lang is unset", async () => {
    expect(await collect(docStream({ body: streamOf("X") }))).toContain("<html>");
  });

  test("renders the head through the shared builder", async () => {
    const out = await collect(docStream({
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

  test("wraps the body in <div id=\"app\"> for an id-only mount", async () => {
    expect(await collect(docStream({ body: streamOf("X"), mount: "#app" }))).toContain("<body><div id=\"app\">X</div></body>");
  });

  test("emits the mount's tag for a tag#id mount", async () => {
    expect(await collect(docStream({ body: streamOf("X"), mount: "main#app" }))).toContain("<body><main id=\"app\">X</main></body>");
  });

  test("joins class mounts with spaces", async () => {
    expect(await collect(docStream({ body: streamOf("X"), mount: ".wrap.x" }))).toContain("<body><div class=\"wrap x\">X</div></body>");
  });

  test("throws the mount error on unsupported selectors", () => {
    for (const mount of ["a > b", "[x]", ":hover", "", "#a#b", "#a[x]", ".a[x]"]) {
      expect(() => docStream({ body: streamOf("X"), mount })).toThrow(`[ssr] docStream: mount supports tag/#id/.class only, received "${mount}"`);
    }
  });

  test("throws when body is missing", () => {
    expect(() => docStream({} as unknown as { body: ReadableStream<string> })).toThrow("[ssr] docStream: body is required, received undefined");
  });

  test("errors the document stream when the body stream errors", async () => {
    const body = new ReadableStream<string>({
      start(controller) { controller.error(new Error("boom")); },
    });
    expect(collect(docStream({ body }))).rejects.toThrow("boom");
  });

  test("cancels the body stream when the document stream is cancelled", async () => {
    const cancelBody = mock(() => {});
    const body = new ReadableStream<string>({ cancel: cancelBody });
    const stream = docStream({ body });
    await stream.getReader().cancel("gone");
    expect(cancelBody).toHaveBeenCalledTimes(1);
  });

  test("holds the suffix until staged <Suspense> swaps flush", async () => {
    const node = html`<div><${Suspense} fallback=${html`<i>wait</i>`}>${() => delay(5).then(() => html`<b>late</b>`)}</${Suspense}></div>` as HellaNode;
    const chunks = await collectChunks(docStream({ mount: "#app", body: ssrStream(node) }));
    expect(chunks[chunks.length - 1]!).toBe("</div></body></html>");
    const swapIndex = chunks.findIndex((chunk) => chunk.includes("<template id=\"hs"));
    expect(swapIndex).toBeGreaterThan(-1);
    expect(swapIndex).toBeLessThan(chunks.length - 1);
  });
});
