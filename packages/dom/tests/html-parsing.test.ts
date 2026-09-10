import { describe, test, expect, beforeEach } from "bun:test";
import { resetTestState } from "@utils/test-helpers.js";
import { mount, html } from "@hellajs/dom/bundle";
import type { HellaNode } from "@hellajs/dom";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("html parsing", () => {
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

    test("text after an unclosed void element becomes its sibling", () => {
      const node = html`<div><br>text</div>` as HellaNode;
      expect(node.tag).toBe("div");
      expect(node.children).toEqual([
        { tag: "br", props: {}, children: [], static: true },
        "text"
      ]);
    });

    test("closing an ancestor implicitly closes nested open elements", () => {
      const node = html`<div><span>a</div>` as HellaNode;
      expect(node.tag).toBe("div");
      expect(node.children).toEqual([
        { tag: "span", props: {}, children: ["a"], static: true }
      ]);
    });

    test("stray closing tag without matching open is ignored", () => {
      const node = html`<div>a</span>b</div>` as HellaNode;
      expect(node.tag).toBe("div");
      expect(node.children).toEqual(["a", "b"]);
    });

    test("unclosed elements auto-close at EOF without duplication", () => {
      const node = html`<div><span>x` as HellaNode;
      expect(node.children).toEqual([
        { tag: "span", props: {}, children: ["x"], static: true }
      ]);
    });

    test("nested unclosed tags render once, nested", () => {
      mount(html`<div><span>hi`);
      expect(document.getElementById("app")?.innerHTML).toBe("<div><span>hi</span></div>");
    });

    test("single unclosed root still flushes", () => {
      mount(html`<div>hi`);
      expect(document.getElementById("app")?.innerHTML).toBe("<div>hi</div>");
    });

    test("partially-closed siblings flush correctly", () => {
      mount(html`<div>a<span>b</span><section>c`);
      expect(document.getElementById("app")?.innerHTML).toBe("<div>a<span>b</span><section>c</section></div>");
    });
  });
});
