import { describe, test, expect, mock } from "bun:test";
import { signal } from "@hellajs/core";
import { html, ForEach, Transition, Portal, Lazy } from "@hellajs/dom/bundle";
import { ssr, ssrAsync } from "@hellajs/ssr/bundle";
import type { HellaNode } from "@hellajs/dom";
import { parityCases, attributeCases, unknownKindNode } from "./helpers";

describe("ssrAsync", () => {
  test("resolves a static node to the same HTML as ssr", async () => {
    expect(await ssrAsync(html`<div>hi</div>` as HellaNode)).toBe("<div>hi</div>");
  });

  test("returns a Promise<string>", () => {
    const result = ssrAsync(html`<div></div>` as HellaNode);
    expect(result instanceof Promise).toBe(true);
  });

  test("awaits a Promise-returning child in a marker-bounded region", async () => {
    expect(await ssrAsync(html`<p>${() => Promise.resolve(5)}</p>` as HellaNode)).toBe("<p><!--[-->5<!--]--></p>");
  });

  test("escapes an awaited Promise value inside the region (<, >, &, \")", async () => {
    expect(await ssrAsync(html`<p>${() => Promise.resolve('<b>&"x')}</p>` as HellaNode))
      .toBe("<p><!--[-->&lt;b&gt;&amp;&quot;x<!--]--></p>");
  });

  test("awaits a Promise-returning bind: value as an attribute", async () => {
    expect(await ssrAsync(html`<input bind:value=${() => Promise.resolve("x")} />` as HellaNode)).toBe('<input value="x">');
  });

  test("awaits a Promise-returning ForEach each and renders items in a marker region", async () => {
    const node = html`<ul><${ForEach} each=${() => Promise.resolve([1, 2, 3])} use=${(n: number) => html`<li>${n}</li>`} /></ul>` as HellaNode;
    expect(await ssrAsync(node)).toBe("<ul><!--[--><li>1</li><li>2</li><li>3</li><!--]--></ul>");
  });

  test("awaits a Promise-returning Transition show (true renders child, false empty)", async () => {
    const on = html`<div><${Transition} show=${() => Promise.resolve(true)}>${html`<p>on</p>`}</${Transition}></div>` as HellaNode;
    expect(await ssrAsync(on)).toBe("<div><!--[--><p>on</p><!--]--></div>");
    const off = html`<div><${Transition} show=${() => Promise.resolve(false)}>${html`<p>on</p>`}</${Transition}></div>` as HellaNode;
    expect(await ssrAsync(off)).toBe("<div><!--[--><!--]--></div>");
  });

  test("awaits a Promise resolving to a HellaNode and recurses", async () => {
    expect(await ssrAsync(html`<div>${() => Promise.resolve(html`<b>on</b>`)}</div>` as HellaNode))
      .toBe("<div><!--[--><b>on</b><!--]--></div>");
  });

  test("fully unwraps nested thenables (Promise resolving to a Promise)", async () => {
    expect(await ssrAsync(html`<p>${() => Promise.resolve(Promise.resolve(1))}</p>` as HellaNode))
      .toBe("<p><!--[-->1<!--]--></p>");
  });

  test("propagates a rejected Promise to the caller", async () => {
    await expect(ssrAsync(html`<p>${() => Promise.reject(new Error("boom"))}</p>` as HellaNode)).rejects.toThrow("boom");
  });

  test("parity: ssrAsync matches ssr for non-Promise trees (static)", async () => {
    const node = html`<div><span>hi</span>there</div>` as HellaNode;
    expect(await ssrAsync(node)).toBe(ssr(node));
  });

  test("parity: ssrAsync matches ssr for a signal child", async () => {
    const count = signal(5);
    const node = html`<p>${count}</p>` as HellaNode;
    expect(await ssrAsync(node)).toBe(ssr(node));
  });

  test("parity: ssrAsync matches ssr for ForEach and Transition", async () => {
    const fe = html`<ul><${ForEach} each=${[1, 2, 3]} use=${(n: number) => html`<li>${n}</li>`} /></ul>` as HellaNode;
    expect(await ssrAsync(fe)).toBe(ssr(fe));
    const tr = html`<div><${Transition} show=${true}>${html`<p>on</p>`}</${Transition}></div>` as HellaNode;
    expect(await ssrAsync(tr)).toBe(ssr(tr));
  });

  test("parity: ssrAsync matches ssr for Portal (empty region) and a component", async () => {
    const portal = html`<div><${Portal} to="#x">${html`<p>p</p>`}</${Portal}></div>` as HellaNode;
    expect(await ssrAsync(portal)).toBe(ssr(portal));
    const Card = (props: { title: string }) => html`<section><h1>${props.title}</h1></section>` as HellaNode;
    expect(await ssrAsync(html`<div><${Card} title="Hi" /></div>` as HellaNode)).toBe(ssr(html`<div><${Card} title="Hi" /></div>` as HellaNode));
  });

  test("serializes static props (covers the props loop)", async () => {
    expect(await ssrAsync(html`<div class=${"card"}>x</div>` as HellaNode)).toBe('<div class="card">x</div>');
  });

  test("renders nothing for a static boolean true child (covers the fallback)", async () => {
    expect(await ssrAsync(html`<div>${true}</div>` as HellaNode)).toBe("<div></div>");
  });

  test("renders an empty marker region and warns for an unknown ssr kind", async () => {
    const fn = (() => { throw new Error("fn should not be called"); }) as unknown as { isDynamic?: true; ssr?: { kind: "unknown"; props: object } };
    fn.isDynamic = true;
    fn.ssr = { kind: "unknown", props: {} };
    const original = console.warn;
    const warn = mock(() => {});
    console.warn = warn as unknown as typeof console.warn;
    try {
      expect(await ssrAsync(html`<div>${fn}</div>` as HellaNode)).toBe("<div><!--[--><!--]--></div>");
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith("[ssr] unknown isDynamic kind: unknown");
    } finally {
      console.warn = original;
    }
  });

  test("awaits a reactive getter that returns an isDynamic component", async () => {
    const items = signal([1, 2, 3]);
    const node = html`<div>${() => ForEach({ each: items, use: (n: number) => html`<li>${n}</li>` })}</div>` as HellaNode;
    expect(await ssrAsync(node)).toBe("<div><!--[--><li>1</li><li>2</li><li>3</li><!--]--></div>");
  });

  test("Lazy renders its loading fallback under ssrAsync (loader NOT awaited)", async () => {
    const loader = mock(async () => html`<div />` as HellaNode);
    const node = html`<div><${Lazy} loader=${loader} loading=${html`<span>…</span>`} /></div>` as HellaNode;
    expect(await ssrAsync(node)).toBe("<div><!--[--><span>…</span><!--]--></div>");
    expect(loader).not.toHaveBeenCalled();
  });

  test("rejects when node is null", async () => {
    await expect(ssrAsync(null as unknown as HellaNode)).rejects.toThrow("[ssr] ssrAsync: node is required");
  });

  test.each(parityCases)("parity: ssrAsync matches ssr for $name", async ({ node }) => {
    expect(await ssrAsync(node)).toBe(ssr(node));
  });

  test("parity: ssrAsync matches ssr for an isDynamic function with an unknown kind", async () => {
    const original = console.warn;
    console.warn = mock(() => {}) as unknown as typeof console.warn;
    try {
      expect(await ssrAsync(unknownKindNode())).toBe(ssr(unknownKindNode()));
    } finally {
      console.warn = original;
    }
  });

  test.each(attributeCases)("parity: ssrAsync matches ssr for attribute serialization ($name)", async ({ node }) => {
    expect(await ssrAsync(node)).toBe(ssr(node));
  });
});
