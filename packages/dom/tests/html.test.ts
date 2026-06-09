import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mount, html, onError, clearErrorHandlers } from "@hellajs/dom/bundle";
import type { HellaNode } from "@hellajs/dom";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

describe("template cache", () => {
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

    document.body.innerHTML = '<div id="app"></div>';
    mount(label("second"));
    expect(document.getElementById("rep")?.textContent).toBe("second");
  });
});

describe("error: prefix attributes", () => {
  afterEach(() => clearErrorHandlers());

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
});

describe("deeply nested templates", () => {
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
});

describe("component fragment support", () => {
  test("component returning fragment renders all children", () => {
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
});

describe("value normalization in text content", () => {
  test("false and null render empty, 0 renders as string", () => {
    mount(html`<div id="norm-false">${false}</div>`);
    expect(document.getElementById("norm-false")?.textContent).toBe("");

    document.body.innerHTML = '<div id="app"></div>';
    mount(html`<div id="norm-null">${null}</div>`);
    expect(document.getElementById("norm-null")?.textContent).toBe("");

    document.body.innerHTML = '<div id="app"></div>';
    mount(html`<div id="norm-zero">${0}</div>`);
    expect(document.getElementById("norm-zero")?.textContent).toBe("0");
  });

  test("string interpolated in attribute is set directly on node", () => {
    const id = "attr-string-test";
    const node = html`<div id=${id}>Content</div>` as HellaNode;
    expect(node.props?.id).toBe(id);
  });
});

describe("text-only templates", () => {
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
});
