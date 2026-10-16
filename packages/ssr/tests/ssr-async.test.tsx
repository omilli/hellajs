import { describe, test, expect, vi } from "vite-plus/test";
import { signal } from "@hellajs/core";
import { suppressConsole } from "@utils/test-helpers.js";
import { ForEach, Transition, Portal, Lazy } from "@hellajs/dom";
import { ssr } from "@hellajs/ssr";
import type { HellaNode } from "@hellajs/dom";
import { parityCases, attributeCases, unknownKindNode, headParityCases } from "./helpers";

describe("ssr.async", () => {
  test("resolves a static node to the same HTML as ssr", async () => {
    expect(await ssr.async((<div>hi</div>) as HellaNode)).toBe("<div>hi</div>");
  });

  test("returns a Promise<string>", () => {
    const result = ssr.async((<div></div>) as HellaNode);
    expect(result instanceof Promise).toBe(true);
  });

  test("awaits a Promise-returning child in a marker-bounded region", async () => {
    expect(await ssr.async((<p>{() => Promise.resolve(5)}</p>) as HellaNode)).toBe(
      "<p><!--[-->5<!--]--></p>",
    );
  });

  test('escapes an awaited Promise value inside the region (<, >, &, ")', async () => {
    expect(await ssr.async((<p>{() => Promise.resolve('<b>&"x')}</p>) as HellaNode)).toBe(
      "<p><!--[-->&lt;b&gt;&amp;&quot;x<!--]--></p>",
    );
  });

  test("awaits a Promise-returning function-ref prop value as an attribute", async () => {
    expect(await ssr.async((<input value={() => Promise.resolve("x")} />) as HellaNode)).toBe(
      '<input value="x">',
    );
  });

  test("awaits the Promise nodes that warn under sync ssr with zero warns", async () => {
    // Same child + prop shapes the sync tests assert warn on — the async walker awaits them (no warn, resolved output).
    const suppressed = suppressConsole();
    try {
      expect(await ssr.async((<div>{() => Promise.resolve(5)}</div>) as HellaNode)).toBe(
        "<div><!--[-->5<!--]--></div>",
      );
      expect(await ssr.async((<input value={() => Promise.resolve("x")} />) as HellaNode)).toBe(
        '<input value="x">',
      );
      expect(suppressed.warns).toHaveLength(0);
    } finally {
      suppressed.restore();
    }
  });

  test("awaits a Promise-returning ForEach each and renders items in a marker region", async () => {
    const node = (
      <ul>
        <ForEach
          each={() => Promise.resolve([1, 2, 3]) as unknown as number[]}
          use={(n: number) => <li>{n}</li>}
        ></ForEach>
      </ul>
    );
    expect(await ssr.async(node)).toBe("<ul><!--[--><li>1</li><li>2</li><li>3</li><!--]--></ul>");
  });

  test("renders the Transition child when a Promise show resolves true", async () => {
    const node = (
      <div>
        <Transition show={() => Promise.resolve(true) as unknown as boolean}>
          {<p>on</p>}
        </Transition>
      </div>
    );
    expect(await ssr.async(node)).toBe("<div><!--[--><p>on</p><!--]--></div>");
  });

  test("emits an empty marker region when a Promise show resolves false", async () => {
    const node = (
      <div>
        <Transition show={() => Promise.resolve(false) as unknown as boolean}>
          {<p>on</p>}
        </Transition>
      </div>
    );
    expect(await ssr.async(node)).toBe("<div><!--[--><!--]--></div>");
  });

  test("awaits a Promise resolving to a HellaNode and recurses", async () => {
    expect(await ssr.async((<div>{() => Promise.resolve(<b>on</b>)}</div>) as HellaNode)).toBe(
      "<div><!--[--><b>on</b><!--]--></div>",
    );
  });

  test("fully unwraps nested thenables (Promise resolving to a Promise)", async () => {
    expect(await ssr.async((<p>{() => Promise.resolve(Promise.resolve(1))}</p>) as HellaNode)).toBe(
      "<p><!--[-->1<!--]--></p>",
    );
  });

  test("propagates a rejected Promise to the caller", async () => {
    await expect(
      ssr.async((<p>{() => Promise.reject(new Error("boom"))}</p>) as HellaNode),
    ).rejects.toThrow("boom");
  });

  test("parity: ssr.async matches ssr for non-Promise trees (static)", async () => {
    const node = (
      <div>
        <span>hi</span>there
      </div>
    );
    expect(await ssr.async(node)).toBe(ssr(node));
  });

  test("parity: ssr.async matches ssr for a signal child", async () => {
    const count = signal(5);
    const node = <p>{count}</p>;
    expect(await ssr.async(node)).toBe(ssr(node));
  });

  test("parity: ssr.async matches ssr for ForEach", async () => {
    const node = (
      <ul>
        <ForEach each={[1, 2, 3]} use={(n: number) => <li>{n}</li>}></ForEach>
      </ul>
    );
    expect(await ssr.async(node)).toBe(ssr(node));
  });

  test("parity: ssr.async matches ssr for Transition", async () => {
    const node = (
      <div>
        <Transition show={true}>{<p>on</p>}</Transition>
      </div>
    );
    expect(await ssr.async(node)).toBe(ssr(node));
  });

  test("parity: ssr.async matches ssr for Portal (empty region)", async () => {
    const node = (
      <div>
        <Portal to="#x">{<p>p</p>}</Portal>
      </div>
    );
    expect(await ssr.async(node)).toBe(ssr(node));
  });

  test("parity: ssr.async matches ssr for a component", async () => {
    const Card = (props: { title: string }) => (
      <section>
        <h1>{props.title}</h1>
      </section>
    );
    const node = (
      <div>
        <Card title="Hi"></Card>
      </div>
    );
    expect(await ssr.async(node)).toBe(ssr(node));
  });

  test("serializes static props (covers the props loop)", async () => {
    expect(await ssr.async((<div class={"card"}>x</div>) as HellaNode)).toBe(
      '<div class="card">x</div>',
    );
  });

  test("renders nothing for a static boolean true child (covers the fallback)", async () => {
    expect(await ssr.async((<div>{true}</div>) as HellaNode)).toBe("<div></div>");
  });

  test("renders an empty marker region and warns for an unknown ssr kind", async () => {
    const sup = suppressConsole();
    try {
      expect(await ssr.async(unknownKindNode())).toBe("<div><!--[--><!--]--></div>");
      expect(sup.warns).toHaveLength(1);
      expect(sup.warns[0]).toEqual(["[ssr] unknown isDynamic kind: unknown"]);
    } finally {
      sup.restore();
    }
  });

  test("awaits a reactive getter that returns an isDynamic component", async () => {
    const items = signal([1, 2, 3]);
    const node = <div>{() => ForEach({ each: items, use: (n: number) => <li>{n}</li> })}</div>;
    expect(await ssr.async(node)).toBe("<div><!--[--><li>1</li><li>2</li><li>3</li><!--]--></div>");
  });

  test("Lazy awaits the loader and renders the loaded component (plain-node form)", async () => {
    const loader = vi.fn(() => Promise.resolve((<b id="loaded">loaded</b>) as HellaNode));
    const node = (
      <div>
        a<Lazy loader={loader} loading={<span>…</span>}></Lazy>b
      </div>
    );
    expect(await ssr.async(node)).toBe('<div>a<!--[--><b id="loaded">loaded</b><!--]-->b</div>');
    expect(loader).toHaveBeenCalledTimes(1);
  });

  test("Lazy calls a function loader result with props and renders its return", async () => {
    let receivedSignal: AbortSignal | undefined;
    const Loaded = (p: Record<string, unknown>) => <b>{p.x as number}</b>;
    const loader = vi.fn((o?: { signal?: AbortSignal }) => {
      receivedSignal = o?.signal;
      return Promise.resolve(Loaded);
    });
    const node = (
      <div>
        <Lazy loader={loader} props={{ x: 7 }}></Lazy>
      </div>
    );
    expect(await ssr.async(node)).toBe("<div><!--[--><b>7</b><!--]--></div>");
    expect(receivedSignal).toBeInstanceOf(AbortSignal);
  });

  test("Lazy renders its fallback when the loader rejects", async () => {
    const node = (
      <div>
        <Lazy loader={() => Promise.reject(new Error("chunk failed"))} fallback={<p>fb</p>}></Lazy>
      </div>
    );
    expect(await ssr.async(node)).toBe("<div><!--[--><p>fb</p><!--]--></div>");
  });

  test("Lazy rejection without a fallback rejects ssr.async", async () => {
    const node = (
      <div>
        <Lazy loader={() => Promise.reject(new Error("boom"))}></Lazy>
      </div>
    );
    await expect(ssr.async(node)).rejects.toThrow("boom");
  });

  test("rejects when node is null", async () => {
    await expect(ssr.async(null as unknown as HellaNode)).rejects.toThrow(
      "[ssr] ssr.async: node is required",
    );
  });

  test("rejects when the root is a function (uninvoked component)", async () => {
    await expect(ssr.async((() => ({ tag: "div" })) as unknown as HellaNode)).rejects.toThrow(
      /^\[ssr\] ssr\.async: node must be a HellaNode/,
    );
  });

  test.each(parityCases)("parity: ssr.async matches ssr for $name", async ({ node }) => {
    expect(await ssr.async(node)).toBe(ssr(node));
  });

  test("parity: ssr.async matches ssr for an isDynamic function with an unknown kind", async () => {
    const sup = suppressConsole();
    try {
      expect(await ssr.async(unknownKindNode())).toBe(ssr(unknownKindNode()));
    } finally {
      sup.restore();
    }
  });

  test.each(attributeCases)(
    "parity: ssr.async matches ssr for attribute serialization ($name)",
    async ({ node }) => {
      expect(await ssr.async(node)).toBe(ssr(node));
    },
  );

  test("awaits Promise props and children on hoisted head tags", async () => {
    const head = ssr.head();
    const node = (
      <div>
        <title>{() => Promise.resolve("Async Page")}</title>
        <meta name="p" content={() => Promise.resolve("q")} />
        <b>keep</b>
      </div>
    );
    expect(await ssr.async(node, { head })).toBe("<div><b>keep</b></div>");
    expect(head.title).toBe("Async Page"); // awaited title text
    expect(head.meta).toEqual([{ name: "p", content: "q" }]); // awaited getter attr
  });

  test.each(headParityCases)("head parity: ssr.async matches ssr for $name", async ({ node }) => {
    const syncBag = ssr.head();
    const asyncBag = ssr.head();
    const syncBody = ssr(node, { head: syncBag });
    expect(await ssr.async(node, { head: asyncBag })).toBe(syncBody); // identical body HTML…
    expect(asyncBag).toEqual(syncBag); // …and identical resulting bag
  });
});
