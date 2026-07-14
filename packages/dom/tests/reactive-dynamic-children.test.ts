import { describe, test, expect, beforeEach, mock } from "bun:test";
import { flush, signal } from "@hellajs/core";
import {resetTestState} from "@utils/test-helpers.js";
import { mount, html } from "@hellajs/dom/bundle";

beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("reactive dynamic children", () => {
    test("proxy forwards non-appendChild property access for custom dynamic components", () => {
      const toggle = signal<(() => void) | null>(null);
      const accessedNodeType = mock(() => {});

      const CustomDynamic = ((parent: Element) => {
        const nodeType = (parent as unknown as { nodeType: number }).nodeType;
        if (nodeType !== undefined) accessedNodeType();
        parent.appendChild(document.createTextNode("dynamic"));
      }) as (() => void) & { isDynamic: boolean };
      CustomDynamic.isDynamic = true;

      mount(html`
        <div id="host">
          ${() => toggle()}
        </div>
      `);

      expect(document.getElementById("host")?.textContent).toBe("");

      toggle(CustomDynamic);
      flush();

      expect(document.getElementById("host")?.textContent).toContain("dynamic");
      expect(accessedNodeType).toHaveBeenCalledTimes(1);
    });

    test("dynamic component appends multiple nodes in order before the anchor", () => {
      const toggle = signal<(() => void) | null>(null);

      const MultiNode = ((parent: Element) => {
        parent.appendChild(document.createElement("span")).textContent = "a";
        parent.appendChild(document.createElement("span")).textContent = "b";
        parent.appendChild(document.createElement("span")).textContent = "c";
      }) as (() => void) & { isDynamic: boolean };
      MultiNode.isDynamic = true;

      mount(html`
        <div id="host">
          ${() => toggle()}
        </div>
      `);

      toggle(MultiNode);
      flush();

      const spans = document.querySelectorAll("#host span");
      expect(spans).toHaveLength(3);
      expect(spans[0]?.textContent).toBe("a");
      expect(spans[1]?.textContent).toBe("b");
      expect(spans[2]?.textContent).toBe("c");
    });
  });
});
