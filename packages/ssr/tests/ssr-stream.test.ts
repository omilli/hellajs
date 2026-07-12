import { describe, test, expect } from "bun:test";
import { signal } from "@hellajs/core";
import { html, ForEach, Transition, Portal, Lazy } from "@hellajs/dom/bundle";
import { ssr, ssrAsync, ssrStream } from "@hellajs/ssr/bundle";
import type { HellaNode } from "@hellajs/dom";

/** Collects all chunks from a ReadableStream<string> into a single string. */
async function collect(stream: ReadableStream<string>): Promise<string> {
  const reader = stream.getReader();
  let out = "";
  let chunk = await reader.read();
  while (!chunk.done) { out += chunk.value; chunk = await reader.read(); }
  return out;
}

describe("ssrStream", () => {
  test("returns a ReadableStream and resolves a static node to the same HTML as ssr", async () => {
    const stream = ssrStream(html`<div>hi</div>` as HellaNode);
    expect(stream instanceof ReadableStream).toBe(true);
    expect(await collect(stream)).toBe("<div>hi</div>");
  });

  test("stream/async parity: collecting ssrStream equals ssrAsync for non-Promise trees", async () => {
    const cases: HellaNode[] = [
      html`<div><span>hi</span>there</div>` as HellaNode,
      html`<ul><${ForEach} each=${[1, 2, 3]} use=${(n: number) => html`<li>${n}</li>`} /></ul>` as HellaNode,
      html`<div><${Transition} show=${true}>${html`<p>on</p>`}</${Transition}></div>` as HellaNode,
      html`<div><${Portal} to="#x">${html`<p>p</p>`}</${Portal}></div>` as HellaNode,
      html`<div><${Lazy} loader=${async () => html`<div />` as HellaNode} loading=${html`<span>…</span>`} /></div>` as HellaNode,
    ];
    for (const node of cases) {
      expect(await collect(ssrStream(node))).toBe(await ssrAsync(node));
    }
  });

  test("stream/sync parity for a signal child", async () => {
    const count = signal(5);
    const node = html`<p>${count}</p>` as HellaNode;
    expect(await collect(ssrStream(node))).toBe(ssr(node));
  });

  test("awaits a Promise-returning child in a marker-bounded region", async () => {
    expect(await collect(ssrStream(html`<p>${() => Promise.resolve(5)}</p>` as HellaNode)))
      .toBe("<p><!--[-->5<!--]--></p>");
  });

  test("awaits a Promise bind: value", async () => {
    expect(await collect(ssrStream(html`<input bind:value=${() => Promise.resolve("x")} />` as HellaNode)))
      .toBe('<input value="x">');
  });

  test("awaits a Promise-returning ForEach each", async () => {
    const node = html`<ul><${ForEach} each=${() => Promise.resolve([1, 2])} use=${(n: number) => html`<li>${n}</li>`} /></ul>` as HellaNode;
    expect(await collect(ssrStream(node))).toBe("<ul><!--[--><li>1</li><li>2</li><!--]--></ul>");
  });

  test("progressive flush: a non-empty chunk arrives before a delayed Promise resolves; >1 chunk total", async () => {
    let resolveLate!: () => void;
    const delayed = new Promise<string>((r) => { resolveLate = () => r("late"); });
    const stream = ssrStream(html`<div>before${() => delayed}after</div>` as HellaNode);
    const reader = stream.getReader();
    const first = await reader.read();            // arrives WITHOUT resolveLate() → progressive flush
    expect(first.done).toBe(false);
    expect((first.value ?? "").length).toBeGreaterThan(0);
    resolveLate();                                 // let the delayed value settle
    let all = first.value ?? "";
    let chunks = 1;
    let chunk = await reader.read();
    while (!chunk.done) { all += chunk.value; chunks++; chunk = await reader.read(); }
    expect(chunks).toBeGreaterThan(1);
    expect(all).toBe(await ssrAsync(html`<div>before${() => "late"}after</div>` as HellaNode));
  });

  test("cancel stops the generator (best-effort, no throw)", async () => {
    let resolveLate!: () => void;
    const delayed = new Promise<string>((r) => { resolveLate = () => r("late"); });
    const stream = ssrStream(html`<div>${() => delayed}</div>` as HellaNode);
    const reader = stream.getReader();
    await reader.read();                          // consume the first chunk
    await reader.cancel();                        // cancel → source cancel() → gen.return()
    resolveLate();                                // resolving the orphaned Promise does not throw
    expect(true).toBe(true);
  });

  test("a rejected Promise errors the stream", async () => {
    await expect(collect(ssrStream(html`<p>${() => Promise.reject(new Error("boom"))}</p>` as HellaNode))).rejects.toThrow("boom");
  });

  test("marks a fragment child among siblings (fragment-child branch)", async () => {
    expect(await collect(ssrStream(html`<div>a${html`<b></b><c></c>`}d</div>` as HellaNode)))
      .toBe("<div>a<!--[--><b></b><c></c><!--]-->d</div>");
  });

  test("serializes a fragment root without markers (fragment-root branch)", async () => {
    expect(await collect(ssrStream(html`<a></a><b></b>` as HellaNode))).toBe("<a></a><b></b>");
  });

  test("pipeThrough(new TextEncoderStream()) yields a byte stream (Response-shaped)", async () => {
    const bytes = ssrStream(html`<div>x</div>` as HellaNode).pipeThrough(new TextEncoderStream());
    const reader = bytes.getReader();
    const decoder = new TextDecoder();
    let out = "";
    let chunk = await reader.read();
    while (!chunk.done) { out += decoder.decode(chunk.value); chunk = await reader.read(); }
    expect(out).toBe("<div>x</div>");
  });
});
