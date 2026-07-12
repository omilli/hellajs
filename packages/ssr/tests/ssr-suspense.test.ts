import { describe, test, expect } from "bun:test";
import { html, Suspense } from "@hellajs/dom/bundle";
import { ssr, ssrAsync, ssrStream } from "@hellajs/ssr/bundle";
import type { HellaNode } from "@hellajs/dom";

async function collect(stream: ReadableStream<string>): Promise<string> {
  const reader = stream.getReader();
  let out = "";
  let chunk = await reader.read();
  while (!chunk.done) { out += chunk.value; chunk = await reader.read(); }
  return out;
}

describe("ssr <Suspense>", () => {
  test("ssr (sync) renders children directly, fallback dropped", () => {
    const node = html`<div><${Suspense} fallback=${html`<span>loading</span>`}>${html`<b>resolved</b>`}</${Suspense}></div>` as HellaNode;
    expect(ssr(node)).toBe("<div><!--[--><b>resolved</b><!--]--></div>");
  });

  test("ssrAsync renders children directly, fallback dropped", async () => {
    const node = html`<div><${Suspense} fallback=${html`<span>loading</span>`}>${html`<b>resolved</b>`}</${Suspense}></div>` as HellaNode;
    expect(await ssrAsync(node)).toBe("<div><!--[--><b>resolved</b><!--]--></div>");
  });

  test("ssrStream emits fallback + sentinel region, then a staged template with the resolved children", async () => {
    const node = html`<div><${Suspense} fallback=${html`<span>loading</span>`}>${html`<b>resolved</b>`}</${Suspense}></div>` as HellaNode;
    const out = await collect(ssrStream(node));
    expect(out.startsWith("<div><!--[--><span>loading</span><!--hs0--><!--]--></div>")).toBe(true);
    expect(out).toContain('<template id="hs0"><b>resolved</b></template>');
  });

  test("ssrStream resolves async children into the staged template", async () => {
    const node = html`<div><${Suspense} fallback=${html`<i>wait</i>`}>${() => Promise.resolve(html`<b>data</b>`)}</${Suspense}></div>` as HellaNode;
    const out = await collect(ssrStream(node));
    expect(out.startsWith("<div><!--[--><i>wait</i><!--hs0--><!--]--></div>")).toBe(true);
    expect(out).toContain('<template id="hs0"><!--[--><b>data</b><!--]--></template>');
  });

  test("multiple Suspense boundaries get unique staged-template ids", async () => {
    const node = html`<div><${Suspense} fallback=${html`<i>a</i>`}>${html`<b>A</b>`}</${Suspense}><${Suspense} fallback=${html`<i>b</i>`}>${html`<b>B</b>`}</${Suspense}></div>` as HellaNode;
    const out = await collect(ssrStream(node));
    expect(out).toContain('<!--hs0-->');
    expect(out).toContain('<!--hs1-->');
    expect(out).toContain('<template id="hs0"><b>A</b></template>');
    expect(out).toContain('<template id="hs1"><b>B</b></template>');
  });

  test("ssrStream progressive flush: fallback chunk arrives before async children resolve", async () => {
    let resolveLate!: () => void;
    const delayed = new Promise<HellaNode>((r) => { resolveLate = () => r(html`<b>late</b>` as HellaNode); });
    const node = html`<div><${Suspense} fallback=${html`<i>wait</i>`}>${() => delayed}</${Suspense}></div>` as HellaNode;
    const reader = ssrStream(node).getReader();
    let pre = "";
    let chunk = await reader.read();
    while (!chunk.done) { pre += chunk.value; if (pre.includes("<i>wait</i>")) break; chunk = await reader.read(); }
    expect(pre).toContain("<i>wait</i>");            // fallback arrived before resolveLate() (not yet called)
    resolveLate();
    let rest = pre;
    chunk = await reader.read();
    while (!chunk.done) { rest += chunk.value; chunk = await reader.read(); }
    expect(rest).toContain('<template id="hs0">');
    expect(rest).toContain("<b>late</b>");
  });
});
