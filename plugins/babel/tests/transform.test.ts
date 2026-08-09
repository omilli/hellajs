import { describe, test, expect } from "bun:test";
import { transformJSX, normalize, getNamedImports } from "./helpers";

describe("babel", () => {
  describe("JSX transformation", () => {
    test("simple element", () => {
      const output = transformJSX("<div />");
      expect(normalize(output)).toBe('({ tag: "div" });');
    });

    test("element with attributes", () => {
      const output = transformJSX('<div id="test" class="container" />');
      expect(normalize(output)).toBe('({ tag: "div", props: { id: "test", class: "container" } });');
    });

    test("element with children", () => {
      const output = transformJSX("<div>Hello World</div>");
      expect(normalize(output)).toBe('({ tag: "div", children: ["Hello World"] });');
    });

    test("nested elements", () => {
      const output = transformJSX("<div><span>nested</span></div>");
      expect(normalize(output)).toBe('({ tag: "div", children: [{ tag: "span", children: ["nested"] }] });');
    });

    test("empty elements are self-closing", () => {
      const output = transformJSX("<div></div>");
      expect(normalize(output)).toBe('({ tag: "div" });');
    });

    test("multiple root elements", () => {
      const output = transformJSX("<><div>first</div><div>second</div></>");
      expect(normalize(output)).toBe('({ tag: "$", children: [{ tag: "div", children: ["first"] }, { tag: "div", children: ["second"] }] });');
    });
  });

  describe("JSXFragment transformation", () => {
    test("simple fragment", () => {
      const output = transformJSX("<>fragment</>");
      expect(normalize(output)).toBe('({ tag: "$", children: ["fragment"] });');
    });

    test("fragment with multiple children", () => {
      const output = transformJSX("<>a<span>b</span>c</>");
      expect(normalize(output)).toBe('({ tag: "$", children: ["a", { tag: "span", children: ["b"] }, "c"] });');
    });

    test("nested fragments", () => {
      const output = transformJSX("<>outer<><>inner</></></>");
      expect(normalize(output)).toBe('({ tag: "$", children: ["outer", { tag: "$", children: [{ tag: "$", children: ["inner"] }] }] });');
    });
  });

  describe("Component detection", () => {
    test("uppercase first letter is component", () => {
      const output = transformJSX("<Button />");
      expect(normalize(output)).toBe('import { component } from "@hellajs/dom"; component(Button, {});');
    });

    test("lowercase is element", () => {
      const output = transformJSX("<div />");
      expect(normalize(output)).toBe('({ tag: "div" });');
    });

    test("member expression is component", () => {
      const output = transformJSX("<UI.Button />");
      expect(normalize(output)).toBe('import { component } from "@hellajs/dom"; component(UI.Button, {});');
    });

    test("component with children", () => {
      const output = transformJSX("<Button>Click me</Button>");
      expect(normalize(output)).toBe('import { component } from "@hellajs/dom"; component(Button, { children: ["Click me"] });');
    });

    test("component with props", () => {
      const output = transformJSX('<Button id="test" />');
      expect(normalize(output)).toBe('import { component } from "@hellajs/dom"; component(Button, { id: "test" });');
    });
  });

  describe("Passthrough components", () => {
    test("ForEach is passthrough", () => {
      const output = transformJSX("<ForEach each={items} use={item => item} />");
      expect(normalize(output)).toBe('import { ForEach } from "@hellajs/dom"; ForEach({ each: items, use: item => item });');
    });

    test("Portal is passthrough", () => {
      const output = transformJSX("<Portal target={target}>content</Portal>");
      expect(normalize(output)).toBe('import { Portal } from "@hellajs/dom"; Portal({ target: target, children: ["content"] });');
    });

    test("Lazy is passthrough", () => {
      const output = transformJSX("<Lazy component={Comp} />");
      expect(normalize(output)).toBe('import { Lazy } from "@hellajs/dom"; Lazy({ component: Comp });');
    });
  });

  describe("Style tag is a regular element", () => {
    test("<style> produces a regular HellaNode", () => {
      const output = transformJSX("<style>hello</style>");
      expect(normalize(output)).toBe('({ tag: "style", children: ["hello"] });');
    });

    test("<style> does not inject css import", () => {
      const imports = getNamedImports('<style>{{ color: "red" }}</style>', "@hellajs/css");
      expect(imports).not.toContain("css");
    });
  });

  describe("html template transformation", () => {
    test("simple element", () => {
      const output = transformJSX("const node = html`<div>content</div>`;");
      expect(normalize(output)).toBe('const node = { tag: "div", children: ["content"] };');
    });

    test("with expression", () => {
      const output = transformJSX("const node = html`<div>${expr}</div>`;");
      expect(normalize(output)).toBe('const node = { tag: "div", children: [expr] };');
    });

    test("multiple expressions", () => {
      const output = transformJSX("const node = html`<div>${a}${b}</div>`;");
      expect(normalize(output)).toBe('const node = { tag: "div", children: [a, b] };');
    });

    test("nested elements", () => {
      const output = transformJSX("const node = html`<div><span>nested</span></div>`;");
      expect(normalize(output)).toBe('const node = { tag: "div", children: [{ tag: "span", children: ["nested"] }] };');
    });

    test("fragment in template", () => {
      const output = transformJSX("const node = html`<><span>a</span><span>b</span></>`;");
      expect(normalize(output)).toBe('const node = { tag: "$", children: [{ tag: "span", children: ["a"] }, { tag: "span", children: ["b"] }] };');
    });

    test("self-closing element", () => {
      const output = transformJSX('const node = html`<input type="text" />`;');
      expect(normalize(output)).toBe('const node = { tag: "input", props: { type: "text" } };');
    });

    test("component in template", () => {
      const output = transformJSX("const node = html`<Button>text</Button>`;");
      expect(normalize(output)).toBe('import { component } from "@hellajs/dom"; const node = component(Button, { children: ["text"] });');
    });

    test("dynamic component", () => {
      const output = transformJSX("const node = html`<${Comp}>text</${Comp}>`;");
      expect(normalize(output)).toBe('import { component } from "@hellajs/dom"; const node = component(Comp, { children: ["text"] });');
    });

    test("plain element in template", () => {
      const output = transformJSX("const node = html`<div></div>`;");
      expect(normalize(output)).toBe('const node = { tag: "div" };');
    });

    test("html template with single-quoted attribute", () => {
      const output = transformJSX("const node = html`<div class='container'></div>`;");
      expect(normalize(output)).toBe('const node = { tag: "div", props: { class: "container" } };');
    });

    test("html template with unquoted attribute", () => {
      const output = transformJSX("const node = html`<div class=container></div>`;");
      expect(normalize(output)).toBe('const node = { tag: "div", props: { class: "container" } };');
    });

    test("html template with mixed quotes on attributes", () => {
      const output = transformJSX("const node = html`<div id=\"main\" class='content'></div>`;");
      expect(normalize(output)).toBe('const node = { tag: "div", props: { id: "main", class: "content" } };');
    });

    test("html template with HTML comment is stripped", () => {
      const output = transformJSX("const node = html`<div><!-- comment --><span>visible</span></div>`;");
      expect(normalize(output)).toBe('const node = { tag: "div", children: [{ tag: "span", children: ["visible"] }] };');
    });

    test("html template with DOCTYPE is stripped", () => {
      const output = transformJSX("const node = html`<!DOCTYPE html><div>content</div>`;");
      expect(normalize(output)).toBe('const node = { tag: "div", children: ["content"] };');
    });

    test("html template with multi-line content", () => {
      const output = transformJSX(`
        const node = html\`
          <div id="root">
            <span>nested</span>
          </div>
        \`;
      `);
      expect(normalize(output)).toContain('tag: "div"');
      expect(normalize(output)).toContain('props: { id: "root" }');
      expect(normalize(output)).toContain('tag: "span"');
    });
  });

  describe("import injection", () => {
    test("uppercase component injects component import", () => {
      const imports = getNamedImports("<Button />", "@hellajs/dom");
      expect(imports).toContain("component");
    });

    test("member expression component injects component import", () => {
      const imports = getNamedImports("<UI.Button />", "@hellajs/dom");
      expect(imports).toContain("component");
    });

    test("lowercase element does not inject component import", () => {
      const output = transformJSX("<div />");
      expect(output).not.toContain("import { component }");
    });

    test("ForEach JSX injects ForEach import", () => {
      const imports = getNamedImports("<ForEach each={items} use={item => item} />", "@hellajs/dom");
      expect(imports).toContain("ForEach");
    });

    test("Portal JSX injects Portal import", () => {
      const imports = getNamedImports("<Portal target={target}>content</Portal>", "@hellajs/dom");
      expect(imports).toContain("Portal");
    });

    test("Lazy JSX injects Lazy import", () => {
      const imports = getNamedImports("<Lazy component={Comp} />", "@hellajs/dom");
      expect(imports).toContain("Lazy");
    });

    test("existing component import is not duplicated", () => {
      const code = `
        import { component } from '@hellajs/dom';
        <Button />
      `;
      const output = transformJSX(code);
      const matches = output.match(/import\s*{\s*component\s*}/g);
      expect(matches?.length).toBe(1);
    });
  });

  describe("complex transformations", () => {
    test("nested components and elements", () => {
      const output = transformJSX(`
        <div>
          <Button>Click</Button>
          <span>text</span>
        </div>
      `);
      expect(normalize(output)).toBe('import { component } from "@hellajs/dom"; ({ tag: "div", children: [component(Button, { children: ["Click"] }), { tag: "span", children: ["text"] }] });');
    });

    test("mixed content in html``", () => {
      const output = transformJSX(`
        const node = html\`
          <div>
            text \${expr} <span>nested</span>
          </div>
        \`;
      `);
      expect(normalize(output)).toContain('tag: "div"');
      expect(output).toContain("expr");
      expect(output).toContain('tag: "span"');
    });

    test("passthrough with component children", () => {
      const output = transformJSX(`
        <ForEach each={items} use={item => <Item data={item} />} />
      `);
      expect(normalize(output)).toBe('import { ForEach, component } from "@hellajs/dom"; ForEach({ each: items, use: item => component(Item, { data: item }) });');
    });

    test("fragment with components", () => {
      const output = transformJSX("<><Button /><span /></>");
      expect(normalize(output)).toBe('import { component } from "@hellajs/dom"; ({ tag: "$", children: [component(Button, {}), { tag: "span" }] });');
    });

    test("attribute with expression", () => {
      const output = transformJSX("<div class={dynamicClass} />");
      expect(normalize(output)).toBe('({ tag: "div", props: { class: dynamicClass } });');
    });

    test("event handler arrow function", () => {
      const output = transformJSX('<button on:click={() => console.log("clicked")}>Click</button>');
      expect(normalize(output)).toBe('({ tag: "button", on: { click: () => console.log("clicked") }, children: ["Click"] });');
    });

    test("hook lifecycle", () => {
      const output = transformJSX("<div hook:mount={() => mounted = true} />");
      expect(normalize(output)).toBe('({ tag: "div", hooks: { mount: () => mounted = true } });');
    });
  });

  describe("e: prefix", () => {
    test("transforms e:click to e property", () => {
      const output = transformJSX("<button e:click={handler}>Click</button>");
      expect(normalize(output)).toBe('({ tag: "button", e: { click: handler }, children: ["Click"] });');
    });

    test("e: with arrow function", () => {
      const output = transformJSX('<button e:click={() => console.log("clicked")}>Click</button>');
      expect(normalize(output)).toBe('({ tag: "button", e: { click: () => console.log("clicked") }, children: ["Click"] });');
    });

    test("e: and on: can coexist", () => {
      const output = transformJSX("<div e:click={direct} on:click={delegated} />");
      expect(normalize(output)).toBe('({ tag: "div", on: { click: delegated }, e: { click: direct } });');
    });

    test("multiple e: handlers", () => {
      const output = transformJSX("<input e:click={onClick} e:input={onInput} />");
      expect(normalize(output)).toBe('({ tag: "input", e: { click: onClick, input: onInput } });');
    });

    test("e: with other attributes", () => {
      const output = transformJSX('<button id="btn" class="primary" e:click={handler}>Click</button>');
      expect(normalize(output)).toBe('({ tag: "button", props: { id: "btn", class: "primary" }, e: { click: handler }, children: ["Click"] });');
    });

    test("html template parsing with e: prefix", () => {
      const output = transformJSX("const node = html`<button e:click=${fn}>Click</button>`;");
      expect(normalize(output)).toBe('const node = { tag: "button", e: { click: fn }, children: ["Click"] };');
    });

    test("html template with e: and on: on same element", () => {
      const output = transformJSX("const node = html`<button e:click=${direct} on:click=${delegated}>Click</button>`;");
      expect(normalize(output)).toBe('const node = { tag: "button", on: { click: delegated }, e: { click: direct }, children: ["Click"] };');
    });

    test("html template with multiple e: handlers", () => {
      const output = transformJSX("const node = html`<input e:click=${fn} e:input=${handler} />`;");
      expect(normalize(output)).toBe('const node = { tag: "input", e: { click: fn, input: handler } };');
    });
  });

  describe("auto-wrap reactive expressions", () => {
    test("element child with a call is wrapped in an arrow thunk", () => {
      const output = transformJSX("<div>{fn()}</div>");
      expect(normalize(output)).toBe('({ tag: "div", children: [() => fn()] });');
    });

    test("element child bare identifier is not wrapped (static)", () => {
      const output = transformJSX("<div>{x}</div>");
      expect(normalize(output)).toBe('({ tag: "div", children: [x] });');
    });

    test("element child conditional with a call is wrapped", () => {
      const output = transformJSX("<div>{cond() ? a : b}</div>");
      expect(normalize(output)).toBe('({ tag: "div", children: [() => cond() ? a : b] });');
    });

    test("element child logical expression with a call is wrapped", () => {
      const output = transformJSX("<div>{show() && x}</div>");
      expect(normalize(output)).toBe('({ tag: "div", children: [() => show() && x] });');
    });

    test("element child member-call is wrapped", () => {
      const output = transformJSX("<div>{obj.method()}</div>");
      expect(normalize(output)).toBe('({ tag: "div", children: [() => obj.method()] });');
    });

    test("element child .map() returning elements is wrapped", () => {
      const output = transformJSX("<div>{arr.map(x => <li />)}</div>");
      expect(normalize(output)).toBe('({ tag: "div", children: [() => arr.map(x => ({ tag: "li" }))] });');
    });

    test("explicit arrow child is emitted verbatim (double-wrap guard)", () => {
      const output = transformJSX("<div>{() => fn()}</div>");
      expect(normalize(output)).toBe('({ tag: "div", children: [() => fn()] });');
    });

    test("regular prop with a call is wrapped", () => {
      const output = transformJSX("<input id={foo()} />");
      expect(normalize(output)).toBe('({ tag: "input", props: { id: () => foo() } });');
    });

    test("prop array with a call is wrapped", () => {
      const output = transformJSX('<div class={[signal(), "x"]} />');
      expect(normalize(output)).toBe('({ tag: "div", props: { class: () => [signal(), "x"] } });');
    });

    test("prop ternary with a call is wrapped", () => {
      const output = transformJSX('<div class={a ? active() : "x"} />');
      expect(normalize(output)).toBe('({ tag: "div", props: { class: () => a ? active() : "x" } });');
    });

    test("non-call props (static, bare identifier) pass through unwrapped", () => {
      expect(normalize(transformJSX('<div class="static" />'))).toBe('({ tag: "div", props: { class: "static" } });');
      expect(normalize(transformJSX("<div class={className} />"))).toBe('({ tag: "div", props: { class: className } });');
    });

    test("prefixed keys (on:/hook:) are not wrapped", () => {
      expect(normalize(transformJSX("<div on:click={handleClick()} />"))).toContain("click: handleClick()");
      expect(normalize(transformJSX("<div hook:mount={cb()} />"))).toContain("mount: cb()");
    });

    test("component prop is not wrapped (props may be a plain value)", () => {
      const output = transformJSX("<Btn class={foo()} />");
      expect(normalize(output)).toBe('import { component } from "@hellajs/dom"; component(Btn, { class: foo() });');
    });

    test("component child with a call is NOT wrapped (props.children is a value)", () => {
      const output = transformJSX("<Comp>{foo()}</Comp>");
      expect(normalize(output)).toBe('import { component } from "@hellajs/dom"; component(Comp, { children: [foo()] });');
    });

    test("html element child with a call is wrapped", () => {
      const output = transformJSX("const node = html`<div>${fn()}</div>`;");
      expect(normalize(output)).toBe('const node = { tag: "div", children: [() => fn()] };');
    });

    test("html element child bare identifier is not wrapped", () => {
      const output = transformJSX("const node = html`<div>${x}</div>`;");
      expect(normalize(output)).toBe('const node = { tag: "div", children: [x] };');
    });

    test("html mixed-content attribute with a call is wrapped", () => {
      const output = transformJSX("const node = html`<div class=\"a-${fn()}-b\">${y}</div>`;");
      expect(normalize(output)).toBe('const node = { tag: "div", props: { class: () => "a-" + fn() + "-b" }, children: [y] };');
    });

    test("html element array attribute with a call is wrapped", () => {
      const output = transformJSX("const node = html`<div class=\"${[signal(), 'x']}\">${y}</div>`;");
      expect(normalize(output)).toBe('const node = { tag: "div", props: { class: () => [signal(), \'x\'] }, children: [y] };');
    });

    test("html component prop is not wrapped", () => {
      const output = transformJSX("const node = html`<${Comp} class=\"${fn()}\"></${Comp}>`;");
      expect(normalize(output)).toBe('import { component } from "@hellajs/dom"; const node = component(Comp, { class: fn() });');
    });

    test("html component child is NOT wrapped", () => {
      const output = transformJSX("const node = html`<${Comp}>${foo()}</${Comp}>`;");
      expect(normalize(output)).toBe('import { component } from "@hellajs/dom"; const node = component(Comp, { children: [foo()] });');
    });
  });
});
