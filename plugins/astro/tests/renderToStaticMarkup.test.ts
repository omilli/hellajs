import { describe, test, expect } from "bun:test";
import { signal } from "@hellajs/core";
import server from "../server.mjs";
import type { HellaNode } from "@hellajs/dom";

const { check, renderToStaticMarkup } = server;

describe("astro renderer", () => {
  test("renders a static component to its ssr HTML", async () => {
    const App = (): HellaNode => ({ tag: "main", children: ["hi"] });
    const { html } = await renderToStaticMarkup(App, {}, undefined);
    expect(html).toBe("<main>hi</main>");
  });

  test("maps the default slot to props.children as verbatim raw HTML", async () => {
    const App = (props: Record<string, unknown>): HellaNode => ({ tag: "main", children: props.children as HellaNode[] });
    const { html } = await renderToStaticMarkup(App, {}, { default: "<h1>Hi</h1><p>slot</p>" });
    expect(html).toBe("<main><!--[--><h1>Hi</h1><p>slot</p><!--]--></main>");
  });

  test("maps a named slot to a verbatim raw prop", async () => {
    const App = (props: Record<string, unknown>): HellaNode => ({ tag: "main", children: props.header as HellaNode[] });
    const { html } = await renderToStaticMarkup(App, {}, { header: "<b>Title</b>" });
    expect(html).toBe("<main><!--[--><b>Title</b><!--]--></main>");
  });

  test("check claims a function component and rejects a non-function", () => {
    expect(check(() => ({ tag: "x" }))).toBe(true);
    expect(check({})).toBe(false);
  });

  test("renders a component reading reactive state at its current value", async () => {
    const count = signal(5);
    const App = (): HellaNode => ({ tag: "p", children: [count] });
    const { html } = await renderToStaticMarkup(App, {}, undefined);
    expect(html).toBe("<p><!--[-->5<!--]--></p>");
  });

  test("passes slot HTML containing < and > through unescaped", async () => {
    const App = (props: Record<string, unknown>): HellaNode => ({ tag: "div", children: props.children as HellaNode[] });
    const { html } = await renderToStaticMarkup(App, {}, { default: "<b>x</b>" });
    expect(html).toBe("<div><!--[--><b>x</b><!--]--></div>");
  });
});
