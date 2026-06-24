import { describe, test, expect, beforeEach, mock } from "bun:test";
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
  });
});
