import { describe, test, expect, beforeEach } from "bun:test";
import { flush, signal } from "@hellajs/core";
import { resetTestState, setupContainer } from "@utils/test-helpers.js";
import { mount, hydrate, html, raw } from "@hellajs/dom/bundle";
import type { HellaNode } from "@hellajs/dom";
import { ssrContainer, suppressWarn } from "./helpers";

beforeEach(() => {
  resetTestState();
});

describe("dom raw child", () => {
  test("raw() returns { raw } with the HTML unchanged", () => {
    expect(raw("<h1>Hi</h1>")).toEqual({ raw: "<h1>Hi</h1>" });
  });

  test("adopts a multi-node raw region in place during hydrate without re-binding", () => {
    const label = signal("A");
    const App = () => html`<main>${raw("<h1>Hi</h1><p>slot</p>")}<span>${label}</span></main>`;
    const container = ssrContainer(html`<${App} />` as HellaNode);
    const h1Before = container.querySelector("h1")!;
    const pBefore = container.querySelector("p")!;

    hydrate(html`<${App} />` as HellaNode, container);

    // raw nodes adopted in place — same element references, not rebuilt
    expect(container.querySelector("h1")).toBe(h1Before);
    expect(container.querySelector("p")).toBe(pBefore);
    // a reactive sibling still binds — hydrate walked past the raw region cleanly
    expect(container.querySelector("span")?.textContent).toBe("A");
    label("B");
    flush();
    expect(container.querySelector("span")?.textContent).toBe("B");
  });

  test("warns and parses fresh when the raw-region marker is missing on hydrate", () => {
    const App = () => html`<div>${raw("<b>x</b>")}</div>`;
    const container = setupContainer();
    container.innerHTML = "<div></div>";

    const { warnings } = suppressWarn(() => hydrate(html`<${App} />` as HellaNode, container));

    expect(warnings.length).toBeGreaterThan(0);
    expect(container.querySelector("b")?.textContent).toBe("x");
  });

  test("mounts a raw child by parsing its HTML via a template (client-only)", () => {
    const App = () => html`<main>${raw("<h1>Hi</h1><p>slot</p>")}</main>`;
    const container = setupContainer();
    mount(html`<${App} />` as HellaNode, container);
    expect(container.querySelector("h1")?.textContent).toBe("Hi");
    expect(container.querySelector("p")?.textContent).toBe("slot");
  });

  test("renders a raw child resolved from a reactive getter and updates it", () => {
    const markup = signal("<b>x</b>");
    const App = () => html`<main>${() => raw(markup())}</main>`;
    const container = setupContainer();
    mount(html`<${App} />` as HellaNode, container);
    expect(container.querySelector("b")?.textContent).toBe("x");
    markup("<b>y</b>");
    flush();
    expect(container.querySelector("b")?.textContent).toBe("y");
  });
});
