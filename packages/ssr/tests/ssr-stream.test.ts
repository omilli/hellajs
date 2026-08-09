import { describe, test, expect, mock } from "bun:test";
import { signal } from "@hellajs/core";
import { html, ForEach, Transition, Portal, Lazy, Suspense } from "@hellajs/dom/bundle";
import { ssr, ssrAsync, ssrStream } from "@hellajs/ssr/bundle";
import type { HellaNode } from "@hellajs/dom";
import { collect, parityCases, attributeCases, unknownKindNode } from "./helpers";
import { delay } from "@utils/test-helpers.js";

/** Stream/async parity cases — collecting `ssrStream` must equal `ssrAsync` (a distinct comparison from the `ssr` parity matrix). */
const streamAsyncParityCases: { name: string; node: HellaNode }[] = [
  { name: "static tree", node: html`<div><span>hi</span>there</div>` as HellaNode },
  { name: "ForEach", node: html`<ul><${ForEach} each=${[1, 2, 3]} use=${(n: number) => html`<li>${n}</li>`} /></ul>` as HellaNode },
  { name: "Transition", node: html`<div><${Transition} show=${true}>${html`<p>on</p>`}</${Transition}></div>` as HellaNode },
  { name: "Portal", node: html`<div><${Portal} to="#x">${html`<p>p</p>`}</${Portal}></div>` as HellaNode },
  { name: "Lazy loading fallback", node: html`<div><${Lazy} loader=${async () => html`<div />` as HellaNode} loading=${html`<span>…</span>`} /></div>` as HellaNode },
];

describe("ssrStream", () => {
  test("returns a ReadableStream", () => {
    expect(ssrStream(html`<div>hi</div>` as HellaNode) instanceof ReadableStream).toBe(true);
  });

  test("resolves a static node to the same HTML as ssr", async () => {
    expect(await collect(ssrStream(html`<div>hi</div>` as HellaNode))).toBe("<div>hi</div>");
  });

  test.each(streamAsyncParityCases)("stream/async parity: collecting ssrStream equals ssrAsync for $name", async ({ node }) => {
    expect(await collect(ssrStream(node))).toBe(await ssrAsync(node));
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

  test("awaits a Promise function-ref prop value", async () => {
    expect(await collect(ssrStream(html`<input value=${() => Promise.resolve("x")} />` as HellaNode)))
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
  });

  test("cancel terminates staged <Suspense> swap generators (best-effort, no throw)", async () => {
    let resolveLate!: (v: HellaNode) => void;
    const delayed = new Promise<HellaNode>((r) => { resolveLate = r; });
    const node = html`<div><${Suspense} fallback=${html`<i>wait</i>`}>${() => delayed}</${Suspense}></div>` as HellaNode;
    const reader = ssrStream(node).getReader();
    let pre = "";
    let chunk = await reader.read();
    while (!chunk.done) { pre += chunk.value; if (pre.includes("<!--hs")) break; chunk = await reader.read(); }  // drain until the staged-swap sentinel flushes
    expect(pre).toContain("<i>wait</i>");          // fallback flushed before cancel
    await delay(0);                          // let start() resume past the sentinel → pending.push + enter the flush await
    await reader.cancel();                          // cancel → gen.return() + staged swap generators returned
    resolveLate(html`<b>late</b>` as HellaNode);    // the orphaned swap childGen is already returned → does not resume or throw
  });

  test("concurrent swaps: a slow region above a fast one does not hold the fast region's <template> back (completion order)", async () => {
    let resolveSlow!: () => void;
    let resolveFast!: () => void;
    const slow = new Promise<void>((r) => { resolveSlow = r; });
    const fast = new Promise<void>((r) => { resolveFast = r; });
    // slow region on TOP, fast BELOW — under sequential (tree-order) collection the slow region
    // would block the fast region's resolved <template> from streaming until slow resolves.
    const node = html`<div><${Suspense} fallback=${html`<i>slow</i>`}>${() => slow.then(() => html`<b>SLOW</b>`)}</${Suspense}><${Suspense} fallback=${html`<i>fast</i>`}>${() => fast.then(() => html`<b>FAST</b>`)}</${Suspense}></div>` as HellaNode;
    const reader = ssrStream(node).getReader();

    resolveFast();                              // fast resolves first; slow stays pending
    let buf = "";
    let chunk = await reader.read();
    while (!chunk.done) { buf += chunk.value; if (buf.includes("<b>FAST</b>")) break; chunk = await reader.read(); }
    expect(buf).toContain("<b>FAST</b>");        // fast region's <template> streamed…
    expect(buf).not.toContain("<b>SLOW</b>");    // …while slow is still pending — completion order, not tree order

    resolveSlow();                              // now slow resolves
    let rest = buf;
    chunk = await reader.read();
    while (!chunk.done) { rest += chunk.value; chunk = await reader.read(); }
    expect(rest).toContain("<b>SLOW</b>");                                      // slow <template> streamed, stream closed
    expect(rest.indexOf("<b>FAST</b>")).toBeLessThan(rest.indexOf("<b>SLOW</b>"));  // FAST enqueued before SLOW
  });

  test("concurrent swaps: a rejecting region errors the stream; a still-pending sibling's late enqueue is skipped (done guard)", async () => {
    let resolveSibling!: () => void;
    const sibling = new Promise<void>((r) => { resolveSibling = r; });
    const node = html`<div><${Suspense} fallback=${html`<i>boom</i>`}>${() => Promise.reject(new Error("boom"))}</${Suspense}><${Suspense} fallback=${html`<i>ok</i>`}>${() => sibling.then(() => html`<b>OK</b>`)}</${Suspense}></div>` as HellaNode;
    const reader = ssrStream(node).getReader();
    // drain the prefix (shell + fallbacks + sentinels + closing tags); start() then enters Promise.all,
    // the rejecting region throws → done=true + controller.error. The sibling is still pending.
    let err: unknown = undefined;
    try {
      let chunk = await reader.read();
      while (!chunk.done) { chunk = await reader.read(); }
    } catch (e) { err = e; }
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toBe("boom");
    resolveSibling();                           // sibling resolves AFTER the stream errored → its enqueue hits the `done` guard and is skipped (no throw)
    await delay(0);                             // let the skipped-enqueue microtask run — proves no throw into the errored stream
  });

  test("ssrStream emits the $hs bootstrap once before staged templates, and not at all without <Suspense>", async () => {
    const node = html`<div><${Suspense} fallback=${html`<i>wait</i>`}>${() => Promise.resolve(html`<b>x</b>`)}</${Suspense}></div>` as HellaNode;
    const out = await collect(ssrStream(node));
    const boots = [...out.matchAll(/<script>(function \$hs[\s\S]*?)<\/script>/g)];
    expect(boots).toHaveLength(1);                                                      // bootstrap emitted exactly once
    expect(out.indexOf('<script>function $hs')).toBeLessThan(out.indexOf('<template id="')); // bootstrap precedes the templates
    const id = out.match(/<!--(hs\d+)-->/)![1]!;                                         // actual sentinel id (monotonic counter — never hardcode)
    expect(out).toContain(`<script>$hs("${id}")</script>`);                              // region followed by its swap script
    // without <Suspense>: no bootstrap, no swap script (output byte-identical to a non-Suspense stream)
    const plain = await collect(ssrStream(html`<div><b>hi</b></div>` as HellaNode));
    expect(plain).not.toContain('$hs');
    expect(plain).not.toContain('<script>');
  });

  test("each staged <Suspense> template is followed by its own $hs swap script (id matches)", async () => {
    const node = html`<div><${Suspense} fallback=${html`<i>a</i>`}>${() => Promise.resolve(html`<b>A</b>`)}</${Suspense}><${Suspense} fallback=${html`<i>b</i>`}>${() => Promise.resolve(html`<b>B</b>`)}</${Suspense}></div>` as HellaNode;
    const out = await collect(ssrStream(node));
    const ids = [...out.matchAll(/<!--(hs\d+)-->/g)].map((m) => m[1]!);
    expect(ids).toHaveLength(2);
    for (const id of ids) {
      expect(out).toContain(`<template id="${id}">`);                  // each region's template
      expect(out).toContain(`</template><script>$hs("${id}")</script>`); // followed by its matching swap script
    }
    expect(out).toContain("<b>A</b>");
    expect(out).toContain("<b>B</b>");
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

  test("throws when node is null", () => {
    expect(() => ssrStream(null as unknown as HellaNode)).toThrow("[ssr] ssrStream: node is required");
  });

  test.each(parityCases)("parity: collecting ssrStream matches ssr for $name", async ({ node }) => {
    expect(await collect(ssrStream(node))).toBe(ssr(node));
  });

  test("parity: collecting ssrStream matches ssr for an isDynamic function with an unknown kind", async () => {
    const original = console.warn;
    console.warn = mock(() => {}) as unknown as typeof console.warn;
    try {
      expect(await collect(ssrStream(unknownKindNode()))).toBe(ssr(unknownKindNode()));
    } finally {
      console.warn = original;
    }
  });

  test.each(attributeCases)("parity: collecting ssrStream matches ssr for attribute serialization ($name)", async ({ node }) => {
    expect(await collect(ssrStream(node))).toBe(ssr(node));
  });
});
