import { describe, test, expect } from "bun:test";
import { parseHTML, parseHTMLComponent } from "../src/parsers/html.mjs";
import { parseAttributes } from "../src/parsers/attributes.mjs";
import { parseTextContent } from "../src/parsers/text.mjs";

describe("babel", () => {
  describe("parseHTML", () => {
    test("single element", () => {
      const result = parseHTML('<div class="container"></div>', []);
      expect(result).toEqual([
        {
          tag: "div",
          props: { class: "container" },
          children: []
        }
      ]);
    });

    test("nested elements", () => {
      const result = parseHTML('<div><span>text</span></div>', []);
      expect(result).toEqual([
        {
          tag: "div",
          props: {},
          children: [
            {
              tag: "span",
              props: {},
              children: ["text"]
            }
          ]
        }
      ]);
    });

    test("self-closing element", () => {
      const result = parseHTML('<input type="text" />', []);
      expect(result).toEqual([
        {
          tag: "input",
          props: { type: "text" },
          children: []
        }
      ]);
    });

    test("self-closing with space before slash", () => {
      const result = parseHTML('<br />', []);
      expect(result).toEqual([
        {
          tag: "br",
          props: {},
          children: []
        }
      ]);
    });

    test("multiple root elements", () => {
      const result = parseHTML('<div>first</div><span>second</span>', []);
      expect(result).toEqual([
        {
          tag: "div",
          props: {},
          children: ["first"]
        },
        {
          tag: "span",
          props: {},
          children: ["second"]
        }
      ]);
    });

    test("text content", () => {
      const result = parseHTML('<div>Hello World</div>', []);
      expect(result).toEqual([
        {
          tag: "div",
          props: {},
          children: ["Hello World"]
        }
      ]);
    });

    test("whitespace handling", () => {
      const result = parseHTML('<div>  spaced  </div>', []);
      expect(result).toEqual([
        {
          tag: "div",
          props: {},
          children: ["spaced"]
        }
      ]);
    });

    test("empty attributes", () => {
      const result = parseHTML('<input required disabled></input>', []);
      expect(result).toEqual([
        {
          tag: "input",
          props: { required: true, disabled: true },
          children: []
        }
      ]);
    });

    test("self-closing element inside parent", () => {
      const result = parseHTML('<div><br /></div>', []);
      const parent = result[0];
      expect(typeof parent === "object" && parent?.tag).toBe('div');
      expect(typeof parent === "object" && parent?.children?.[0]?.tag).toBe('br');
    });

    test("fragment syntax", () => {
      const result = parseHTML('<><span>a</span><span>b</span></>', []);
      expect(result).toEqual([
        {
          tag: "$",
          props: {},
          children: [
            {
              tag: "span",
              props: {},
              children: ["a"]
            },
            {
              tag: "span",
              props: {},
              children: ["b"]
            }
          ]
        }
      ]);
    });

    test("single slot marker", () => {
      const result = parseHTML("__SLOT_0__", ["expression"]);
      expect(result).toEqual([
        { __slot: 0 }
      ]);
    });

    test("deeply nested elements", () => {
      const result = parseHTML('<div><nav><ul><li>item</li></ul></nav></div>', []);
      expect(result).toEqual([
        {
          tag: "div",
          props: {},
          children: [
            {
              tag: "nav",
              props: {},
              children: [
                {
                  tag: "ul",
                  props: {},
                  children: [
                    {
                      tag: "li",
                      props: {},
                      children: ["item"]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]);
    });

    test("root-level text content", () => {
      const result = parseHTML('root text', []);
      expect(result[0]).toBe('root text');
    });
  });

  describe("parseHTMLComponent", () => {
    test("single element", () => {
      const quasis = [{ value: { raw: '<div class="test"></div>' } }];
      const result = parseHTMLComponent(quasis, []);
      expect(result).toEqual({
        tag: "div",
        props: { class: "test" },
        children: []
      });
    });

    test("with expression", () => {
      const quasis = [
        { value: { raw: '<div>' } },
        { value: { raw: '</div>' } }
      ];
      const expressions = ["text"];
      const result = parseHTMLComponent(quasis, expressions);
      expect(result).toEqual({
        tag: "div",
        props: {},
        children: [{ __slot: 0 }]
      });
    });

    test("multiple root returns fragment", () => {
      const quasis = [{ value: { raw: '<div>a</div><span>b</span>' } }];
      const result = parseHTMLComponent(quasis, []);
      expect(result).toEqual({
        tag: "$",
        children: [
          {
            tag: "div",
            props: {},
            children: ["a"]
          },
          {
            tag: "span",
            props: {},
            children: ["b"]
          }
        ]
      });
    });

    test("expression in attribute", () => {
      const quasis = [
        { value: { raw: '<div class="' } },
        { value: { raw: '"></div>' } }
      ];
      const expressions = ["dynamicClass"];
      const result = parseHTMLComponent(quasis, expressions);
      expect(result).toEqual({
        tag: "div",
        props: { class: { __slot: 0 } },
        children: []
      });
    });
  });

  describe("parseAttributes", () => {
    test("empty string", () => {
      const result = parseAttributes("", []);
      expect(result).toEqual({});
    });

    test("null/undefined", () => {
      expect(parseAttributes(null, [])).toEqual({});
      expect(parseAttributes(undefined, [])).toEqual({});
    });

    test("static attributes", () => {
      const result = parseAttributes('id="test" class="container"', []);
      expect(result).toEqual({
        id: "test",
        class: "container"
      });
    });

    test("on: prefix for events", () => {
      const result = parseAttributes('on:click="handler"', []);
      expect(result).toEqual({
        "on:click": "handler"
      });
    });

    test("bind: prefix for bindings", () => {
      const result = parseAttributes('bind:value="signal"', []);
      expect(result).toEqual({
        "bind:value": "signal"
      });
    });

    test("hook: prefix for lifecycle", () => {
      const result = parseAttributes('hook:mount="callback"', []);
      expect(result).toEqual({
        "hook:mount": "callback"
      });
    });

    test("mixed prefixes", () => {
      const result = parseAttributes('id="test" on:click="h" bind:value="s" hook:mount="c"', []);
      expect(result).toEqual({
        id: "test",
        "on:click": "h",
        "bind:value": "s",
        "hook:mount": "c"
      });
    });

    test("slot marker in attribute", () => {
      const result = parseAttributes('class=__SLOT_0__', ["expr"]);
      expect(result).toEqual({
        class: { __slot: 0 }
      });
    });

    test("slot marker in quoted value", () => {
      const result = parseAttributes('class="__SLOT_0__"', ["expr"]);
      expect(result).toEqual({
        class: { __slot: 0 }
      });
    });

    test("boolean attributes", () => {
      const result = parseAttributes('required disabled', []);
      expect(result).toEqual({
        required: true,
        disabled: true
      });
    });

    test("hyphenated attributes", () => {
      const result = parseAttributes('data-value="test" aria-label="label"', []);
      expect(result).toEqual({
        "data-value": "test",
        "aria-label": "label"
      });
    });

    test("mixed content in attribute", () => {
      const quasis = [
        { value: { raw: 'class="prefix-' } },
        { value: { raw: '-suffix"' } }
      ];
      const expressions = ["middle"];
      const htmlString = quasis[0]!.value.raw + '__SLOT_0__' + quasis[1]!.value.raw;
      const result = parseAttributes(htmlString, expressions);
      expect(result.class).toEqual(["prefix-", { __slot: 0 }, "-suffix"]);
    });
  });

  describe("parseTextContent", () => {
    test("plain text", () => {
      const result = parseTextContent("Hello World");
      expect(result).toEqual(["Hello World"]);
    });

    test("empty string", () => {
      const result = parseTextContent("");
      expect(result).toEqual([]);
    });

    test("null/undefined", () => {
      expect(parseTextContent(null)).toEqual([]);
      expect(parseTextContent(undefined)).toEqual([]);
    });

    test("single slot marker", () => {
      const result = parseTextContent("__SLOT_0__");
      expect(result).toEqual([{ __slot: 0 }]);
    });

    test("text before slot", () => {
      const result = parseTextContent("Hello __SLOT_0__");
      expect(result).toEqual(["Hello ", { __slot: 0 }]);
    });

    test("text after slot", () => {
      const result = parseTextContent("__SLOT_0__ World");
      expect(result).toEqual([{ __slot: 0 }, " World"]);
    });

    test("text between slots", () => {
      const result = parseTextContent("__SLOT_0__ and __SLOT_1__");
      expect(result).toEqual([
        { __slot: 0 },
        " and ",
        { __slot: 1 }
      ]);
    });

    test("multiple consecutive slots", () => {
      const result = parseTextContent("__SLOT_0____SLOT_1__");
      expect(result).toEqual([
        { __slot: 0 },
        { __slot: 1 }
      ]);
    });

    test("complex mixed content", () => {
      const result = parseTextContent("Start __SLOT_0__ middle __SLOT_1__ end");
      expect(result).toEqual([
        "Start ",
        { __slot: 0 },
        " middle ",
        { __slot: 1 },
        " end"
      ]);
    });

    test("whitespace handling", () => {
      const result = parseTextContent("  spaced  out  ");
      expect(result).toEqual(["  spaced  out  "]);
    });

    test("slot numbers are parsed correctly", () => {
      const result = parseTextContent("__SLOT_42__");
      expect(result).toEqual([{ __slot: 42 }]);
    });
  });
});
