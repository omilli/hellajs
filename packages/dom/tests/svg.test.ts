import { describe, test, expect, beforeEach } from "bun:test";
import { flush, signal } from "@hellajs/core";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { mount, html, hydrate, component, ForEach, Lazy, Suspense } from "@hellajs/dom/bundle";
import type { HellaNode } from "@hellajs/dom";
import { suppressWarn, ssrContainer } from "./helpers";

const SVG_NS = "http://www.w3.org/2000/svg";
const MATHML_NS = "http://www.w3.org/1998/Math/MathML";
const HTML_NS = "http://www.w3.org/1999/xhtml";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("svg and mathml namespaces", () => {
    test("mounts a root <svg> as an SVGSVGElement", () => {
      mount(html`<svg id="icon"></svg>`);

      const el = document.getElementById("icon")!;
      expect(el.constructor.name).toBe("SVGSVGElement");
      expect(el.namespaceURI).toBe(SVG_NS);
    });

    test("mounts camelCase svg children as their SVG constructors", () => {
      mount(html`<svg><clipPath id="clip"></clipPath><linearGradient id="grad"></linearGradient></svg>`);

      expect(document.getElementById("clip")!.constructor.name).toBe("SVGClipPathElement");
      expect(document.getElementById("grad")!.constructor.name).toBe("SVGLinearGradientElement");
    });

    test("resets to the HTML namespace inside <foreignObject>", () => {
      mount(html`<svg><foreignObject id="host"><div id="html-child"></div></foreignObject></svg>`);

      expect(document.getElementById("host")!.namespaceURI).toBe(SVG_NS);
      const div = document.getElementById("html-child")!;
      expect(div.constructor.name).toBe("HTMLDivElement");
      expect(div.namespaceURI).toBe(HTML_NS);
    });

    test("mounts <math> and <mi> in the MathML namespace", () => {
      mount(html`<math id="formula"><mi id="var">x</mi></math>`);

      expect(document.getElementById("formula")!.namespaceURI).toBe(MATHML_NS);
      expect(document.getElementById("var")!.namespaceURI).toBe(MATHML_NS);
      expect(document.getElementById("var")!.textContent).toBe("x");
    });

    test("mounts ForEach items in the SVG namespace under an <svg> parent", () => {
      const radii = signal([3, 5]);
      const App = () => html`<svg id="list"><${ForEach} each=${radii} use=${(r: number) => html`<circle key=${r} cx=${r} cy=${r} r=${r} />`} /></svg>` as HellaNode;

      mount(App);

      const circles = document.getElementById("list")!.querySelectorAll("circle");
      expect(circles.length).toBe(2);
      expect(circles[0]!.constructor.name).toBe("SVGCircleElement");
      expect(circles[1]!.constructor.name).toBe("SVGCircleElement");
      expect(circles[0]!.namespaceURI).toBe(SVG_NS);
    });

    test("updates a reactive child inside <svg> in place", () => {
      const label = signal("a");
      const App = () => html`<svg><text id="label">${label}</text></svg>` as HellaNode;

      mount(App);

      const text = document.getElementById("label")!;
      expect(text.constructor.name).toBe("SVGTextElement");
      expect(text.textContent).toBe("a");

      label("b");
      flush();
      expect(document.getElementById("label")).toBe(text);
      expect(text.textContent).toBe("b");
    });

    test("resolves Lazy children into the SVG namespace under an <svg> parent", async () => {
      const App = () => html`<svg id="icon"><${Lazy} loader=${() => delay(html`<circle id="lazy-circle" r="4" />`)} /></svg>` as HellaNode;

      mount(App);
      await delay();

      const circle = document.getElementById("lazy-circle")!;
      expect(circle.constructor.name).toBe("SVGCircleElement");
      expect(circle.namespaceURI).toBe(SVG_NS);
    });

    test("mounts a JSX-shaped children array in the SVG namespace", () => {
      // JSX compiles <Suspense><circle/></Suspense> to component(Suspense, { children: [node] }) — an array
      mount(html`<svg id="icon">${component(Suspense, { children: [html`<circle id="jsx-circle" r="2" />`] })}</svg>`);

      const circle = document.getElementById("jsx-circle")!;
      expect(circle.constructor.name).toBe("SVGCircleElement");
      expect(circle.namespaceURI).toBe(SVG_NS);
    });

    test("hydrates an ssr'd svg region without mismatch warnings and wires reactivity", () => {
      const width = signal("24");
      const App = () => html`<svg id="icon" width=${() => width()}><clipPath id="clip"><rect width="10" /></clipPath></svg>`;
      const container = ssrContainer(html`<${App} />`);
      const clipBefore = container.querySelector("#clip")!;

      const { warnings } = suppressWarn(() => hydrate(html`<${App} />`, container));

      expect(warnings.length).toBe(0);
      expect(container.querySelector("#clip")).toBe(clipBefore);
      width("48");
      flush();
      expect(container.querySelector("#icon")!.getAttribute("width")).toBe("48");
    });
  });
});
