import { describe, test, expect, beforeEach } from "bun:test";
import { html, Suspense, component, hydrate } from "@hellajs/dom/bundle";
import { ssr } from "@hellajs/ssr/bundle";
import type { HellaNode } from "@hellajs/dom";
import { collect } from "./helpers";
import { setupContainer, resetTestState } from "@utils/test-helpers.js";
import { flush } from "@hellajs/core";

beforeEach(() => resetTestState());

/** Extracts `<Suspense>` swap ids from streamed HTML: sentinel-comment ids (nodeValue) and `<template>` ids. */
function extractSwapIds(out: string): { sentinels: string[]; templates: string[] } {
  return {
    sentinels: [...out.matchAll(/<!--(hs\d+)-->/g)].map((m) => m[1]!),
    templates: [...out.matchAll(/<template id="(hs\d+)">/g)].map((m) => m[1]!),
  };
}

describe("ssr <Suspense>", () => {
  test("ssr (sync) renders children directly, fallback dropped", () => {
    const node = html`<div><${Suspense} fallback=${html`<span>loading</span>`}>${html`<b>resolved</b>`}</${Suspense}></div>` as HellaNode;
    expect(ssr(node)).toBe("<div><!--[--><b>resolved</b><!--]--></div>");
  });

  test("ssr.async renders children directly, fallback dropped", async () => {
    const node = html`<div><${Suspense} fallback=${html`<span>loading</span>`}>${html`<b>resolved</b>`}</${Suspense}></div>` as HellaNode;
    expect(await ssr.async(node)).toBe("<div><!--[--><b>resolved</b><!--]--></div>");
  });

  test("ssr.stream emits fallback + sentinel region, then a staged template with the resolved children", async () => {
    const node = html`<div><${Suspense} fallback=${html`<span>loading</span>`}>${html`<b>resolved</b>`}</${Suspense}></div>` as HellaNode;
    const out = await collect(ssr.stream(node));
    const { sentinels, templates } = extractSwapIds(out);
    expect(sentinels).toHaveLength(1);
    expect(new Set(sentinels)).toEqual(new Set(templates));   // sentinel id matches the <template> id
    expect(out.startsWith("<div><!--[--><span>loading</span><!--")).toBe(true);  // shell: fallback then sentinel
    expect(out).toContain(`<template id="${sentinels[0]!}"><b>resolved</b></template>`);
  });

  test("ssr.stream resolves async children into the staged template", async () => {
    const node = html`<div><${Suspense} fallback=${html`<i>wait</i>`}>${() => Promise.resolve(html`<b>data</b>`)}</${Suspense}></div>` as HellaNode;
    const out = await collect(ssr.stream(node));
    const { sentinels, templates } = extractSwapIds(out);
    expect(sentinels).toHaveLength(1);
    expect(new Set(sentinels)).toEqual(new Set(templates));
    expect(out.startsWith("<div><!--[--><i>wait</i><!--")).toBe(true);
    expect(out).toContain(`<template id="${sentinels[0]!}"><!--[--><b>data</b><!--]--></template>`);
  });

  test("multiple Suspense boundaries get unique staged-template ids", async () => {
    const node = html`<div><${Suspense} fallback=${html`<i>a</i>`}>${html`<b>A</b>`}</${Suspense}><${Suspense} fallback=${html`<i>b</i>`}>${html`<b>B</b>`}</${Suspense}></div>` as HellaNode;
    const out = await collect(ssr.stream(node));
    const { sentinels, templates } = extractSwapIds(out);
    expect(sentinels).toHaveLength(2);
    expect(new Set(sentinels).size).toBe(2);                    // sentinel ids are unique
    expect(new Set(sentinels)).toEqual(new Set(templates));     // each sentinel matches a <template>
    expect(out).toContain(`<template id="${sentinels[0]!}"><b>A</b></template>`);
    expect(out).toContain(`<template id="${sentinels[1]!}"><b>B</b></template>`);
  });

  test("ssr.stream progressive flush: fallback chunk arrives before async children resolve", async () => {
    let resolveLate!: () => void;
    const delayed = new Promise<HellaNode>((r) => { resolveLate = () => r(html`<b>late</b>` as HellaNode); });
    const node = html`<div><${Suspense} fallback=${html`<i>wait</i>`}>${() => delayed}</${Suspense}></div>` as HellaNode;
    const reader = ssr.stream(node).getReader();
    let pre = "";
    let chunk = await reader.read();
    while (!chunk.done) { pre += chunk.value; if (pre.includes("<i>wait</i>")) break; chunk = await reader.read(); }
    expect(pre).toContain("<i>wait</i>");            // fallback arrived before resolveLate() (not yet called)
    resolveLate();
    let rest = pre;
    chunk = await reader.read();
    while (!chunk.done) { rest += chunk.value; chunk = await reader.read(); }
    const { sentinels, templates } = extractSwapIds(rest);
    expect(sentinels).toHaveLength(1);
    expect(new Set(sentinels)).toEqual(new Set(templates));
    expect(rest).toContain(`<template id="${sentinels[0]!}">`);
    expect(rest).toContain("<b>late</b>");
  });

  test("ssr (sync) renders array children directly (JSX shape: children is [child])", () => {
    // JSX <Suspense fallback={...}>{child}</Suspense> compiles to
    // component(Suspense, { fallback, children: [child] }) — children is an ARRAY,
    // not a single child. The walk must iterate it, not drop it.
    const node = html`<div>${component(Suspense as unknown as (props: Record<string, unknown>) => HellaNode, { fallback: html`<span>loading</span>`, children: [html`<b>resolved</b>`] })}</div>` as HellaNode;
    expect(ssr(node)).toBe("<div><!--[--><b>resolved</b><!--]--></div>");
  });

  test("ssr.stream stages resolved array children (JSX shape: children is [getter])", async () => {
    const node = html`<div>${component(Suspense as unknown as (props: Record<string, unknown>) => HellaNode, { fallback: html`<i>wait</i>`, children: [() => Promise.resolve(html`<b>data</b>`)] })}</div>` as HellaNode;
    const out = await collect(ssr.stream(node));
    const { sentinels, templates } = extractSwapIds(out);
    expect(sentinels).toHaveLength(1);
    expect(new Set(sentinels)).toEqual(new Set(templates));
    expect(out.startsWith("<div><!--[--><i>wait</i><!--")).toBe(true);
    expect(out).toContain(`<template id="${sentinels[0]!}"><!--[--><b>data</b><!--]--></template>`);
  });

  test("$hs swaps the fallback region for the staged template content (bootstrap extracted from the emitted stream)", async () => {
    const node = html`<div><${Suspense} fallback=${html`<p>loading</p>`}>${() => Promise.resolve(html`<b>resolved</b>`)}</${Suspense}></div>` as HellaNode;
    const out = await collect(ssr.stream(node));
    const id = out.match(/<!--(hs\d+)-->/)![1]!;                                         // actual sentinel id (monotonic counter — never hardcode)
    const boot = out.match(/<script>(function \$hs[\s\S]*?)<\/script>/)![1]!;
    const container = setupContainer();
    container.innerHTML = out;                          // HappyDOM parses; inline scripts do NOT execute
    const $hs = new Function(boot + "; return $hs")() as (id: string) => void;
    expect(container.querySelector("template")).not.toBeNull();   // template present before the swap
    $hs(id);
    expect(container.querySelector("template")).toBeNull();        // template consumed
    expect(container.textContent).toContain("resolved");
    expect(container.textContent).not.toContain("loading");
  });

  test("$hs balance-walks region bounds when the fallback nests a dynamic region", async () => {
    // the fallback contains a nested <!--[-->…<!--]--> region; $hs must skip it and swap the OUTER region
    const node = html`<div><${Suspense} fallback=${html`<div>${() => "loading"}</div>`}>${() => Promise.resolve(html`<b>resolved</b>`)}</${Suspense}></div>` as HellaNode;
    const out = await collect(ssr.stream(node));
    const id = out.match(/<!--(hs\d+)-->/)![1]!;
    const boot = out.match(/<script>(function \$hs[\s\S]*?)<\/script>/)![1]!;
    const container = setupContainer();
    container.innerHTML = out;
    const $hs = new Function(boot + "; return $hs")() as (id: string) => void;
    $hs(id);
    expect(container.querySelector("template")).toBeNull();
    expect(container.textContent).toContain("resolved");
    expect(container.textContent).not.toContain("loading");
  });

  test("$hs swap + hydrate adopts the resolved content without stringifying the getter’s Promise (no [object Promise])", async () => {
    // the regression: after $hs swaps (simulating the browser’s inline script) and hydrate runs, the
    // Suspense getter must NOT be re-evaluated into a Promise → text. $hs wraps the inserted content in an
    // extra marker pair so hydrate’s consumeRegion leaves the getter’s reactive-region markers intact.
    const tree = () => html`<div id="root"><${Suspense} fallback=${html`<p>loading</p>`}>${() => Promise.resolve(html`<b>resolved</b>`)}</${Suspense}></div>` as HellaNode;
    const out = await collect(ssr.stream(tree()));
    const id = out.match(/<!--(hs\d+)-->/)![1]!;
    const boot = out.match(/<script>(function \$hs[\s\S]*?)<\/script>/)![1]!;
    const container = setupContainer();
    container.innerHTML = out;
    const $hs = new Function(boot + "; return $hs")() as (id: string) => void;
    $hs(id);                          // simulate the browser running the inline swap script on arrival
    hydrate(tree(), container);       // then the client entry hydrates
    flush();
    expect(container.querySelector("#root b")!.textContent).toBe("resolved");
    expect(container.textContent).not.toContain("[object Promise]");
  });
});
