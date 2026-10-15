import { describe, test, expect, mock } from "bun:test";
import { signal } from "@hellajs/core";
import { suppressConsole } from "@utils/test-helpers.js";
import { ForEach, Transition, Portal, Lazy, component } from "@hellajs/dom";
import { ssr } from "@hellajs/ssr/bundle";
import type { HellaNode } from "@hellajs/dom";
import { headParityCases, unknownKindNode, SlotBox } from "./helpers";

describe("ssr", () => {
  test("renders static node to exact HTML", () => {
    expect(ssr(<div>hi</div> as HellaNode)).toBe("<div>hi</div>");
  });

  test("returns an HTML string", () => {
    expect(typeof ssr(<div></div> as HellaNode)).toBe("string");
  });

  test("inlines current signal value into a marker-bounded region", () => {
    const count = signal(5);
    expect(ssr(<p>{count}</p> as HellaNode)).toBe("<p><!--[-->5<!--]--></p>");
  });

  test("renders a function-ref prop's initial signal value as an attribute", () => {
    const value = signal("x");
    expect(ssr(<input value={value} /> as HellaNode)).toBe('<input value="x">');
  });

  test("concatenates fragment children without fragment markers", () => {
    expect(ssr(<><a></a><b></b></> as HellaNode)).toBe("<a></a><b></b>");
  });

  test("escapes interpolated text inside a marker region (<, >, &, \")", () => {
    const risky = signal('<b>&"x');
    expect(ssr(<p>{risky}</p> as HellaNode)).toBe("<p><!--[-->&lt;b&gt;&amp;&quot;x<!--]--></p>");
  });

  test("escapes attribute values", () => {
    // Static attribute value (a function-ref prop resolves via resolveValue — mirrors renderProp).
    expect(ssr(<div title={'a"&<b'}></div> as HellaNode)).toBe('<div title="a&quot;&amp;&lt;b"></div>');
  });

  test("renders each ForEach item in array order inside a marker region", () => {
    const node = <ul><ForEach each={[1, 2, 3]} use={((n: number) => <li>{n}</li>)}></ForEach></ul>;
    expect(ssr(node)).toBe("<ul><!--[--><li>1</li><li>2</li><li>3</li><!--]--></ul>");
  });

  test("renders a reactive getter returning an array of nodes in array order inside a marker region", () => {
    // A getter resolving to an array of HellaNodes walks each (parity with dom's resolveNode);
    // byte-identical to the ForEach case above (no per-item markers — one region pair wraps the array).
    const node = <ul>{(() => [1, 2, 3].map((n) => <li>{n}</li>))}</ul>;
    expect(ssr(node)).toBe("<ul><!--[--><li>1</li><li>2</li><li>3</li><!--]--></ul>");
  });

  test("renders a function child's resolved nodes through a component child slot", () => {
    // The vendored html-flavor codegen interpolates `${() => props.children}`; the walker must
    // deep-resolve the chain before classifying, never emit the getter's source text. The
    // compiled shape nests the component region around the child region (two marker pairs).
    const node = <ul><SlotBox>{(() => [1, 2, 3].map((n) => <li>{n}</li>))}</SlotBox></ul>;
    expect(ssr(node)).toBe("<ul><div><!--[--><!--[--><li>1</li><li>2</li><li>3</li><!--]--><!--]--></div></ul>");
  });

  test("deep-resolves chained plain function children to their final value", () => {
    // Nested marker pairs: the component region wraps the chained-getter child region.
    const node = <p><SlotBox>{(() => () => <b>deep</b>)}</SlotBox></p>;
    expect(ssr(node)).toBe("<p><div><!--[--><!--[--><b>deep</b><!--]--><!--]--></div></p>");
  });

  test("deep-resolves a chained plain function returning text", () => {
    const text = signal("txt");
    const node = <p>{() => () => text()}</p>;
    expect(ssr(node)).toBe("<p><!--[-->txt<!--]--></p>");
  });

  test("renders Transition child in a marker region when show is true", () => {
    const node = <div><Transition show={true}>{(<p>on</p>)}</Transition></div>;
    expect(ssr(node)).toBe("<div><!--[--><p>on</p><!--]--></div>");
  });

  test("emits an empty marker region when Transition show is false", () => {
    const node = <div><Transition show={false}>{(<p>on</p>)}</Transition></div>;
    expect(ssr(node)).toBe("<div><!--[--><!--]--></div>");
  });

  test("renders Transition array children when show is true (JSX shape: children is [child])", () => {
    // component(Transition, { children: [child] }) — the JSX compile passes children as an ARRAY;
    // byte-identical to the single-child template case above (the array iterates to the same one child).
    const node = <div>{(component(Transition as unknown as (props: Record<string, unknown>) => HellaNode, { show: true, children: [<p>on</p>] }))}</div>;
    expect(ssr(node)).toBe("<div><!--[--><p>on</p><!--]--></div>");
  });

  test("emits an empty marker region for Portal and does not throw", () => {
    const node = <div><Portal to="#x">{(<p>p</p>)}</Portal></div>;
    expect(ssr(node)).toBe("<div><!--[--><!--]--></div>");
  });

  test("renders Lazy loading fallback in a marker region without awaiting the loader", () => {
    const loader = mock(async () => <div></div> as HellaNode);
    const node = <div><Lazy loader={loader} loading={(<span>…</span>)}></Lazy></div>;
    expect(ssr(node)).toBe("<div><!--[--><span>…</span><!--]--></div>");
    expect(loader).not.toHaveBeenCalled();
  });

  test("renders a component function's returned AST", () => {
    const Card = (props: { title: string }) =>
      <section><h1>{props.title}</h1></section>;
    expect(ssr(<div><Card title="Hi"></Card></div> as HellaNode))
      .toBe("<div><section><h1>Hi</h1></section></div>");
  });

  test("propagates walk errors to the caller", () => {
    // A throwing child getter surfaces (ssr has no try/catch). A throwing
    // component would NOT — component() catches render errors → empty fragment.
    const bad = () => { throw new Error("boom"); };
    expect(() => ssr(<p>{bad}</p> as HellaNode)).toThrow("boom");
  });

  test("skips prefixed props keys (routed to live buckets at mount)", () => {
    const node = {
      tag: "button",
      props: { "on:click": () => {}, disabled: true },
      children: []
    } as unknown as HellaNode;
    expect(ssr(node)).toBe("<button disabled></button>");
  });

  test("stringifies spread-resolved plain attrs and skips prefix-carrying spread keys", () => {
    // Runtime cloneWithValues already merged the spread: ssr sees resolved props
    // only, so prefixed keys inside the spread skip exactly like declared ones.
    const attrs = { disabled: true, title: "t", "on:click": () => {} };
    expect(ssr(<button class="b" {...attrs}></button> as HellaNode))
      .toBe('<button class="b" disabled title="t"></button>');
  });

  test("omits key from serialized output for declared and spread props", () => {
    expect(ssr(<li key={7} class="row">x</li> as HellaNode)).toBe('<li class="row">x</li>');
    const attrs = { key: 7, class: "row" };
    expect(ssr(<li {...attrs}>x</li> as HellaNode)).toBe('<li class="row">x</li>');
  });

  test("renders void elements without a closing tag", () => {
    expect(ssr(<img src={"a.jpg"} /> as HellaNode)).toBe('<img src="a.jpg">');
  });

  test("renders boolean true as a bare attribute", () => {
    expect(ssr(<input disabled={true} /> as HellaNode)).toBe("<input disabled>");
  });

  test("joins array attribute values with spaces", () => {
    expect(ssr(<div class={["a", "b"]}></div> as HellaNode)).toBe('<div class="a b"></div>');
  });

  test("omits falsy attributes", () => {
    expect(ssr(<div class={false} id={undefined}></div> as HellaNode)).toBe("<div></div>");
  });

  test("serializes a style object to kebab-case declarations (byte-parity with dom renderProp)", () => {
    // The literal below is the exact string the dom style-props suite asserts on the
    // mounted element's style attribute — client and server must agree byte-for-byte.
    expect(ssr(<div style={{ color: "red", fontSize: "12px" }}>x</div> as HellaNode)).toBe(
      '<div style="color:red; font-size:12px">x</div>',
    );
  });

  test("emits an empty marker region when Lazy has no loading fallback", () => {
    const loader = mock(async () => <div></div> as HellaNode);
    const node = <div><Lazy loader={loader}></Lazy></div>;
    expect(ssr(node)).toBe("<div><!--[--><!--]--></div>");
  });

  test("emits an empty marker region for an isDynamic function without ssr", () => {
    const fn = (() => { }) as unknown as { isDynamic?: true };
    fn.isDynamic = true;
    expect(ssr(<div>{fn}</div> as HellaNode)).toBe("<div><!--[--><!--]--></div>");
  });

  test("renders an empty marker region and warns for an unknown ssr kind", () => {
    const sup = suppressConsole();
    try {
      expect(ssr(unknownKindNode())).toBe("<div><!--[--><!--]--></div>");
      expect(sup.warns).toHaveLength(1);
      expect(sup.warns[0]).toEqual(["[ssr] unknown isDynamic kind: unknown"]);
    } finally {
      sup.restore();
    }
  });

  test("renders a HellaNode returned by a reactive child in a marker region", () => {
    const subtree = signal(<p>on</p> as HellaNode);
    expect(ssr(<div>{subtree}</div> as HellaNode)).toBe("<div><!--[--><p>on</p><!--]--></div>");
  });

  test("stringifies a reactive child's non-HellaNode value inside a marker region", () => {
    const obj = signal({ notag: true } as unknown as HellaNode);
    expect(ssr(<div>{obj}</div> as HellaNode)).toBe("<div><!--[-->[object Object]<!--]--></div>");
  });

  test("warns once and still stringifies a Promise child under sync ssr", () => {
    // Sync cannot await — the warn names the fix; the emitted HTML is unchanged from pre-warn behavior.
    const suppressed = suppressConsole();
    try {
      expect(ssr(<div>{() => Promise.resolve(5)}</div> as HellaNode))
        .toBe("<div><!--[-->[object Promise]<!--]--></div>");
      expect(suppressed.warns).toHaveLength(1);
      expect(suppressed.warns[0]).toEqual(["[ssr] Promise value under sync ssr - use ssr.async or ssr.stream, got [object Promise] emitted"]);
    } finally {
      suppressed.restore();
    }
  });

  test("warns once and still stringifies a Promise function-ref prop under sync ssr", () => {
    const suppressed = suppressConsole();
    try {
      expect(ssr(<input value={() => Promise.resolve("x")} /> as HellaNode))
        .toBe('<input value="[object Promise]">');
      expect(suppressed.warns).toHaveLength(1);
      expect(suppressed.warns[0]).toEqual(["[ssr] Promise value under sync ssr - use ssr.async or ssr.stream, got [object Promise] emitted"]);
    } finally {
      suppressed.restore();
    }
  });

  test("warns once per occurrence and still stringifies a Promise-resolving hoisted meta/link attr under sync ssr", () => {
    // The head-hoist path warns like the inline one — each Promise-resolving getter, the bag still receives the stringified attr.
    const suppressed = suppressConsole();
    try {
      const head = ssr.head();
      const node = <div><meta name="m" content={() => Promise.resolve("y")} /><link rel="icon" href={() => Promise.resolve("/f")} /><b>keep</b></div>;
      expect(ssr(node, { head })).toBe("<div><b>keep</b></div>");
      expect(head.meta).toEqual([{ name: "m", content: "[object Promise]" }]);
      expect(head.links).toEqual([{ rel: "icon", href: "[object Promise]" }]);
      expect(suppressed.warns).toHaveLength(2);
      expect(suppressed.warns[0]).toEqual(["[ssr] Promise value under sync ssr - use ssr.async or ssr.stream, got [object Promise] emitted"]);
      expect(suppressed.warns[1]).toEqual(["[ssr] Promise value under sync ssr - use ssr.async or ssr.stream, got [object Promise] emitted"]);
    } finally {
      suppressed.restore();
    }
  });

  test("renders nothing for a static boolean true child", () => {
    expect(ssr(<div>{true}</div> as HellaNode)).toBe("<div></div>");
  });

  test("does not mark static elements or static text", () => {
    expect(ssr(<div><span>hi</span>there</div> as HellaNode)).toBe("<div><span>hi</span>there</div>");
  });

  test("marks each reactive child independently between static text", () => {
    const a = signal(1);
    const b = signal(2);
    expect(ssr(<div>x{a}y{b}z</div> as HellaNode)).toBe("<div>x<!--[-->1<!--]-->y<!--[-->2<!--]-->z</div>");
  });

  test("marks a fragment child among siblings", () => {
    expect(ssr(<div>a{(<><b></b><c></c></>)}d</div> as HellaNode)).toBe("<div>a<!--[--><b></b><c></c><!--]-->d</div>");
  });

  test("marks a reactive child even when it resolves to an element", () => {
    const el = signal(<b></b> as HellaNode);
    expect(ssr(<div>{el}</div> as HellaNode)).toBe("<div><!--[--><b></b><!--]--></div>");
  });

  test("renders a reactive getter that returns an isDynamic component", () => {
    const items = signal([1, 2, 3]);
    const node = <div>{(() => ForEach({ each: items, use: (n: number) => <li>{n}</li> }))}</div>;
    expect(ssr(node)).toBe("<div><!--[--><li>1</li><li>2</li><li>3</li><!--]--></div>");
  });

  test("throws when node is null", () => {
    expect(() => ssr(null as unknown as HellaNode)).toThrow(/^\[ssr\] ssr: node is required, received null$/);
  });

  test("throws when node is undefined", () => {
    expect(() => ssr(undefined as unknown as HellaNode)).toThrow(/^\[ssr\] ssr: node is required, received undefined$/);
  });

  test("throws when the root is a function (uninvoked component)", () => {
    expect(() => ssr((() => ({ tag: "div" })) as unknown as HellaNode)).toThrow(/^\[ssr\] ssr: node must be a HellaNode/);
  });

  test("throws when the root is an object without a tag", () => {
    expect(() => ssr({} as HellaNode)).toThrow(/^\[ssr\] ssr: node must be a HellaNode/);
  });

  test("ssr.head() returns a fresh empty bag each call", () => {
    const a = ssr.head();
    const b = ssr.head();
    expect(a).not.toBe(b);                       // fresh — two walks never share a bag
    expect(a.meta).toEqual([]);
    expect(a.links).toEqual([]);
    expect(a.styles).toEqual([]);
    expect(a.title).toBeUndefined();
  });

  test.each(headParityCases)("hoists $name into the bag and omits them from the body", ({ node, body, bag }) => {
    const head = ssr.head();
    expect(ssr(node, { head })).toBe(body);      // exact body — hoisted tags absent, sibling markers unchanged / non-text tags in place
    expect(head).toEqual(bag);                   // exact bag — resolved attrs, resolved title text, unescaped CSS ('>' survives)
  });

  test("last title wins when two title elements hoist", () => {
    const head = ssr.head();
    const node = <div><title>First</title><section><title>Second</title></section></div>;
    expect(ssr(node, { head })).toBe("<div><section></section></div>");
    expect(head.title).toBe("Second");
  });
});
