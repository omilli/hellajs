import { describe, test, expect, mock } from "bun:test";
import { signal } from "@hellajs/core";
import { html, ForEach, Transition, Portal, Lazy } from "@hellajs/dom/bundle";
import { ssr } from "@hellajs/ssr/bundle";
import type { HellaNode } from "@hellajs/dom";

describe("ssr", () => {
  test("renders static node to exact HTML", () => {
    expect(ssr(html`<div>hi</div>` as HellaNode)).toBe("<div>hi</div>");
  });

  test("returns an HTML string", () => {
    expect(typeof ssr(html`<div></div>` as HellaNode)).toBe("string");
  });

  test("inlines current signal value into a marker-bounded region", () => {
    const count = signal(5);
    expect(ssr(html`<p>${count}</p>` as HellaNode)).toBe("<p><!--[-->5<!--]--></p>");
  });

  test("renders bind directive's initial signal value as an attribute", () => {
    const value = signal("x");
    expect(ssr(html`<input bind:value=${value} />` as HellaNode)).toBe('<input value="x">');
  });

  test("concatenates fragment children without fragment markers", () => {
    expect(ssr(html`<a></a><b></b>` as HellaNode)).toBe("<a></a><b></b>");
  });

  test("escapes interpolated text inside a marker region (<, >, &, \")", () => {
    const risky = signal('<b>&"x');
    expect(ssr(html`<p>${risky}</p>` as HellaNode)).toBe("<p><!--[-->&lt;b&gt;&amp;&quot;x<!--]--></p>");
  });

  test("escapes attribute values", () => {
    // Static attribute value (a signal would need bind: to resolve — mirrors renderProp).
    expect(ssr(html`<div title=${'a"&<b'} />` as HellaNode)).toBe('<div title="a&quot;&amp;&lt;b"></div>');
  });

  test("renders each ForEach item in array order inside a marker region", () => {
    const node = html`<ul><${ForEach} each=${[1, 2, 3]} use=${(n: number) => html`<li>${n}</li>`} /></ul>` as HellaNode;
    expect(ssr(node)).toBe("<ul><!--[--><li>1</li><li>2</li><li>3</li><!--]--></ul>");
  });

  test("renders Transition child in a marker region when show is true", () => {
    const node = html`<div><${Transition} show=${true}>${html`<p>on</p>`}</${Transition}></div>` as HellaNode;
    expect(ssr(node)).toBe("<div><!--[--><p>on</p><!--]--></div>");
  });

  test("emits an empty marker region when Transition show is false", () => {
    const node = html`<div><${Transition} show=${false}>${html`<p>on</p>`}</${Transition}></div>` as HellaNode;
    expect(ssr(node)).toBe("<div><!--[--><!--]--></div>");
  });

  test("emits an empty marker region for Portal and does not throw", () => {
    const node = html`<div><${Portal} to="#x">${html`<p>p</p>`}</${Portal}></div>` as HellaNode;
    expect(ssr(node)).toBe("<div><!--[--><!--]--></div>");
  });

  test("renders Lazy loading fallback in a marker region without awaiting the loader", () => {
    const loader = mock(async () => html`<div />` as HellaNode);
    const node = html`<div><${Lazy} loader=${loader} loading=${html`<span>…</span>`} /></div>` as HellaNode;
    expect(ssr(node)).toBe("<div><!--[--><span>…</span><!--]--></div>");
    expect(loader).not.toHaveBeenCalled();
  });

  test("renders a component function's returned AST", () => {
    const Card = (props: { title: string }) =>
      html`<section><h1>${props.title}</h1></section>` as HellaNode;
    expect(ssr(html`<div><${Card} title="Hi" /></div>` as HellaNode))
      .toBe("<div><section><h1>Hi</h1></section></div>");
  });

  test("propagates walk errors to the caller", () => {
    // A throwing child getter surfaces (ssr has no try/catch). A throwing
    // component would NOT — component() catches render errors → empty fragment.
    const bad = () => { throw new Error("boom"); };
    expect(() => ssr(html`<p>${bad}</p>` as HellaNode)).toThrow("boom");
  });

  test("renders void elements without a closing tag", () => {
    expect(ssr(html`<img src=${"a.jpg"} />` as HellaNode)).toBe('<img src="a.jpg">');
  });

  test("renders boolean true as a bare attribute", () => {
    expect(ssr(html`<input disabled=${true} />` as HellaNode)).toBe("<input disabled>");
  });

  test("joins array attribute values with spaces", () => {
    expect(ssr(html`<div class=${["a", "b"]} />` as HellaNode)).toBe('<div class="a b"></div>');
  });

  test("omits falsy attributes", () => {
    expect(ssr(html`<div class=${false} id=${undefined} />` as HellaNode)).toBe("<div></div>");
  });

  test("emits an empty marker region when Lazy has no loading fallback", () => {
    const loader = mock(async () => html`<div />` as HellaNode);
    const node = html`<div><${Lazy} loader=${loader} /></div>` as HellaNode;
    expect(ssr(node)).toBe("<div><!--[--><!--]--></div>");
  });

  test("renders nothing for an isDynamic function without ssr", () => {
    const fn = (() => { }) as unknown as { isDynamic?: true };
    fn.isDynamic = true;
    expect(ssr(html`<div>${fn}</div>` as HellaNode)).toBe("<div></div>");
  });

  test("renders an empty marker region and warns for an unknown ssr kind", () => {
    const fn = (() => { throw new Error("fn should not be called"); }) as unknown as { isDynamic?: true; ssr?: { kind: "unknown"; props: object } };
    fn.isDynamic = true;
    fn.ssr = { kind: "unknown", props: {} };
    const original = console.warn;
    const warn = mock(() => {});
    console.warn = warn as unknown as typeof console.warn;
    try {
      expect(ssr(html`<div>${fn}</div>` as HellaNode)).toBe("<div><!--[--><!--]--></div>");
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith("[ssr] unknown isDynamic kind: unknown");
    } finally {
      console.warn = original;
    }
  });

  test("renders a HellaNode returned by a reactive child in a marker region", () => {
    const subtree = signal(html`<p>on</p>` as HellaNode);
    expect(ssr(html`<div>${subtree}</div>` as HellaNode)).toBe("<div><!--[--><p>on</p><!--]--></div>");
  });

  test("stringifies a reactive child's non-HellaNode value inside a marker region", () => {
    const obj = signal({ notag: true } as unknown as HellaNode);
    expect(ssr(html`<div>${obj}</div>` as HellaNode)).toBe("<div><!--[-->[object Object]<!--]--></div>");
  });

  test("renders nothing for a static boolean true child", () => {
    expect(ssr(html`<div>${true}</div>` as HellaNode)).toBe("<div></div>");
  });

  test("does not mark static elements or static text", () => {
    expect(ssr(html`<div><span>hi</span>there</div>` as HellaNode)).toBe("<div><span>hi</span>there</div>");
  });

  test("marks each reactive child independently between static text", () => {
    const a = signal(1);
    const b = signal(2);
    expect(ssr(html`<div>x${a}y${b}z</div>` as HellaNode)).toBe("<div>x<!--[-->1<!--]-->y<!--[-->2<!--]-->z</div>");
  });

  test("marks a fragment child among siblings", () => {
    expect(ssr(html`<div>a${html`<b></b><c></c>`}d</div>` as HellaNode)).toBe("<div>a<!--[--><b></b><c></c><!--]-->d</div>");
  });

  test("marks a reactive child even when it resolves to an element", () => {
    const el = signal(html`<b></b>` as HellaNode);
    expect(ssr(html`<div>${el}</div>` as HellaNode)).toBe("<div><!--[--><b></b><!--]--></div>");
  });

  test("renders a reactive getter that returns an isDynamic component", () => {
    const items = signal([1, 2, 3]);
    const node = html`<div>${() => ForEach({ each: items, use: (n: number) => html`<li>${n}</li>` })}</div>` as HellaNode;
    expect(ssr(node)).toBe("<div><!--[--><li>1</li><li>2</li><li>3</li><!--]--></div>");
  });

  test("throws when node is null", () => {
    expect(() => ssr(null as unknown as HellaNode)).toThrow(/^\[ssr\] ssr: node is required, received null$/);
  });

  test("throws when node is undefined", () => {
    expect(() => ssr(undefined as unknown as HellaNode)).toThrow(/^\[ssr\] ssr: node is required, received undefined$/);
  });
});
