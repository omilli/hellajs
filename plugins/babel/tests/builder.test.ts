import { describe, test, expect } from "vite-plus/test";
import { transformJSX } from "./helpers";

describe("babel", () => {
  describe("buildHellaNode", () => {
    test("basic element with tag only", () => {
      const output = transformJSX("<div />");
      expect(output).toContain('tag: "div"');
      expect(output).toMatch(/static:\s*true/);
    });

    test("element with props", () => {
      const output = transformJSX('<div id="test" class="container" />');
      expect(output).toContain('tag: "div"');
      expect(output).toContain("props: {");
      expect(output).toContain('id: "test"');
      expect(output).toContain('class: "container"');
    });

    test("element with children", () => {
      const output = transformJSX("<div>child text</div>");
      expect(output).toContain('tag: "div"');
      expect(output).toContain("children: [");
      expect(output).toContain('"child text"');
    });

    test("element with nested element", () => {
      const output = transformJSX("<div><span>nested</span></div>");
      expect(output).toContain('tag: "div"');
      expect(output).toContain("children: [");
      expect(output).toContain('tag: "span"');
    });

    test("static children are joined", () => {
      const output = transformJSX("<div>part1 part2</div>");
      expect(output).toContain('"part1 part2"');
    });

    test("renders element without attributes", () => {
      const output = transformJSX("<div>content</div>");
      expect(output).toContain('tag: "div"');
      expect(output).toContain("children: [");
      expect(output).not.toContain("props:");
    });

    test("fragment tag", () => {
      const output = transformJSX("<>a<span>b</span></>");
      expect(output).toContain('tag: "$"');
    });
  });

  describe("buildComponentCall", () => {
    test("uppercase component is wrapped", () => {
      const output = transformJSX("<Button />");
      expect(output).toContain("component(Button");
      expect(output).toMatch(/component\(\s*Button\s*,/);
    });

    test("component with props", () => {
      const output = transformJSX('<Button id="test" />');
      expect(output).toContain("component(Button");
      expect(output).toContain('id: "test"');
    });

    test("component with children", () => {
      const output = transformJSX("<Button>Click me</Button>");
      expect(output).toContain("component(Button");
      expect(output).toContain("children: [");
      expect(output).toContain('"Click me"');
    });

    test("static children are joined", () => {
      const output = transformJSX("<Button>part1 part2</Button>");
      expect(output).toContain('"part1 part2"');
    });

    test("member expression component (UI.Button)", () => {
      const output = transformJSX("<UI.Button />");
      expect(output).toContain("component(UI.Button");
    });

    test("empty props object when no attributes", () => {
      const output = transformJSX("<Component />");
      expect(output).toContain("component(Component");
      expect(output).toMatch(/component\(\s*Component\s*,\s*\{\s*\}\s*\)/);
    });
  });
});
