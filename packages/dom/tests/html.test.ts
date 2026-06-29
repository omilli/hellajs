import { describe, test, expect, beforeEach } from "bun:test";
import { flush, signal } from "@hellajs/core";
import { resetTestState } from "@utils/test-helpers.js";
import { mount, html, onError } from "@hellajs/dom/bundle";
import type { HellaNode } from "@hellajs/dom";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("html", () => {
    test("same template literal reuses cached AST with fresh values", () => {
      const countA = signal(1);
      const countB = signal(2);

      // Template function that uses the same literal each call
      const make = (val: unknown) =>
        html`<span id="cached">${val}</span>` as HellaNode;

      const nodeA = make(countA);
      const nodeB = make(countB);

      // Both produce structurally equivalent nodes
      expect(nodeA.tag).toBe("span");
      expect(nodeB.tag).toBe("span");

      // Values are independently substituted - not shared references
      expect(nodeA.children![0]).toBe(countA);
      expect(nodeB.children![0]).toBe(countB);
      expect(nodeA.children![0]).not.toBe(nodeB.children![0]);
    });

    test("cached AST produces correct DOM on repeated renders", () => {
      const label = (text: string) => html`<p id="rep">${text}</p>`;

      mount(label("first"));
      expect(document.getElementById("rep")?.textContent).toBe("first");

      resetTestState();
      mount(label("second"));
      expect(document.getElementById("rep")?.textContent).toBe("second");
    });

    test("error:boundary creates error config on node", () => {
      const node = html`<div error:boundary>Content</div>` as HellaNode;
      expect(node.error?.boundary).toBe(true);
    });

    test("error:category assigns category to error config", () => {
      const node = html`<div error:category="network">Content</div>` as HellaNode;
      expect(node.error?.category).toBe("network");
    });

    test("error:fallback assigns fallback function to error config", () => {
      const fallbackFn = (err: Error) => html`<span>Error: ${err.message}</span>` as HellaNode;
      const node = html`<div error:fallback=${fallbackFn}>Content</div>` as HellaNode;
      expect(node.error?.fallback).toBe(fallbackFn);
    });

    test("combined error config renders error boundary", () => {
      const fallback = (_err: Error) => html`<span id="fallback-content">${_err.message}</span>` as HellaNode;
      // Register handler that delegates to element-level fallback
      onError((err, ctx) => ctx.config?.fallback?.(err) ?? null);

      mount(html`
        <div error:boundary error:fallback=${fallback}>
          ${() => { throw new Error("render error"); }}
        </div>
      `);

      expect(document.getElementById("fallback-content")).not.toBeNull();
    });

    test("renders 5 levels of nesting", () => {
      mount(html`
        <div id="l1">
          <div id="l2">
            <div id="l3">
              <div id="l4">
                <span id="l5">Deep</span>
              </div>
            </div>
          </div>
        </div>
      `);

      expect(document.getElementById("l5")?.textContent).toBe("Deep");
      expect(document.getElementById("l4")?.contains(document.getElementById("l5"))).toBe(true);
      expect(document.getElementById("l1")?.contains(document.getElementById("l5"))).toBe(true);
    });

    test("reactive signals propagate through deep nesting", () => {
      const value = signal("initial");

      mount(html`
        <div>
          <section>
            <article>
              <p id="deep-reactive">${value}</p>
            </article>
          </section>
        </div>
      `);

      expect(document.getElementById("deep-reactive")?.textContent).toBe("initial");

      value("updated");
      flush();
      expect(document.getElementById("deep-reactive")?.textContent).toBe("updated");
    });

    test("returning fragment renders all children", () => {
      const FragComp = () => html`<span id="a">A</span><span id="b">B</span>`;
      mount(html`<div><${FragComp} /></div>`);

      expect(document.getElementById("a")?.textContent).toBe("A");
      expect(document.getElementById("b")?.textContent).toBe("B");
    });

    test("multiple dynamic components in sequence", () => {
      const Label = (props: { text: string }) => html`<span>${props.text}</span>`;
      mount(html`
        <div id="multi-comp">
          <${Label} text="first" />
          <${Label} text="second" />
          <${Label} text=${"third"} />
        </div>
      `);

      const spans = document.querySelectorAll("#multi-comp span");
      expect(spans.length).toBe(3);
      expect(spans[0]!.textContent).toBe("first");
      expect(spans[1]!.textContent).toBe("second");
      expect(spans[2]!.textContent).toBe("third");
    });

    test("false and null render as empty string", () => {
      mount(html`<div id="norm-false">${false}</div>`);
      expect(document.getElementById("norm-false")?.textContent).toBe("");

      resetTestState();
      mount(html`<div id="norm-null">${null}</div>`);
      expect(document.getElementById("norm-null")?.textContent).toBe("");
    });

    test("zero renders as '0'", () => {
      resetTestState();
      mount(html`<div id="norm-zero">${0}</div>`);
      expect(document.getElementById("norm-zero")?.textContent).toBe("0");
    });

    test("string interpolated in attribute is set directly on node", () => {
      const id = "attr-string-test";
      const node = html`<div id=${id}>Content</div>` as HellaNode;
      expect(node.props?.id).toBe(id);
    });

    test("single-quoted attribute value", () => {
      const node = html`<div class='container'>Content</div>` as HellaNode;
      expect(node.props?.class).toBe("container");
    });

    test("unquoted attribute value", () => {
      const node = html`<div class=container>Content</div>` as HellaNode;
      expect(node.props?.class).toBe("container");
    });

    test("mixed single and double quoted attributes", () => {
      const node = html`<div id="main" class='content'>Text</div>` as HellaNode;
      expect(node.props?.id).toBe("main");
      expect(node.props?.class).toBe("content");
    });

    test("single-quoted attribute with expression", () => {
      const cls = "dynamic";
      const node = html`<div class='${cls}'>Content</div>` as HellaNode;
      expect(node.props?.class).toBe(cls);
    });

    test("multi-line template preserves structure", () => {
      mount(html`
        <div id="multiline">
          <span id="inner">deep</span>
        </div>
      `);
      expect(document.getElementById("multiline")).not.toBeNull();
      expect(document.getElementById("inner")?.textContent).toBe("deep");
    });

    test("HTML comments are skipped", () => {
      const node = html`<div><!-- comment --><span id="comment-test">visible</span></div>` as HellaNode;
      expect(node.children).toHaveLength(1);
      const child = node.children![0] as HellaNode;
      expect(child.tag).toBe("span");
      expect(child.props?.id).toBe("comment-test");
    });

    test("DOCTYPE declaration is ignored", () => {
      const node = html`<!DOCTYPE html><div id="doctype-test">content</div>` as HellaNode;
      const root = node as HellaNode;
      expect(root.tag).toBe("div");
      expect(root.props?.id).toBe("doctype-test");
    });

    test("expression with single-quoted attribute resolves correctly", () => {
      const val = "resolved";
      const node = html`<input type='${val}' />` as HellaNode;
      expect(node.props?.type).toBe(val);
    });

    test("unquoted attribute with expression", () => {
      const val = "resolved";
      const node = html`<input type=${val} />` as HellaNode;
      expect(node.props?.type).toBe(val);
    });

    test("root-level string wraps in fragment", () => {
      const result = html`hello` as HellaNode;
      expect(result.tag).toBe("$");
      expect(result.children).toEqual(["hello"]);
    });

    test("root-level signal returns signal directly", () => {
      const s = signal(42);
      const result = html`${s}`;
      expect(result as unknown).toBe(s);
    });

    test("static subtree is shared across invocations without cloning", () => {
      const make = () => html`<div id="static"><span>hello</span></div>` as HellaNode;

      const nodeA = make();
      const nodeB = make();

      // Cached AST is the same object — no clone was made
      expect(nodeA.children![0] as unknown).toBe(nodeB.children![0]);
      expect(nodeA.props?.id).toBe("static");
      expect(nodeB.props?.id).toBe("static");
    });

    test("static child element is same reference across invocations", () => {
      const make = () => html`<div><p class="x">static</p><span>${42}</span></div>` as HellaNode;

      const nodeA = make();
      const nodeB = make();

      // The <p> is fully static — shared reference
      const pA = nodeA.children![0] as HellaNode;
      const pB = nodeB.children![0] as HellaNode;
      expect(pA).toBe(pB);

      // The parent <div> contains a dynamic child — NOT shared
      expect(nodeA).not.toBe(nodeB);
    });

    test("dynamic parts still produce unique values per invocation", () => {
      const sA = signal("a");
      const sB = signal("b");

      const make = (s: unknown) => html`<div><span>${s}</span></div>` as HellaNode;

      const nodeA = make(sA);
      const nodeB = make(sB);

      // Dynamic children are independently resolved
      const spanA = nodeA.children![0] as HellaNode;
      const spanB = nodeB.children![0] as HellaNode;
      expect(spanA.children![0]).toBe(sA);
      expect(spanB.children![0]).toBe(sB);
      expect(spanA.children![0]).not.toBe(spanB.children![0]);

      // Parent nodes are different (contain dynamic children)
      expect(nodeA).not.toBe(nodeB);
    });

    test("static subtree produces independent DOM on repeated mounts", () => {
      const makeStatic = () => html`<div id="indep-test"><span>hello</span></div>` as HellaNode;

      const app1 = document.createElement("div");
      document.body.appendChild(app1);
      mount(makeStatic(), app1);

      const app2 = document.createElement("div");
      document.body.appendChild(app2);
      mount(makeStatic(), app2);

      const span1 = app1.querySelector("span")!;
      const span2 = app2.querySelector("span")!;

      expect(span1).not.toBeNull();
      expect(span2).not.toBeNull();
      expect(span1).not.toBe(span2);
      expect(span1.textContent).toBe("hello");
      expect(span2.textContent).toBe("hello");

      span1.textContent = "mutated";
      expect(span2.textContent).toBe("hello");

      app1.remove();
      app2.remove();
    });

    test("static subtree inside non-static parent mounts correctly", () => {
      const dynamic = signal("world");
      const makeMixed = () => html`
        <div id="mixed-static">
          <p class="static-child">hello</p>
          <span>${dynamic}</span>
        </div>
      ` as HellaNode;

      mount(makeMixed());
      expect(document.getElementById("mixed-static")).not.toBeNull();
      expect(document.querySelector(".static-child")?.textContent).toBe("hello");
      expect(document.querySelector("#mixed-static span")?.textContent).toBe("world");
    });

    test("deeply nested template with mixed static/dynamic content", () => {
      const make = () => html`
        <div id="root">
          <header>
            <h1>Title</h1>
            <nav>
              <a href="/">Home</a>
              <a href="/about">About</a>
            </nav>
          </header>
          <main>
            <article>
              <p>${"Static text that goes through placeholder path"}</p>
            </article>
          </main>
        </div>
      ` as HellaNode;

      const nodeA = make();
      const nodeB = make();

      // Static subtrees (header, nav, links) are shared
      const headerA = nodeA.children![0] as HellaNode;
      const headerB = nodeB.children![0] as HellaNode;
      expect(headerA.children![0]).toBe(headerB.children![0]); // <header>
      // header is fully static (no placeholders) — shared reference
      expect(headerA).toBe(headerB);
      const mainA = nodeA.children![1] as HellaNode;
      const mainB = nodeB.children![1] as HellaNode;
      expect(mainA).not.toBe(mainB);
    });
  });
});