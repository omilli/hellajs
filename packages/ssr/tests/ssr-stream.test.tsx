import { describe, test, expect, vi } from "vite-plus/test";
import { signal } from "@hellajs/core";
import { delay, suppressConsole } from "@utils/test-helpers.js";
import { ForEach, Transition, Portal, Lazy } from "@hellajs/dom";
import { ssr } from "@hellajs/ssr";
import type { HellaNode } from "@hellajs/dom";
import { collect, parityCases, attributeCases, unknownKindNode, headParityCases } from "./helpers";

/** Stream/async parity cases — collecting `ssr.stream` must equal `ssr.async` (a distinct comparison from the `ssr` parity matrix). */
const streamAsyncParityCases: { name: string; node: HellaNode }[] = [
  {
    name: "static tree",
    node: (
      <div>
        <span>hi</span>there
      </div>
    ),
  },
  {
    name: "ForEach",
    node: (
      <ul>
        <ForEach each={[1, 2, 3]} use={(n: number) => <li>{n}</li>}></ForEach>
      </ul>
    ),
  },
  {
    name: "Transition",
    node: (
      <div>
        <Transition show={true}>{<p>on</p>}</Transition>
      </div>
    ),
  },
  {
    name: "Portal",
    node: (
      <div>
        <Portal to="#x">{<p>p</p>}</Portal>
      </div>
    ),
  },
  {
    name: "Lazy loaded component (loader awaited)",
    node: (
      <div>
        <Lazy loader={() => Promise.resolve(<b>L</b>)} loading={<span>…</span>}></Lazy>
      </div>
    ),
  },
];

describe("ssr.stream", () => {
  test("returns a ReadableStream", () => {
    expect(ssr.stream(<div>hi</div>) instanceof ReadableStream).toBe(true);
  });

  test("resolves a static node to the same HTML as ssr", async () => {
    expect(await collect(ssr.stream(<div>hi</div>))).toBe("<div>hi</div>");
  });

  test.each(streamAsyncParityCases)(
    "stream/async parity: collecting ssr.stream equals ssr.async for $name",
    async ({ node }) => {
      expect(await collect(ssr.stream(node))).toBe(await ssr.async(node));
    },
  );

  test("stream/sync parity for a signal child", async () => {
    const count = signal(5);
    const node = <p>{count}</p>;
    expect(await collect(ssr.stream(node))).toBe(ssr(node));
  });

  test("awaits a Promise-returning child in a marker-bounded region", async () => {
    expect(await collect(ssr.stream(<p>{() => Promise.resolve(5)}</p>))).toBe(
      "<p><!--[-->5<!--]--></p>",
    );
  });

  test("awaits a Promise function-ref prop value", async () => {
    expect(await collect(ssr.stream(<input value={() => Promise.resolve("x")} />))).toBe(
      '<input value="x">',
    );
  });

  test("awaits a Promise-returning ForEach each", async () => {
    const node = (
      <ul>
        <ForEach
          each={() => Promise.resolve([1, 2]) as unknown as number[]}
          use={(n: number) => <li>{n}</li>}
        ></ForEach>
      </ul>
    );
    expect(await collect(ssr.stream(node))).toBe("<ul><!--[--><li>1</li><li>2</li><!--]--></ul>");
  });

  test("progressive flush: a non-empty chunk arrives before a delayed Promise resolves; >1 chunk total", async () => {
    let resolveLate!: () => void;
    const delayed = new Promise<string>((r) => {
      resolveLate = () => r("late");
    });
    const stream = ssr.stream(<div>before{() => delayed}after</div>);
    const reader = stream.getReader();
    const first = await reader.read(); // arrives WITHOUT resolveLate() → progressive flush
    expect(first.done).toBe(false);
    expect((first.value ?? "").length).toBeGreaterThan(0);
    resolveLate(); // let the delayed value settle
    let all = first.value ?? "";
    let chunks = 1;
    let chunk = await reader.read();
    while (!chunk.done) {
      all += chunk.value;
      chunks++;
      chunk = await reader.read();
    }
    expect(chunks).toBeGreaterThan(1);
    expect(all).toBe(await ssr.async(<div>before{() => "late"}after</div>));
  });

  test("advances the walk only on pulls — the producer stays parked while the consumer idles (backpressure)", async () => {
    const step = vi.fn(() => Promise.resolve("x")); // each call = the walk reached that child
    const node = (
      <div>
        {step}
        {step}
        {step}
        {step}
        {step}
        {step}
      </div>
    );
    const reader = ssr.stream(node).getReader();
    const first = await reader.read(); // consume exactly one chunk, then idle with no read pending
    expect(first.done).toBe(false);
    await delay(25); // a start()-driven drain finishes all six getters inside this window
    expect(step.mock.calls.length).toBeLessThanOrEqual(2); // read-ahead bounded by the queue high-water mark, not the full walk
    let chunk = await reader.read(); // resume consuming — the walk advances with the reads
    while (!chunk.done) {
      chunk = await reader.read();
    }
    expect(step).toHaveBeenCalledTimes(6); // every child walked once the stream is fully consumed
  });

  test("cancel stops the generator (best-effort, no throw)", async () => {
    let resolveLate!: () => void;
    const delayed = new Promise<string>((r) => {
      resolveLate = () => r("late");
    });
    const stream = ssr.stream(<div>{() => delayed}</div>);
    const reader = stream.getReader();
    await reader.read(); // consume the first chunk
    await reader.cancel(); // cancel → source cancel() → gen.return()
    resolveLate(); // resolving the orphaned Promise does not throw
  });

  test("Lazy outside <Suspense> awaits in-order: the loader gates trailing markup", async () => {
    let resolveLate!: () => void;
    const loader = () =>
      new Promise<void>((r) => {
        resolveLate = r;
      }).then(() => <b>L</b>);
    const reader = ssr
      .stream(
        <div>
          before<Lazy loader={loader}></Lazy>after
        </div>,
      )
      .getReader();
    let pre = "";
    let chunk = await reader.read();
    while (!chunk.done) {
      pre += chunk.value;
      if (pre.includes("<!--[-->")) break;
      chunk = await reader.read();
    } // drain until the lazy region opens — the walk suspends at the loader
    expect(pre).toBe("<div>before<!--[-->"); // exact flush point: prefix + region open, nothing past it
    expect(pre).not.toContain("after");
    await delay(0); // pull-driven: the loader runs on the NEXT pull (after this read resolves) — yield a tick so it's invoked before release
    resolveLate();
    let all = pre;
    chunk = await reader.read();
    while (!chunk.done) {
      all += chunk.value;
      chunk = await reader.read();
    }
    expect(all).toBe("<div>before<!--[--><b>L</b><!--]-->after</div>");
  });

  test("a rejected Promise errors the stream", async () => {
    await expect(
      collect(ssr.stream(<p>{() => Promise.reject(new Error("boom"))}</p>)),
    ).rejects.toThrow("boom");
  });

  test("marks a fragment child among siblings (fragment-child branch)", async () => {
    expect(
      await collect(
        ssr.stream(
          <div>
            a
            {
              <>
                <b></b>
                <c></c>
              </>
            }
            d
          </div>,
        ),
      ),
    ).toBe("<div>a<!--[--><b></b><c></c><!--]-->d</div>");
  });

  test("serializes a fragment root without markers (fragment-root branch)", async () => {
    expect(
      await collect(
        ssr.stream(
          <>
            <a></a>
            <b></b>
          </>,
        ),
      ),
    ).toBe("<a></a><b></b>");
  });

  test("pipeThrough(new TextEncoderStream()) yields a byte stream (Response-shaped)", async () => {
    const bytes = ssr.stream(<div>x</div>).pipeThrough(new TextEncoderStream());
    const reader = bytes.getReader();
    const decoder = new TextDecoder();
    let out = "";
    let chunk = await reader.read();
    while (!chunk.done) {
      out += decoder.decode(chunk.value);
      chunk = await reader.read();
    }
    expect(out).toBe("<div>x</div>");
  });

  test("throws when node is null", () => {
    expect(() => ssr.stream(null as unknown as HellaNode)).toThrow(
      "[ssr] ssr.stream: node is required",
    );
  });

  test("throws synchronously when the root is a function (uninvoked component)", () => {
    expect(() => ssr.stream((() => ({ tag: "div" })) as unknown as HellaNode)).toThrow(
      /^\[ssr\] ssr\.stream: node must be a HellaNode/,
    );
  });

  test.each(parityCases)(
    "parity: collecting ssr.stream matches ssr for $name",
    async ({ node }) => {
      expect(await collect(ssr.stream(node))).toBe(ssr(node));
    },
  );

  test("parity: collecting ssr.stream matches ssr for an isDynamic function with an unknown kind", async () => {
    const sup = suppressConsole();
    try {
      expect(await collect(ssr.stream(unknownKindNode()))).toBe(ssr(unknownKindNode()));
    } finally {
      sup.restore();
    }
  });

  test.each(attributeCases)(
    "parity: collecting ssr.stream matches ssr for attribute serialization ($name)",
    async ({ node }) => {
      expect(await collect(ssr.stream(node))).toBe(ssr(node));
    },
  );

  test("fills the head bag during the stream and omits hoisted tags from the chunks", async () => {
    // Stream limitation: the bag fills as the walk proceeds, but a streamed document emits its <head>
    // up front (doc's prefix) — collected entries are post-hoc; streaming callers pass head entries to
    // `doc` explicitly. See the ssr reference's stream section.
    const head = ssr.head();
    const node = (
      <div>
        <title>Stream</title>
        <meta charset="utf-8" />
        <p>body</p>
      </div>
    );
    expect(await collect(ssr.stream(node, { head }))).toBe("<div><p>body</p></div>"); // hoisted tags absent from the stream
    expect(head.title).toBe("Stream");
    expect(head.meta).toEqual([{ charset: "utf-8" }]);
  });

  test.each(headParityCases)(
    "head parity: collecting ssr.stream matches ssr for $name",
    async ({ node }) => {
      const syncBag = ssr.head();
      const streamBag = ssr.head();
      const syncBody = ssr(node, { head: syncBag });
      expect(await collect(ssr.stream(node, { head: streamBag }))).toBe(syncBody); // identical body HTML…
      expect(streamBag).toEqual(syncBag); // …and identical resulting bag
    },
  );
});
