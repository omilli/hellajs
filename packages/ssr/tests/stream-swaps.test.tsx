import { describe, test, expect } from "vite-plus/test";
import { delay, suppressConsole } from "@utils/test-helpers.js";
import { Lazy, Suspense } from "@hellajs/dom";
import { ssr } from "@hellajs/ssr";
import type { HellaNode } from "@hellajs/dom";
import { collect, extractSwapIds } from "./helpers";

describe("ssr.stream staged swaps", () => {
  test("cancel terminates staged <Suspense> swap generators (best-effort, no throw)", async () => {
    let resolveLate!: (v: HellaNode) => void;
    const delayed = new Promise<HellaNode>((r) => {
      resolveLate = r;
    });
    const node = (
      <div>
        <Suspense fallback={<i>wait</i>}>{() => delayed}</Suspense>
      </div>
    );
    const reader = ssr.stream(node).getReader();
    let pre = "";
    let chunk = await reader.read();
    while (!chunk.done) {
      pre += chunk.value;
      if (pre.includes("<!--hs")) break;
      chunk = await reader.read();
    } // drain until the staged-swap sentinel flushes
    expect(pre).toContain("<i>wait</i>"); // fallback flushed before cancel
    await delay(0); // let start() resume past the sentinel → pending.push + enter the flush await
    await reader.cancel(); // cancel → gen.return() + staged swap generators returned
    resolveLate(<b>late</b>); // the orphaned swap childGen is already returned → does not resume or throw
  });

  test("a parked pull wakes when a staged swap appends", async () => {
    let resolveLate!: (v: HellaNode) => void;
    const delayed = new Promise<HellaNode>((r) => {
      resolveLate = r;
    });
    const node = (
      <div>
        <Suspense fallback={<i>wait</i>}>{() => delayed}</Suspense>
      </div>
    );
    const reader = ssr.stream(node).getReader();
    let pre = "";
    let chunk = await reader.read();
    while (!chunk.done) {
      pre += chunk.value;
      if (pre.includes("function $hs")) break; // flush preamble (bootstrap) consumed — only staged-swap appends can follow
      chunk = await reader.read();
    }
    const parked = reader.read(); // pull runs: queue empty, main walk done, swap pending → parks
    await delay(0); // macrotask — the pull has parked before the release (idiom of the cancel-staged test)
    resolveLate(<b>late</b>);
    const woken = await parked; // the append wakes the parked pull
    expect(woken.done).toBe(false);
    expect(woken.value).toContain("<b>late</b>");
    let rest = woken.value ?? "";
    chunk = await reader.read();
    while (!chunk.done) {
      rest += chunk.value;
      chunk = await reader.read();
    }
    const id = extractSwapIds(pre).sentinels[0]!; // actual sentinel id (monotonic counter — never hardcode)
    expect(rest).toContain(
      `<template id="${id}"><!--[--><b>late</b><!--]--></template><script>$hs("${id}")</script>`,
    );
  });

  test("a parked pull is woken closed when every staged swap rejects (no hang)", async () => {
    const { promise: delayed, reject: rejectLate } = Promise.withResolvers<HellaNode>();
    const node = (
      <div>
        <Suspense fallback={<i>wait</i>}>{() => delayed}</Suspense>
      </div>
    );
    const reader = ssr.stream(node).getReader();
    let pre = "";
    let chunk = await reader.read();
    while (!chunk.done) {
      pre += chunk.value;
      if (pre.includes("function $hs")) break; // flush preamble consumed — the drain is in flight
      chunk = await reader.read();
    }
    expect(pre).toContain("<i>wait</i>"); // fallback flushed in the shell
    const sup = suppressConsole(); // the skip warn — the failed region no longer errors the stream
    try {
      const parked = reader.read(); // pull runs: queue empty, main walk done, drain in flight → parks
      await delay(0); // macrotask — the pull has parked before the rejection lands
      rejectLate(new Error("boom"));
      const closed = await parked; // all drains settle without appending → the settled-close wake closes it
      expect(closed.done).toBe(true);
      expect(sup.warns).toHaveLength(1); // the rejection took the isolated skip path (fallback + sentinel remain)
    } finally {
      sup.restore();
    }
  });

  test("concurrent swaps: a slow region above a fast one does not hold the fast region's <template> back (completion order)", async () => {
    let resolveSlow!: () => void;
    let resolveFast!: () => void;
    const slow = new Promise<void>((r) => {
      resolveSlow = r;
    });
    const fast = new Promise<void>((r) => {
      resolveFast = r;
    });
    // slow region on TOP, fast BELOW — under sequential (tree-order) collection the slow region
    // would block the fast region's resolved <template> from streaming until slow resolves.
    const node = (
      <div>
        <Suspense fallback={<i>slow</i>}>{() => slow.then(() => <b>SLOW</b>)}</Suspense>
        <Suspense fallback={<i>fast</i>}>{() => fast.then(() => <b>FAST</b>)}</Suspense>
      </div>
    );
    const reader = ssr.stream(node).getReader();

    resolveFast(); // fast resolves first; slow stays pending
    let buf = "";
    let chunk = await reader.read();
    while (!chunk.done) {
      buf += chunk.value;
      if (buf.includes("<b>FAST</b>")) break;
      chunk = await reader.read();
    }
    expect(buf).toContain("<b>FAST</b>"); // fast region's <template> streamed…
    expect(buf).not.toContain("<b>SLOW</b>"); // …while slow is still pending — completion order, not tree order

    resolveSlow(); // now slow resolves
    let rest = buf;
    chunk = await reader.read();
    while (!chunk.done) {
      rest += chunk.value;
      chunk = await reader.read();
    }
    expect(rest).toContain("<b>SLOW</b>"); // slow <template> streamed, stream closed
    expect(rest.indexOf("<b>FAST</b>")).toBeLessThan(rest.indexOf("<b>SLOW</b>")); // FAST enqueued before SLOW
  });

  test("concurrent swaps: a rejecting region is skipped (fallback + sentinel remain) while the healthy sibling still streams", async () => {
    const node = (
      <div>
        <Suspense fallback={<i>boom</i>}>{() => Promise.reject(new Error("boom"))}</Suspense>
        <Suspense fallback={<i>ok</i>}>{() => Promise.resolve(<b>OK</b>)}</Suspense>
      </div>
    );
    const sup = suppressConsole(); // the skip warn — the failed region no longer errors the stream
    let out: string;
    try {
      out = await collect(ssr.stream(node));
    } finally {
      sup.restore();
    }
    const boomId = out.match(/<i>boom<\/i><!--(hs\d+)-->/)![1]!; // ids come from a global counter — extract, never hardcode
    const okId = out.match(/<i>ok<\/i><!--(hs\d+)-->/)![1]!;
    expect(out).toContain("</div>"); // main walk flushed — the stream completed (collect resolved)
    expect(out).toContain(`<i>boom</i><!--${boomId}-->`); // failed region's fallback + sentinel remain in the shell
    expect(out).not.toContain(`<template id="${boomId}"`); // its <template> is never emitted — hydrate re-suspends that region
    expect(
      out.endsWith(
        `<template id="${okId}"><!--[--><b>OK</b><!--]--></template><script>$hs("${okId}")</script>`,
      ),
    ).toBe(true); // healthy sibling's exact staged shape closed the stream
    expect(sup.warns).toHaveLength(1);
    expect(sup.warns[0]![0]).toBe(
      `[ssr] suspense region ${boomId} failed - template skipped; hydrate will re-suspend it`,
    );
  });

  test("ssr.stream emits the $hs bootstrap once before staged templates, and not at all without <Suspense>", async () => {
    const node = (
      <div>
        <Suspense fallback={<i>wait</i>}>{() => Promise.resolve(<b>x</b>)}</Suspense>
      </div>
    );
    const out = await collect(ssr.stream(node));
    const boots = [...out.matchAll(/<script>(function \$hs[\s\S]*?)<\/script>/g)];
    expect(boots).toHaveLength(1); // bootstrap emitted exactly once
    expect(out.indexOf("<script>function $hs")).toBeLessThan(out.indexOf('<template id="')); // bootstrap precedes the templates
    const id = extractSwapIds(out).sentinels[0]!; // actual sentinel id (monotonic counter — never hardcode)
    expect(out).toContain(`<script>$hs("${id}")</script>`); // region followed by its swap script
    // without <Suspense>: no bootstrap, no swap script (output byte-identical to a non-Suspense stream)
    const plain = await collect(
      ssr.stream(
        <div>
          <b>hi</b>
        </div>,
      ),
    );
    expect(plain).not.toContain("$hs");
    expect(plain).not.toContain("<script>");
  });

  test("each staged <Suspense> template is followed by its own $hs swap script (id matches)", async () => {
    const node = (
      <div>
        <Suspense fallback={<i>a</i>}>{() => Promise.resolve(<b>A</b>)}</Suspense>
        <Suspense fallback={<i>b</i>}>{() => Promise.resolve(<b>B</b>)}</Suspense>
      </div>
    );
    const out = await collect(ssr.stream(node));
    const ids = extractSwapIds(out).sentinels;
    expect(ids).toHaveLength(2);
    for (const id of ids) {
      expect(out).toContain(`<template id="${id}">`); // each region's template
      expect(out).toContain(`</template><script>$hs("${id}")</script>`); // followed by its matching swap script
    }
    expect(out).toContain("<b>A</b>");
    expect(out).toContain("<b>B</b>");
  });

  test("threads a CSP nonce onto the $hs bootstrap and every per-swap script", async () => {
    const node = (
      <div>
        <Suspense fallback={<i>a</i>}>{() => Promise.resolve(<b>A</b>)}</Suspense>
        <Suspense fallback={<i>b</i>}>{() => Promise.resolve(<b>B</b>)}</Suspense>
      </div>
    );
    const out = await collect(ssr.stream(node, { nonce: "a1b2c3" }));
    const attrs = [...out.matchAll(/<script([^>]*)>/g)].map((m) => m[1]!);
    expect(attrs).toHaveLength(3); // the bootstrap + one swap script per staged region
    for (const attr of attrs) {
      expect(attr).toBe(' nonce="a1b2c3"'); // every emitted script carries the nonce — and nothing else
    }
    const ids = extractSwapIds(out).sentinels;
    for (const id of ids) {
      expect(out).toContain(`</template><script nonce="a1b2c3">$hs("${id}")</script>`); // each swap still well-formed
    }
    const last = ids[ids.length - 1]!;
    expect(
      out.endsWith(
        `<template id="${last}"><!--[--><b>B</b><!--]--></template><script nonce="a1b2c3">$hs("${last}")</script>`,
      ),
    ).toBe(true); // nonce'd staged tail closes the stream
  });

  test("omits the nonce attribute entirely without a nonce option (staged output unchanged)", async () => {
    const node = () => (
      <div>
        <Suspense fallback={<i>wait</i>}>{() => Promise.resolve(<b>x</b>)}</Suspense>
      </div>
    );
    const bare = await collect(ssr.stream(node()));
    const emptyOpts = await collect(ssr.stream(node(), {}));
    const id = extractSwapIds(bare).sentinels[0]!;
    expect(bare).not.toContain("nonce="); // unattributed — no nonce anywhere
    expect(bare.indexOf("<script>function $hs")).toBeLessThan(
      bare.indexOf(`<template id="${id}">`),
    ); // pre-change bootstrap shape, unattributed
    expect(
      bare.endsWith(
        `<template id="${id}"><!--[--><b>x</b><!--]--></template><script>$hs("${id}")</script>`,
      ),
    ).toBe(true); // pre-change staged tail byte-for-byte
    expect(emptyOpts.replace(/hs\d+/g, "hs")).toBe(bare.replace(/hs\d+/g, "hs")); // {} ≡ no options (ids come from a global counter — normalized)
  });

  test("Lazy inside <Suspense> resolves within the staged <template>", async () => {
    const node = (
      <div>
        <Suspense fallback={<i>wait</i>}>
          <Lazy loader={() => Promise.resolve(<b>L</b>)} loading={<span>…</span>}></Lazy>
        </Suspense>
      </div>
    );
    const out = await collect(ssr.stream(node));
    const id = extractSwapIds(out).sentinels[0]!;
    expect(out).toContain("<i>wait</i>"); // fallback flushed in the shell
    expect(out).toContain(
      `<template id="${id}"><!--[--><b>L</b><!--]--></template><script>$hs("${id}")</script>`,
    ); // loader resolved inside the staged template
  });
});
