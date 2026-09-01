import { describe, test, expect, mock } from "bun:test";
import { signal } from "@hellajs/core";
import { delay, suppressConsole } from "@utils/test-helpers.js";
import { html, ForEach, Transition, Portal, Lazy, Suspense } from "@hellajs/dom/bundle";
import { ssr } from "@hellajs/ssr/bundle";
import type { HellaNode } from "@hellajs/dom";
import { collect, parityCases, attributeCases, unknownKindNode, headParityCases } from "./helpers";

/** Stream/async parity cases — collecting `ssr.stream` must equal `ssr.async` (a distinct comparison from the `ssr` parity matrix). */
const streamAsyncParityCases: { name: string; node: HellaNode }[] = [
  { name: "static tree", node: html`<div><span>hi</span>there</div>` as HellaNode },
  { name: "ForEach", node: html`<ul><${ForEach} each=${[1, 2, 3]} use=${(n: number) => html`<li>${n}</li>`} /></ul>` as HellaNode },
  { name: "Transition", node: html`<div><${Transition} show=${true}>${html`<p>on</p>`}</${Transition}></div>` as HellaNode },
  { name: "Portal", node: html`<div><${Portal} to="#x">${html`<p>p</p>`}</${Portal}></div>` as HellaNode },
  { name: "Lazy loaded component (loader awaited)", node: html`<div><${Lazy} loader=${() => Promise.resolve(html`<b>L</b>` as HellaNode)} loading=${html`<span>…</span>`} /></div>` as HellaNode },
];

describe("ssr.stream", () => {
  test("returns a ReadableStream", () => {
    expect(ssr.stream(html`<div>hi</div>` as HellaNode) instanceof ReadableStream).toBe(true);
  });

  test("resolves a static node to the same HTML as ssr", async () => {
    expect(await collect(ssr.stream(html`<div>hi</div>` as HellaNode))).toBe("<div>hi</div>");
  });

  test.each(streamAsyncParityCases)("stream/async parity: collecting ssr.stream equals ssr.async for $name", async ({ node }) => {
    expect(await collect(ssr.stream(node))).toBe(await ssr.async(node));
  });

  test("stream/sync parity for a signal child", async () => {
    const count = signal(5);
    const node = html`<p>${count}</p>` as HellaNode;
    expect(await collect(ssr.stream(node))).toBe(ssr(node));
  });

  test("awaits a Promise-returning child in a marker-bounded region", async () => {
    expect(await collect(ssr.stream(html`<p>${() => Promise.resolve(5)}</p>` as HellaNode)))
      .toBe("<p><!--[-->5<!--]--></p>");
  });

  test("awaits a Promise function-ref prop value", async () => {
    expect(await collect(ssr.stream(html`<input value=${() => Promise.resolve("x")} />` as HellaNode)))
      .toBe('<input value="x">');
  });

  test("awaits a Promise-returning ForEach each", async () => {
    const node = html`<ul><${ForEach} each=${() => Promise.resolve([1, 2])} use=${(n: number) => html`<li>${n}</li>`} /></ul>` as HellaNode;
    expect(await collect(ssr.stream(node))).toBe("<ul><!--[--><li>1</li><li>2</li><!--]--></ul>");
  });

  test("progressive flush: a non-empty chunk arrives before a delayed Promise resolves; >1 chunk total", async () => {
    let resolveLate!: () => void;
    const delayed = new Promise<string>((r) => { resolveLate = () => r("late"); });
    const stream = ssr.stream(html`<div>before${() => delayed}after</div>` as HellaNode);
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
    expect(all).toBe(await ssr.async(html`<div>before${() => "late"}after</div>` as HellaNode));
  });

  test("advances the walk only on pulls — the producer stays parked while the consumer idles (backpressure)", async () => {
    const step = mock(() => Promise.resolve("x"));   // each call = the walk reached that child
    const node = html`<div>${step}${step}${step}${step}${step}${step}</div>` as HellaNode;
    const reader = ssr.stream(node).getReader();
    const first = await reader.read();             // consume exactly one chunk, then idle with no read pending
    expect(first.done).toBe(false);
    await delay(25);                                // a start()-driven drain finishes all six getters inside this window
    expect(step.mock.calls.length).toBeLessThanOrEqual(2);   // read-ahead bounded by the queue high-water mark, not the full walk
    let chunk = await reader.read();                // resume consuming — the walk advances with the reads
    while (!chunk.done) { chunk = await reader.read(); }
    expect(step.mock.calls.length).toBe(6);         // every child walked once the stream is fully consumed
  });

  test("cancel stops the generator (best-effort, no throw)", async () => {
    let resolveLate!: () => void;
    const delayed = new Promise<string>((r) => { resolveLate = () => r("late"); });
    const stream = ssr.stream(html`<div>${() => delayed}</div>` as HellaNode);
    const reader = stream.getReader();
    await reader.read();                          // consume the first chunk
    await reader.cancel();                        // cancel → source cancel() → gen.return()
    resolveLate();                                // resolving the orphaned Promise does not throw
  });

  test("cancel terminates staged <Suspense> swap generators (best-effort, no throw)", async () => {
    let resolveLate!: (v: HellaNode) => void;
    const delayed = new Promise<HellaNode>((r) => { resolveLate = r; });
    const node = html`<div><${Suspense} fallback=${html`<i>wait</i>`}>${() => delayed}</${Suspense}></div>` as HellaNode;
    const reader = ssr.stream(node).getReader();
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
    const reader = ssr.stream(node).getReader();

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

  test("concurrent swaps: a rejecting region is skipped (fallback + sentinel remain) while the healthy sibling still streams", async () => {
    const node = html`<div><${Suspense} fallback=${html`<i>boom</i>`}>${() => Promise.reject(new Error("boom"))}</${Suspense}><${Suspense} fallback=${html`<i>ok</i>`}>${() => Promise.resolve(html`<b>OK</b>`)}</${Suspense}></div>` as HellaNode;
    const sup = suppressConsole();                             // the skip warn — the failed region no longer errors the stream
    let out: string;
    try {
      out = await collect(ssr.stream(node));
    } finally {
      sup.restore();
    }
    const boomId = out.match(/<i>boom<\/i><!--(hs\d+)-->/)![1]!;   // ids come from a global counter — extract, never hardcode
    const okId = out.match(/<i>ok<\/i><!--(hs\d+)-->/)![1]!;
    expect(out).toContain("</div>");                               // main walk flushed — the stream completed (collect resolved)
    expect(out).toContain(`<i>boom</i><!--${boomId}-->`);          // failed region's fallback + sentinel remain in the shell
    expect(out).not.toContain(`<template id="${boomId}"`);        // its <template> is never emitted — hydrate re-suspends that region
    expect(out.endsWith(`<template id="${okId}"><!--[--><b>OK</b><!--]--></template><script>$hs("${okId}")</script>`)).toBe(true);  // healthy sibling's exact staged shape closed the stream
    expect(sup.warns).toHaveLength(1);
    expect(sup.warns[0]![0]).toBe(`[ssr] suspense region ${boomId} failed - template skipped; hydrate will re-suspend it`);
  });

  test("ssr.stream emits the $hs bootstrap once before staged templates, and not at all without <Suspense>", async () => {
    const node = html`<div><${Suspense} fallback=${html`<i>wait</i>`}>${() => Promise.resolve(html`<b>x</b>`)}</${Suspense}></div>` as HellaNode;
    const out = await collect(ssr.stream(node));
    const boots = [...out.matchAll(/<script>(function \$hs[\s\S]*?)<\/script>/g)];
    expect(boots).toHaveLength(1);                                                      // bootstrap emitted exactly once
    expect(out.indexOf('<script>function $hs')).toBeLessThan(out.indexOf('<template id="')); // bootstrap precedes the templates
    const id = out.match(/<!--(hs\d+)-->/)![1]!;                                         // actual sentinel id (monotonic counter — never hardcode)
    expect(out).toContain(`<script>$hs("${id}")</script>`);                              // region followed by its swap script
    // without <Suspense>: no bootstrap, no swap script (output byte-identical to a non-Suspense stream)
    const plain = await collect(ssr.stream(html`<div><b>hi</b></div>` as HellaNode));
    expect(plain).not.toContain('$hs');
    expect(plain).not.toContain('<script>');
  });

  test("each staged <Suspense> template is followed by its own $hs swap script (id matches)", async () => {
    const node = html`<div><${Suspense} fallback=${html`<i>a</i>`}>${() => Promise.resolve(html`<b>A</b>`)}</${Suspense}><${Suspense} fallback=${html`<i>b</i>`}>${() => Promise.resolve(html`<b>B</b>`)}</${Suspense}></div>` as HellaNode;
    const out = await collect(ssr.stream(node));
    const ids = [...out.matchAll(/<!--(hs\d+)-->/g)].map((m) => m[1]!);
    expect(ids).toHaveLength(2);
    for (const id of ids) {
      expect(out).toContain(`<template id="${id}">`);                  // each region's template
      expect(out).toContain(`</template><script>$hs("${id}")</script>`); // followed by its matching swap script
    }
    expect(out).toContain("<b>A</b>");
    expect(out).toContain("<b>B</b>");
  });

  test("threads a CSP nonce onto the $hs bootstrap and every per-swap script", async () => {
    const node = html`<div><${Suspense} fallback=${html`<i>a</i>`}>${() => Promise.resolve(html`<b>A</b>`)}</${Suspense}><${Suspense} fallback=${html`<i>b</i>`}>${() => Promise.resolve(html`<b>B</b>`)}</${Suspense}></div>` as HellaNode;
    const out = await collect(ssr.stream(node, { nonce: "a1b2c3" }));
    const attrs = [...out.matchAll(/<script([^>]*)>/g)].map((m) => m[1]!);
    expect(attrs).toHaveLength(3);                                    // the bootstrap + one swap script per staged region
    for (const attr of attrs) {
      expect(attr).toBe(' nonce="a1b2c3"');   // every emitted script carries the nonce — and nothing else
    }
    const ids = [...out.matchAll(/<!--(hs\d+)-->/g)].map((m) => m[1]!);
    for (const id of ids) {
      expect(out).toContain(`</template><script nonce="a1b2c3">$hs("${id}")</script>`);   // each swap still well-formed
    }
    const last = ids[ids.length - 1]!;
    expect(out.endsWith(`<template id="${last}"><!--[--><b>B</b><!--]--></template><script nonce="a1b2c3">$hs("${last}")</script>`)).toBe(true);  // nonce'd staged tail closes the stream
  });

  test("omits the nonce attribute entirely without a nonce option (staged output unchanged)", async () => {
    const node = () => html`<div><${Suspense} fallback=${html`<i>wait</i>`}>${() => Promise.resolve(html`<b>x</b>`)}</${Suspense}></div>` as HellaNode;
    const bare = await collect(ssr.stream(node()));
    const emptyOpts = await collect(ssr.stream(node(), {}));
    const id = bare.match(/<!--(hs\d+)-->/)![1]!;
    expect(bare).not.toContain("nonce=");                             // unattributed — no nonce anywhere
    expect(bare.indexOf("<script>function $hs")).toBeLessThan(bare.indexOf(`<template id="${id}">`));   // pre-change bootstrap shape, unattributed
    expect(bare.endsWith(`<template id="${id}"><!--[--><b>x</b><!--]--></template><script>$hs("${id}")</script>`)).toBe(true);  // pre-change staged tail byte-for-byte
    expect(emptyOpts.replace(/hs\d+/g, "hs")).toBe(bare.replace(/hs\d+/g, "hs"));   // {} ≡ no options (ids come from a global counter — normalized)
  });

  test("Lazy outside <Suspense> awaits in-order: the loader gates trailing markup", async () => {
    let resolveLate!: () => void;
    const loader = () => new Promise<void>((r) => { resolveLate = r; }).then(() => html`<b>L</b>` as HellaNode);
    const reader = ssr.stream(html`<div>before<${Lazy} loader=${loader} />after</div>` as HellaNode).getReader();
    let pre = "";
    let chunk = await reader.read();
    while (!chunk.done) { pre += chunk.value; if (pre.includes("<!--[-->")) break; chunk = await reader.read(); }  // drain until the lazy region opens — the walk suspends at the loader
    expect(pre).toBe("<div>before<!--[-->");                  // exact flush point: prefix + region open, nothing past it
    expect(pre).not.toContain("after");
    await delay(0);                       // pull-driven: the loader runs on the NEXT pull (after this read resolves) — yield a tick so it's invoked before release
    resolveLate();
    let all = pre;
    chunk = await reader.read();
    while (!chunk.done) { all += chunk.value; chunk = await reader.read(); }
    expect(all).toBe("<div>before<!--[--><b>L</b><!--]-->after</div>");
  });

  test("Lazy inside <Suspense> resolves within the staged <template>", async () => {
    const node = html`<div><${Suspense} fallback=${html`<i>wait</i>`}><${Lazy} loader=${() => Promise.resolve(html`<b>L</b>` as HellaNode)} loading=${html`<span>…</span>`} /></${Suspense}></div>` as HellaNode;
    const out = await collect(ssr.stream(node));
    const id = out.match(/<!--(hs\d+)-->/)![1]!;
    expect(out).toContain("<i>wait</i>");                                        // fallback flushed in the shell
    expect(out).toContain(`<template id="${id}"><!--[--><b>L</b><!--]--></template><script>$hs("${id}")</script>`);  // loader resolved inside the staged template
  });

  test("a rejected Promise errors the stream", async () => {
    await expect(collect(ssr.stream(html`<p>${() => Promise.reject(new Error("boom"))}</p>` as HellaNode))).rejects.toThrow("boom");
  });

  test("marks a fragment child among siblings (fragment-child branch)", async () => {
    expect(await collect(ssr.stream(html`<div>a${html`<b></b><c></c>`}d</div>` as HellaNode)))
      .toBe("<div>a<!--[--><b></b><c></c><!--]-->d</div>");
  });

  test("serializes a fragment root without markers (fragment-root branch)", async () => {
    expect(await collect(ssr.stream(html`<a></a><b></b>` as HellaNode))).toBe("<a></a><b></b>");
  });

  test("pipeThrough(new TextEncoderStream()) yields a byte stream (Response-shaped)", async () => {
    const bytes = ssr.stream(html`<div>x</div>` as HellaNode).pipeThrough(new TextEncoderStream());
    const reader = bytes.getReader();
    const decoder = new TextDecoder();
    let out = "";
    let chunk = await reader.read();
    while (!chunk.done) { out += decoder.decode(chunk.value); chunk = await reader.read(); }
    expect(out).toBe("<div>x</div>");
  });

  test("throws when node is null", () => {
    expect(() => ssr.stream(null as unknown as HellaNode)).toThrow("[ssr] ssr.stream: node is required");
  });

  test("throws synchronously when the root is a function (uninvoked component)", () => {
    expect(() => ssr.stream((() => ({ tag: "div" })) as unknown as HellaNode)).toThrow(/^\[ssr\] ssr\.stream: node must be a HellaNode/);
  });

  test.each(parityCases)("parity: collecting ssr.stream matches ssr for $name", async ({ node }) => {
    expect(await collect(ssr.stream(node))).toBe(ssr(node));
  });

  test("parity: collecting ssr.stream matches ssr for an isDynamic function with an unknown kind", async () => {
    const original = console.warn;
    console.warn = mock(() => {}) as unknown as typeof console.warn;
    try {
      expect(await collect(ssr.stream(unknownKindNode()))).toBe(ssr(unknownKindNode()));
    } finally {
      console.warn = original;
    }
  });

  test.each(attributeCases)("parity: collecting ssr.stream matches ssr for attribute serialization ($name)", async ({ node }) => {
    expect(await collect(ssr.stream(node))).toBe(ssr(node));
  });

  test("fills the head bag during the stream and omits hoisted tags from the chunks", async () => {
    // Stream limitation: the bag fills as the walk proceeds, but a streamed document emits its <head>
    // up front (doc's prefix) — collected entries are post-hoc; streaming callers pass head entries to
    // `doc` explicitly. See the ssr reference's stream section.
    const head = ssr.head();
    const node = html`<div><title>Stream</title><meta charset="utf-8" /><p>body</p></div>` as HellaNode;
    expect(await collect(ssr.stream(node, { head }))).toBe("<div><p>body</p></div>");   // hoisted tags absent from the stream
    expect(head.title).toBe("Stream");
    expect(head.meta).toEqual([{ charset: "utf-8" }]);
  });

  test.each(headParityCases)("head parity: collecting ssr.stream matches ssr for $name", async ({ node }) => {
    const syncBag = ssr.head();
    const streamBag = ssr.head();
    const syncBody = ssr(node, { head: syncBag });
    expect(await collect(ssr.stream(node, { head: streamBag }))).toBe(syncBody);   // identical body HTML…
    expect(streamBag).toEqual(syncBag);                                           // …and identical resulting bag
  });
});
