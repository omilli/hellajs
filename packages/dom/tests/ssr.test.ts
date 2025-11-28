import { describe, test, expect } from "bun:test";
import { html, ForEach, ssr } from "../";
import type { HellaNode } from "../lib/types";

describe("ssr", () => {
  describe("static elements", () => {
    test("renders simple element", () => {
      const node = html`<div>Hello</div>`;
      expect(ssr(node as HellaNode)).toBe("<div>Hello</div>");
    });

    test("renders element with attributes", () => {
      const node = html`<div class="box" id="main">Content</div>`;
      expect(ssr(node as HellaNode)).toBe('<div class="box" id="main">Content</div>');
    });

    test("renders nested elements", () => {
      const node = html`<ul><li>A</li><li>B</li></ul>`;
      expect(ssr(node as HellaNode)).toBe("<ul><li>A</li><li>B</li></ul>");
    });

    test("renders deeply nested elements", () => {
      const node = html`<div><section><article><p>Deep</p></article></section></div>`;
      expect(ssr(node as HellaNode)).toBe("<div><section><article><p>Deep</p></article></section></div>");
    });
  });

  describe("void elements", () => {
    test("renders input as self-closing", () => {
      const node = html`<input type="text" />`;
      expect(ssr(node as HellaNode)).toBe('<input type="text">');
    });

    test("renders br as self-closing", () => {
      const node = html`<br />`;
      expect(ssr(node as HellaNode)).toBe("<br>");
    });

    test("renders img with attributes", () => {
      const node = html`<img src="pic.jpg" alt="Picture" />`;
      expect(ssr(node as HellaNode)).toBe('<img src="pic.jpg" alt="Picture">');
    });

    test("renders meta tag", () => {
      const node = html`<meta charset="utf-8" />`;
      expect(ssr(node as HellaNode)).toBe('<meta charset="utf-8">');
    });
  });

  describe("attributes", () => {
    test("renders boolean true as attribute name only", () => {
      const node = html`<input disabled />`;
      expect(ssr(node as HellaNode)).toBe("<input disabled>");
    });

    test("skips false boolean attributes", () => {
      const node: HellaNode = { tag: "input", props: { disabled: false } };
      expect(ssr(node)).toBe("<input>");
    });

    test("skips null attributes", () => {
      const node: HellaNode = { tag: "div", props: { class: undefined } };
      expect(ssr(node)).toBe("<div></div>");
    });

    test("skips undefined attributes", () => {
      const node: HellaNode = { tag: "div", props: { class: undefined } };
      expect(ssr(node)).toBe("<div></div>");
    });

    test("renders array class values joined with space", () => {
      const node: HellaNode = { tag: "div", props: { class: ["btn", "primary", "large"] } };
      expect(ssr(node)).toBe('<div class="btn primary large"></div>');
    });

    test("filters falsy values from array attributes", () => {
      const node: HellaNode = { tag: "div", props: { class: ["btn", null, "primary", undefined, false, ""] } };
      expect(ssr(node)).toBe('<div class="btn primary"></div>');
    });
  });

  describe("HTML escaping", () => {
    test("escapes text content", () => {
      const node = html`<div>${"<script>alert('xss')</script>"}</div>`;
      expect(ssr(node as HellaNode)).toBe("<div>&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;</div>");
    });

    test("escapes attribute values", () => {
      const node: HellaNode = { tag: "div", props: { title: 'Say "Hello" & <goodbye>' } };
      expect(ssr(node)).toBe('<div title="Say &quot;Hello&quot; &amp; &lt;goodbye&gt;"></div>');
    });

    test("escapes ampersand in text", () => {
      const node = html`<div>Tom & Jerry</div>`;
      expect(ssr(node as HellaNode)).toBe("<div>Tom &amp; Jerry</div>");
    });
  });

  describe("dynamic content", () => {
    test("resolves signal values", () => {
      const count = signal(5);
      const node = html`<span>${count}</span>`;
      expect(ssr(node as HellaNode)).toBe("<span>5</span>");
    });

    test("resolves function values", () => {
      const getValue = () => "dynamic";
      const node = html`<span>${getValue}</span>`;
      expect(ssr(node as HellaNode)).toBe("<span>dynamic</span>");
    });

    test("resolves computed values", () => {
      const a = signal(2);
      const b = signal(3);
      const sum = computed(() => a() + b());
      const node = html`<span>${sum}</span>`;
      expect(ssr(node as HellaNode)).toBe("<span>5</span>");
    });
  });

  describe("event handlers", () => {
    test("skips on: handlers (client-only)", () => {
      const handler = () => { };
      const node = html`<button on:click=${handler}>Click</button>`;
      expect(ssr(node as HellaNode)).toBe("<button>Click</button>");
    });
  });

  describe("fragments", () => {
    test("renders fragment children without wrapper", () => {
      const node = html`<div>A</div><div>B</div>`;
      expect(ssr(node as HellaNode)).toBe("<div>A</div><div>B</div>");
    });

    test("renders mixed fragment content", () => {
      const node = html`<span>First</span>Middle<span>Last</span>`;
      expect(ssr(node as HellaNode)).toBe("<span>First</span>Middle<span>Last</span>");
    });
  });

  describe("components", () => {
    test("renders component function", () => {
      const Button = (props: { children: string }) => html`<button>${props.children}</button>`;
      const node = html`<${Button}>Click</${Button}>`;
      expect(ssr(node as HellaNode)).toBe("<button>Click</button>");
    });

    test("renders nested components", () => {
      const Inner = (props: { text: string }) => html`<span>${props.text}</span>`;
      const Outer = (props: { children: any }) => html`<div>${props.children}</div>`;
      const node = html`<${Outer}><${Inner} text="Hello" /></${Outer}>`;
      expect(ssr(node as HellaNode)).toBe("<div><span>Hello</span></div>");
    });
  });

  describe("ForEach", () => {
    test("renders list items", () => {
      const items = ["A", "B", "C"];
      const node = html`<ul><${ForEach} each=${items} use=${(x: string) => html`<li>${x}</li>`} /></ul>`;
      expect(ssr(node as HellaNode)).toBe("<ul><li>A</li><li>B</li><li>C</li></ul>");
    });

    test("renders empty list as empty string", () => {
      const items: string[] = [];
      const node = html`<ul><${ForEach} each=${items} use=${(x: string) => html`<li>${x}</li>`} /></ul>`;
      expect(ssr(node as HellaNode)).toBe("<ul></ul>");
    });

    test("renders fallback for empty list", () => {
      const items: string[] = [];
      const node = html`<ul><${ForEach} each=${items} use=${(x: string) => html`<li>${x}</li>`} fallback=${html`<li>Empty</li>`} /></ul>`;
      expect(ssr(node as HellaNode)).toBe("<ul><li>Empty</li></ul>");
    });

    test("renders list with signal source", () => {
      const items = signal(["X", "Y"]);
      const node = html`<ul><${ForEach} each=${items} use=${(x: string) => html`<li>${x}</li>`} /></ul>`;
      expect(ssr(node as HellaNode)).toBe("<ul><li>X</li><li>Y</li></ul>");
    });

    test("renders complex list items", () => {
      const products = [
        { id: 1, name: "Apple", price: 1.5 },
        { id: 2, name: "Banana", price: 0.75 }
      ];
      const node = html`
        <ul><${ForEach} each=${products} use=${(p: typeof products[0]) => html`
          <li data-id=${p.id}>${p.name} - $${p.price}</li>
        `} /></ul>
      `;
      const result = ssr(node as HellaNode);
      expect(result).toContain('<li data-id="1">Apple - $1.5</li>');
      expect(result).toContain('<li data-id="2">Banana - $0.75</li>');
    });
  });

  describe("edge cases", () => {
    test("renders empty element", () => {
      const node = html`<div></div>`;
      expect(ssr(node as HellaNode)).toBe("<div></div>");
    });

    test("renders zero as text", () => {
      const node = html`<span>${0}</span>`;
      expect(ssr(node as HellaNode)).toBe("<span>0</span>");
    });

    test("renders false as empty string", () => {
      const node = html`<span>${false}</span>`;
      expect(ssr(node as HellaNode)).toBe("<span></span>");
    });

    test("renders null as empty string", () => {
      const node = html`<span>${null}</span>`;
      expect(ssr(node as HellaNode)).toBe("<span></span>");
    });

    test("handles function returning HellaNode", () => {
      const getNode = () => ({ tag: "strong", children: ["Bold"] } as HellaNode);
      const node = html`<div>${getNode}</div>`;
      expect(ssr(node as HellaNode)).toBe("<div><strong>Bold</strong></div>");
    });
  });
});
