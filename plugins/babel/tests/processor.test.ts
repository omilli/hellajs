import { describe, test, expect } from "bun:test";
import types from "@babel/types";
import { processComponentAttributes } from "../src/processors/attributes.mjs";
import { transformJSX } from "./helpers";


describe("babel", () => {
  describe("attribute processing", () => {
    test("regular props", () => {
      const output = transformJSX('<div id="test" class="container" />');
      expect(output).toContain('tag: "div"');
      expect(output).toContain("props: {");
      expect(output).toContain('id: "test"');
      expect(output).toContain('class: "container"');
    });

    test("on: prefix for events", () => {
      const output = transformJSX("<div on:click={handler} on:input={onInput} />");
      expect(output).toContain("on: {");
      expect(output).toContain("click: handler");
      expect(output).toContain("input: onInput");
    });

    test("hook: prefix for lifecycle", () => {
      const output = transformJSX("<div hook:mount={onMount} hook:update={onUpdate} />");
      expect(output).toContain("hooks: {");
      expect(output).toContain("mount: onMount");
      expect(output).toContain("update: onUpdate");
    });

    test("error: prefix for error config", () => {
      const output = transformJSX('<div error:fallback={handleError} error:category="modal" />');
      expect(output).toContain("error: {");
      expect(output).toContain("fallback: handleError");
      expect(output).toContain('category: "modal"');
    });

    test("mixed attributes", () => {
      const output = transformJSX(`
        <div
          id="test"
          on:click={handler}
          hook:mount={onMount}
        />
      `);
      expect(output).toContain('id: "test"');
      expect(output).toContain("on: {");
      expect(output).toContain("hooks: {");
    });

    test("camelCase data/aria to kebab-case", () => {
      const output = transformJSX('<div dataTestId="123" ariaLabel="label" />');
      expect(output).toContain('"data-test-id"');
      expect(output).toContain('"aria-label"');
    });

    test("kebab-case props are quoted", () => {
      const output = transformJSX('<div data-custom="value" />');
      expect(output).toContain('"data-custom"');
    });

    test("boolean attributes without value", () => {
      const output = transformJSX("<input required disabled />");
      expect(output).toContain("required: true");
      expect(output).toContain("disabled: true");
    });

    test("boolean attributes with false", () => {
      const output = transformJSX("<input disabled={false} />");
      expect(output).toContain("disabled: false");
    });

    test("spread attributes go to props", () => {
      const output = transformJSX("<div {...props} />");
      expect(output).toContain("...props");
    });
  });

  describe("component attribute handling", () => {
    test("component with on: events", () => {
      const output = transformJSX("<Button on:click={handler}>Click</Button>");
      // Components get event handlers merged into props with the prefix removed
      expect(output).toContain("click: handler");
    });

    test("component with hook: lifecycle", () => {
      const output = transformJSX("<Component hook:mount={onMount} />");
      // Components get hooks merged into props with the prefix removed
      expect(output).toContain("mount: onMount");
    });

    test("component merges all attributes into props", () => {
      const output = transformJSX(`
        <Button
          id="test"
          on:click={handler}
        />
      `);
      expect(output).toContain('id: "test"');
      expect(output).toContain("click: handler");
    });

    test("component with error: config", () => {
      const output = transformJSX("<Button error:fallback={handleError}>Click</Button>");
      // Components get error config merged into props with the prefix removed
      expect(output).toContain("fallback: handleError");
    });

    test("component with error: category", () => {
      const output = transformJSX('<Modal error:fallback={fallback} error:category="modal" />');
      expect(output).toContain("fallback: fallback");
      expect(output).toContain('category: "modal"');
    });
  });

  describe("filterEmptyChildren", () => {
    test("removes empty text nodes", () => {
      const output = transformJSX("<div>\n  \n  <span>text</span>\n</div>");
      // Should not have empty strings in children
      expect(output).toContain("children: [");
    });

    test("keeps meaningful text", () => {
      const output = transformJSX("<div>Hello World</div>");
      expect(output).toContain("children: [");
      expect(output).toContain('"Hello World"');
    });

    test("normalizes whitespace", () => {
      const output = transformJSX("<div>\n  Hello   \n  World\n</div>");
      // Should normalize multiple spaces to single space
      expect(output).toContain("Hello World");
    });

    test("handles expression containers", () => {
      const output = transformJSX("<div>{expression}</div>");
      expect(output).toContain("expression");
    });

    test("props.children is spread", () => {
      const output = transformJSX("<div>{props.children}</div>");
      expect(output).toContain("...props.children");
    });

    test("nested elements", () => {
      const output = transformJSX("<div><span>nested</span></div>");
      expect(output).toContain("children: [");
    });

    test("multiple children", () => {
      const output = transformJSX("<div>text1<span>text2</span>text3</div>");
      expect(output).toContain("children: [");
    });
  });

  describe("processAttributeValue", () => {
    test("extracts expression from container", () => {
      const output = transformJSX("<div class={dynamicClass} />");
      expect(output).toContain("class: dynamicClass");
    });

    test("handles string literals", () => {
      const output = transformJSX('<div class="static" />');
      expect(output).toContain('class: "static"');
    });

    test("handles boolean literals", () => {
      const output = transformJSX("<input disabled={true} />");
      expect(output).toContain("disabled: true");
    });

    test("handles numbers", () => {
      const output = transformJSX("<div data-count={42} />");
      expect(output).toContain('"data-count": 42');
    });

    test("handles null", () => {
      const output = transformJSX("<div data-value={null} />");
      expect(output).toContain('"data-value": null');
    });

    test("handles member expressions", () => {
      const output = transformJSX("<div value={obj.prop} />");
      expect(output).toContain("value: obj.prop");
    });

    test("handles function calls", () => {
      const output = transformJSX("<div onClick={handleClick()} />");
      expect(output).toContain("onClick: () => handleClick()");
    });

    test("handles object expressions", () => {
      const output = transformJSX("<div data={obj} />");
      expect(output).toContain("data: obj");
    });

    test("handles array expressions", () => {
      const output = transformJSX("<div items={list} />");
      expect(output).toContain("items: list");
    });

    test("handles binary expressions", () => {
      const output = transformJSX("<div value={a + b} />");
      expect(output).toContain("value: a + b");
    });

    test("handles logical expressions", () => {
      const output = transformJSX("<div value={a && b} />");
      expect(output).toContain("value: a && b");
    });

    test("handles arrow functions", () => {
      const output = transformJSX("<div onClick={() => {}} />");
      expect(output).toContain("onClick: () => {}");
    });

    test("handles template literals", () => {
      const output = transformJSX("<div class={`base ${extra}`} />");
      expect(output).toContain("class: `base ${extra}`");
    });
  });

  describe("html`` attribute processing", () => {
    test("on: in template", () => {
      const output = transformJSX('const node = html`<div on:click="${handler}"></div>`;');
      expect(output).toContain("on: {");
      expect(output).toContain("click: handler");
    });

    test("hook: in template", () => {
      const output = transformJSX('const node = html`<div hook:mount="${callback}"></div>`;');
      expect(output).toContain("hooks: {");
      expect(output).toContain("mount: callback");
    });

    test("error: in template", () => {
      const output = transformJSX('const node = html`<div error:fallback="${handleError}" error:category="modal"></div>`;');
      expect(output).toContain("error: {");
      expect(output).toContain("fallback: handleError");
      expect(output).toContain('category: "modal"');
    });

    test("mixed prefixes in template", () => {
      const output = transformJSX(`
      const node = html\`
        <div
          id="test"
          on:click="\${handler}"
          hook:mount="\${callback}"
        ></div>
      \`;
    `);
      expect(output).toContain('id: "test"');
      expect(output).toContain("on: {");
      expect(output).toContain("hooks: {");
    });

    test("boolean attributes in template", () => {
      const output = transformJSX("const node = html`<input required disabled></input>`;");
      expect(output).toContain("required: true");
      expect(output).toContain("disabled: true");
    });

    test("kebab-case attributes in template", () => {
      const output = transformJSX('const node = html`<div data-value="test" aria-label="label"></div>`;');
      expect(output).toContain('"data-value": "test"');
      expect(output).toContain('"aria-label": "label"');
    });

    test("component with static attribute in template", () => {
      // Test that component attributes are processed correctly in html`` templates
      const output = transformJSX('const node = html`<Button id="test">text</Button>`;');
      expect(output).toContain("component(Button");
      expect(output).toContain('id: "test"');
    });

    test("processComponentAttributes with mixed content array", () => {
      // This tests line 90: componentNodeToBabel(t, value, expressions) when value is an array
      // This happens when a component attribute has mixed content (text + slot markers)
      const props = {
        id: "test",
        class: ["prefix-", { __slot: 0 }, "-suffix"] as unknown
      };
      const expressions = [types.identifier("dynamicValue")];

      // Mixed-content array (text + slot markers) builds a binary `+` concat.
      // isComponent=false exercises the new element path (maybeReactive is a no-op
      // here: dynamicValue is an identifier, not a call).
      const result = processComponentAttributes(types, props, expressions, false);
      // The mixed content should be processed
      expect(result.props).toHaveLength(2); // id and class
      expect(result.props[0]?.key?.name).toBe("id");
      expect(result.props[1]?.key?.name).toBe("class");
    });
  });
});
