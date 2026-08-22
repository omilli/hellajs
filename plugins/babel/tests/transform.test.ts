import { describe, test, expect } from "bun:test";
import { transformJSX, normalize, getNamedImports } from "./helpers";

describe("babel", () => {
  describe("JSX transformation", () => {
    test("simple element", () => {
      const output = transformJSX("<div />");
      expect(normalize(output)).toBe('const _hellaStatic = { tag: "div", static: true }; _hellaStatic;');
    });

    test("element with attributes", () => {
      const output = transformJSX('<div id="test" class="container" />');
      expect(normalize(output)).toBe('const _hellaStatic = { tag: "div", props: { id: "test", class: "container" }, static: true }; _hellaStatic;');
    });

    test("element with children", () => {
      const output = transformJSX("<div>Hello World</div>");
      expect(normalize(output)).toBe('const _hellaStatic = { tag: "div", children: ["Hello World"], static: true }; _hellaStatic;');
    });

    test("nested elements hoist as one maximal static subtree", () => {
      const output = transformJSX("<div><span>nested</span></div>");
      expect(normalize(output)).toBe('const _hellaStatic = { tag: "div", children: [{ tag: "span", children: ["nested"], static: true }], static: true }; _hellaStatic;');
    });

    test("empty elements are self-closing", () => {
      const output = transformJSX("<div></div>");
      expect(normalize(output)).toBe('const _hellaStatic = { tag: "div", static: true }; _hellaStatic;');
    });

    test("multiple root elements", () => {
      const output = transformJSX("<><div>first</div><div>second</div></>");
      expect(normalize(output)).toBe('const _hellaStatic = { tag: "$", children: [{ tag: "div", children: ["first"], static: true }, { tag: "div", children: ["second"], static: true }], static: true }; _hellaStatic;');
    });
  });

  describe("JSXFragment transformation", () => {
    test("simple fragment", () => {
      const output = transformJSX("<>fragment</>");
      expect(normalize(output)).toBe('const _hellaStatic = { tag: "$", children: ["fragment"], static: true }; _hellaStatic;');
    });

    test("fragment with multiple children", () => {
      const output = transformJSX("<>a<span>b</span>c</>");
      expect(normalize(output)).toBe('const _hellaStatic = { tag: "$", children: ["a", { tag: "span", children: ["b"], static: true }, "c"], static: true }; _hellaStatic;');
    });

    test("nested fragments", () => {
      const output = transformJSX("<>outer<><>inner</></></>");
      expect(normalize(output)).toBe('const _hellaStatic = { tag: "$", children: ["outer", { tag: "$", children: [{ tag: "$", children: ["inner"], static: true }], static: true }], static: true }; _hellaStatic;');
    });
  });

  describe("Component detection", () => {
    test("uppercase first letter is component", () => {
      const output = transformJSX("<Button />");
      expect(normalize(output)).toBe('import { component } from "@hellajs/dom"; component(Button, {});');
    });

    test("lowercase is element", () => {
      const output = transformJSX("<div />");
      expect(normalize(output)).toBe('const _hellaStatic = { tag: "div", static: true }; _hellaStatic;');
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
      expect(normalize(output)).toBe('const _hellaStatic = { tag: "style", children: ["hello"], static: true }; _hellaStatic;');
    });

    test("<style> does not inject css import", () => {
      const imports = getNamedImports('<style>{{ color: "red" }}</style>', "@hellajs/css");
      expect(imports).not.toContain("css");
    });
  });

  describe("html template transformation", () => {
    test("simple element", () => {
      const output = transformJSX("const node = html`<div>content</div>`;");
      expect(normalize(output)).toBe('const _hellaStatic = { tag: "div", children: ["content"], static: true }; const node = _hellaStatic;');
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
      expect(normalize(output)).toBe('const _hellaStatic = { tag: "div", children: [{ tag: "span", children: ["nested"] }], static: true }; const node = _hellaStatic;');
    });

    test("fragment in template", () => {
      const output = transformJSX("const node = html`<><span>a</span><span>b</span></>`;");
      expect(normalize(output)).toBe('const _hellaStatic = { tag: "$", children: [{ tag: "span", children: ["a"] }, { tag: "span", children: ["b"] }], static: true }; const node = _hellaStatic;');
    });

    test("self-closing element", () => {
      const output = transformJSX('const node = html`<input type="text" />`;');
      expect(normalize(output)).toBe('const _hellaStatic = { tag: "input", props: { type: "text" }, static: true }; const node = _hellaStatic;');
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
      expect(normalize(output)).toBe('const _hellaStatic = { tag: "div", static: true }; const node = _hellaStatic;');
    });

    test("html template with single-quoted attribute", () => {
      const output = transformJSX("const node = html`<div class='container'></div>`;");
      expect(normalize(output)).toBe('const _hellaStatic = { tag: "div", props: { class: "container" }, static: true }; const node = _hellaStatic;');
    });

    test("html template with unquoted attribute", () => {
      const output = transformJSX("const node = html`<div class=container></div>`;");
      expect(normalize(output)).toBe('const _hellaStatic = { tag: "div", props: { class: "container" }, static: true }; const node = _hellaStatic;');
    });

    test("html template with mixed quotes on attributes", () => {
      const output = transformJSX("const node = html`<div id=\"main\" class='content'></div>`;");
      expect(normalize(output)).toBe('const _hellaStatic = { tag: "div", props: { id: "main", class: "content" }, static: true }; const node = _hellaStatic;');
    });

    test("html template with HTML comment is stripped", () => {
      const output = transformJSX("const node = html`<div><!-- comment --><span>visible</span></div>`;");
      expect(normalize(output)).toBe('const _hellaStatic = { tag: "div", children: [{ tag: "span", children: ["visible"] }], static: true }; const node = _hellaStatic;');
    });

    test("html template with DOCTYPE is stripped", () => {
      const output = transformJSX("const node = html`<!DOCTYPE html><div>content</div>`;");
      expect(normalize(output)).toBe('const _hellaStatic = { tag: "div", children: ["content"], static: true }; const node = _hellaStatic;');
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
      expect(normalize(output)).toBe('const _hellaStatic = { tag: "span", children: ["text"], static: true }; import { component } from "@hellajs/dom"; ({ tag: "div", children: [component(Button, { children: ["Click"] }), _hellaStatic] });');
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
      expect(normalize(output)).toBe('const _hellaStatic = { tag: "span", static: true }; import { component } from "@hellajs/dom"; ({ tag: "$", children: [component(Button, {}), _hellaStatic] });');
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

  describe("static hoisting", () => {
    test("fully-static element hoists to a module const declared before use", () => {
      const output = transformJSX("mount(<div id=\"x\">hi</div>);");
      const normalized = normalize(output);
      expect(normalized).toContain('const _hellaStatic = { tag: "div", props: { id: "x" }, children: ["hi"], static: true }');
      expect(normalized).toContain("mount(_hellaStatic)");
      expect(normalized.indexOf("const _hellaStatic")).toBeLessThan(normalized.indexOf("mount("));
    });

    test("on: attribute disables hoisting", () => {
      const output = transformJSX("<button on:click={fn}>go</button>");
      expect(normalize(output)).toBe('({ tag: "button", on: { click: fn }, children: ["go"] });');
    });

    test("e: attribute disables hoisting", () => {
      const output = transformJSX("<button e:click={fn}>go</button>");
      expect(normalize(output)).toBe('({ tag: "button", e: { click: fn }, children: ["go"] });');
    });

    test("hook: attribute disables hoisting", () => {
      const output = transformJSX("<div hook:afterMount={fn} />" );
      expect(normalize(output)).toBe('({ tag: "div", hooks: { afterMount: fn } });');
    });

    test("error: attribute disables hoisting", () => {
      const output = transformJSX("<div error:fallback={fn} />");
      expect(normalize(output)).toBe('({ tag: "div", error: { fallback: fn } });');
    });

    test("spread attribute disables hoisting", () => {
      const output = transformJSX("<div {...spread} />" );
      expect(normalize(output)).toBe('({ tag: "div", props: { ...spread } });');
    });

    test("dynamic child disables hoisting for the parent but a static sibling still hoists", () => {
      const output = transformJSX("<div class={dyn()}><span>static</span><b>{expr}</b></div>");
      const normalized = normalize(output);
      expect(normalized).toContain('const _hellaStatic = { tag: "span", children: ["static"], static: true }');
      expect(normalized).toContain('({ tag: "div", props: { class: () => dyn() }, children: [_hellaStatic, { tag: "b", children: [expr] }] });');
    });

    test("component child disables hoisting and still injects the component import", () => {
      const output = transformJSX("<div><Button /></div>");
      const normalized = normalize(output);
      expect(normalized).toContain('import { component } from "@hellajs/dom"');
      expect(normalized).toContain('({ tag: "div", children: [component(Button, {})] });');
    });

    test("numeric and boolean prop literals hoist", () => {
      const output = transformJSX("<input tabIndex={3} disabled={true} />");
      expect(normalize(output)).toBe('const _hellaStatic = { tag: "input", props: { tabIndex: 3, disabled: true }, static: true }; _hellaStatic;');
    });

    test("html`` mixed template hoists the static child subtree", () => {
      const output = transformJSX("const node = html`<div class=${c()}><b>static</b></div>`;");
      const normalized = normalize(output);
      expect(normalized).toContain('const _hellaStatic = { tag: "b", children: ["static"], static: true }');
      expect(normalized).toContain('const node = { tag: "div", props: { class: () => c() }, children: [_hellaStatic] };');
    });

    test("html`` template with a slot does not hoist the root", () => {
      const output = transformJSX("const node = html`<div>${expr}</div>`;");
      expect(normalize(output)).toBe('const node = { tag: "div", children: [expr] };');
    });

    test("two static sites hoist to distinct consts", () => {
      const output = transformJSX("const a = <div>a</div>; const b = <span>b</span>;");
      const normalized = normalize(output);
      expect(normalized).toContain('const _hellaStatic = { tag: "div", children: ["a"], static: true }');
      expect(normalized).toContain('_hellaStatic2 = { tag: "span", children: ["b"], static: true }');
      expect(normalized).toContain("const a = _hellaStatic;");
      expect(normalized).toContain("const b = _hellaStatic2;");
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
      expect(normalize(output)).toBe('const _hellaStatic = { tag: "li", static: true }; ({ tag: "div", children: [() => arr.map(x => _hellaStatic)] });');
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
      expect(normalize(transformJSX('<div class="static" />'))).toBe('const _hellaStatic = { tag: "div", props: { class: "static" }, static: true }; _hellaStatic;');
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
