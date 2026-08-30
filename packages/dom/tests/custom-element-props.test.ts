import { describe, test, expect, beforeEach } from "bun:test";
import { resetTestState } from "@utils/test-helpers.js";
import { mount, html } from "@hellajs/dom/bundle";

class MockChart extends HTMLElement {
  data: { series: number[] } | null = null;
  rows: unknown[] = [];
}

customElements.define("x-chart", MockChart);

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("custom element property props", () => {
    test("assigns an object prop to the element property on a defined custom element", () => {
      const points = { series: [1, 2, 3] };
      mount(html`<x-chart id="chart" data=${points}></x-chart>`);

      expect((document.getElementById("chart") as MockChart).data).toBe(points);
    });

    test("assigns an array prop to the element property by reference", () => {
      const rows = ["a", "b"];
      mount(html`<x-chart id="chart" rows=${rows}></x-chart>`);

      expect((document.getElementById("chart") as MockChart).rows).toBe(rows);
      expect(document.getElementById("chart")!.getAttribute("rows")).toBe(null);
    });

    test("joins class arrays instead of property-assigning on a custom element", () => {
      mount(html`<x-chart id="chart" class=${["a", "b"]}></x-chart>`);

      expect(document.getElementById("chart")!.getAttribute("class")).toBe("a b");
    });

    test("removeAttributes falsy props before the property branch can assign", () => {
      mount(html`<x-chart id="chart" data=${false}></x-chart>`);

      const chart = document.getElementById("chart") as MockChart;
      expect(chart.getAttribute("data")).toBe(null);
      expect(chart.data).toBe(null);
    });

    test("stringifies object props on standard elements", () => {
      mount(html`<div id="el" data-config=${{ mode: "fast" }}></div>`);

      expect(document.getElementById("el")!.getAttribute("data-config")).toBe("[object Object]");
    });
  });
});
