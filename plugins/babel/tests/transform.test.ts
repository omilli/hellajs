import { describe, test, expect } from "bun:test";
import babel from "@babel/core";
import babelHellaJS from "../index.mjs";

// Helper to transform JSX and get the result
function transformJSX(code: string): string {
  const result = babel.transformSync(code, {
    plugins: [[babelHellaJS]],
    configFile: false
  });
  return result?.code || "";
}

// Helper to normalize whitespace for comparison
function normalize(output: string): string {
  return output.replace(/\s+/g, ' ').trim();
}

// Helper to get named imports from a specific source
function getNamedImports(code: string, source: string): string[] {
  const output = transformJSX(code);
  const imports: string[] = [];
  const importRegex = new RegExp(`import\\s*{([^}]+)}\\s*from\\s*['"]${source}['"]`, 'g');
  const match = importRegex.exec(output);
  if (match) {
    const names = match[1]!.split(',').map(s => s.trim());
    imports.push(...names);
  }
  return imports;
}

describe("transformers/jsx", () => {
  describe("JSXElement transformation", () => {
    test("simple element", () => {
      const output = transformJSX('<div />');
      expect(normalize(output)).toBe('({ tag: "div" });');
    });

    test("element with attributes", () => {
      const output = transformJSX('<div id="test" class="container" />');
      expect(normalize(output)).toBe('({ tag: "div", props: { id: "test", class: "container" } });');
    });

    test("element with children", () => {
      const output = transformJSX('<div>Hello World</div>');
      expect(normalize(output)).toBe('({ tag: "div", children: ["Hello World"] });');
    });

    test("nested elements", () => {
      const output = transformJSX('<div><span>nested</span></div>');
      expect(normalize(output)).toBe('({ tag: "div", children: [{ tag: "span", children: ["nested"] }] });');
    });

    test("empty elements are self-closing", () => {
      const output = transformJSX('<div></div>');
      expect(normalize(output)).toBe('({ tag: "div" });');
    });

    test("multiple root elements", () => {
      const output = transformJSX('<><div>first</div><div>second</div></>');
      expect(normalize(output)).toBe('({ tag: "$", children: [{ tag: "div", children: ["first"] }, { tag: "div", children: ["second"] }] });');
    });
  });

  describe("JSXFragment transformation", () => {
    test("simple fragment", () => {
      const output = transformJSX('<>fragment</>');
      expect(normalize(output)).toBe('({ tag: "$", children: ["fragment"] });');
    });

    test("fragment with multiple children", () => {
      const output = transformJSX('<>a<span>b</span>c</>');
      expect(normalize(output)).toBe('({ tag: "$", children: ["a", { tag: "span", children: ["b"] }, "c"] });');
    });

    test("nested fragments", () => {
      const output = transformJSX('<>outer<><>inner</></></>');
      expect(normalize(output)).toBe('({ tag: "$", children: ["outer", { tag: "$", children: [{ tag: "$", children: ["inner"] }] }] });');
    });
  });

  describe("Component detection", () => {
    test("uppercase first letter is component", () => {
      const output = transformJSX('<Button />');
      expect(normalize(output)).toBe('import { component } from "@hellajs/dom"; component(Button, {});');
    });

    test("lowercase is element", () => {
      const output = transformJSX('<div />');
      expect(normalize(output)).toBe('({ tag: "div" });');
    });

    test("member expression is component", () => {
      const output = transformJSX('<UI.Button />');
      expect(normalize(output)).toBe('import { component } from "@hellajs/dom"; component(UI.Button, {});');
    });

    test("component with children", () => {
      const output = transformJSX('<Button>Click me</Button>');
      expect(normalize(output)).toBe('import { component } from "@hellajs/dom"; component(Button, { children: ["Click me"] });');
    });

    test("component with props", () => {
      const output = transformJSX('<Button id="test" />');
      expect(normalize(output)).toBe('import { component } from "@hellajs/dom"; component(Button, { id: "test" });');
    });
  });

  describe("Passthrough components", () => {
    test("ForEach is passthrough", () => {
      const output = transformJSX('<ForEach each={items} use={item => item} />');
      expect(normalize(output)).toBe('import { ForEach } from "@hellajs/dom"; ForEach({ each: items, use: item => item });');
    });

    test("Portal is passthrough", () => {
      const output = transformJSX('<Portal target={target}>content</Portal>');
      expect(normalize(output)).toBe('import { Portal } from "@hellajs/dom"; Portal({ target: target, children: ["content"] });');
    });

    test("Lazy is passthrough", () => {
      const output = transformJSX('<Lazy component={Comp} />');
      expect(normalize(output)).toBe('import { Lazy } from "@hellajs/dom"; Lazy({ component: Comp });');
    });
  });

  describe("Style tag transformation", () => {
    test("<style> transforms to css()", () => {
      const output = transformJSX('<style>{{ color: "red" }}</style>');
      expect(normalize(output)).toBe('import { css } from "@hellajs/css"; css({ color: "red" });');
    });

    test("<style> with options", () => {
      const output = transformJSX('<style scoped>{{ color: "red" }}</style>');
      expect(normalize(output)).toBe('import { css } from "@hellajs/css"; css({ color: "red" });');
    });

    test("<style> with string option", () => {
      const output = transformJSX('<style id="my-style">{{ color: "red" }}</style>');
      expect(normalize(output)).toBe('import { css } from "@hellajs/css"; css({ color: "red" }, { id: "my-style" });');
    });

    test("<style> boolean option", () => {
      const output = transformJSX('<style global="true">{{ color: "red" }}</style>');
      expect(normalize(output)).toBe('import { css } from "@hellajs/css"; css({ color: "red" }, { global: true });');
    });
  });
});

describe("transformers/component", () => {
  describe("html`` template transformation", () => {
    test("simple element", () => {
      const output = transformJSX('const node = html`<div>content</div>`;');
      expect(normalize(output)).toBe('const node = { tag: "div", children: ["content"] };');
    });

    test("with expression", () => {
      const output = transformJSX('const node = html`<div>${expr}</div>`;');
      expect(normalize(output)).toBe('const node = { tag: "div", children: [expr] };');
    });

    test("multiple expressions", () => {
      const output = transformJSX('const node = html`<div>${a}${b}</div>`;');
      expect(normalize(output)).toBe('const node = { tag: "div", children: [a, b] };');
    });

    test("nested elements", () => {
      const output = transformJSX('const node = html`<div><span>nested</span></div>`;');
      expect(normalize(output)).toBe('const node = { tag: "div", children: [{ tag: "span", children: ["nested"] }] };');
    });

    test("fragment in template", () => {
      const output = transformJSX('const node = html`<><span>a</span><span>b</span></>`;');
      expect(normalize(output)).toBe('const node = { tag: "$", children: [{ tag: "span", children: ["a"] }, { tag: "span", children: ["b"] }] };');
    });

    test("self-closing element", () => {
      const output = transformJSX('const node = html`<input type="text" />`;');
      expect(normalize(output)).toBe('const node = { tag: "input", props: { type: "text" } };');
    });

    test("component in template", () => {
      const output = transformJSX('const node = html`<Button>text</Button>`;');
      expect(normalize(output)).toBe('import { component } from "@hellajs/dom"; const node = component(Button, { children: ["text"] });');
    });

    test("dynamic component", () => {
      const output = transformJSX('const node = html`<${Comp}>text</${Comp}>`;');
      expect(normalize(output)).toBe('import { component } from "@hellajs/dom"; const node = component(Comp, { children: ["text"] });');
    });

    test("passthrough in template", () => {
      const output = transformJSX('const node = html`<div></div>`;');
      expect(normalize(output)).toBe('const node = { tag: "div" };');
    });
  });
});

describe("Import injection", () => {
  describe("component import", () => {
    test("uppercase component injects component import", () => {
      const imports = getNamedImports('<Button />', '@hellajs/dom');
      expect(imports).toContain('component');
    });

    test("member expression component injects component import", () => {
      const imports = getNamedImports('<UI.Button />', '@hellajs/dom');
      expect(imports).toContain('component');
    });

    test("lowercase element does not inject component import", () => {
      const output = transformJSX('<div />');
      expect(output).not.toContain('import { component }');
    });
  });

  describe("css import", () => {
    test("style tag injects css import", () => {
      const imports = getNamedImports('<style>{{ color: "red" }}</style>', '@hellajs/css');
      expect(imports).toContain('css');
    });

    test("style tag with options injects css import", () => {
      const imports = getNamedImports('<style scoped>{{ color: "red" }}</style>', '@hellajs/css');
      expect(imports).toContain('css');
    });
  });

  describe("ForEach import", () => {
    test("ForEach JSX injects ForEach import", () => {
      const imports = getNamedImports('<ForEach each={items} use={item => item} />', '@hellajs/dom');
      expect(imports).toContain('ForEach');
    });

    test("ForEach in html`` - parsing limitation", () => {
      const output = transformJSX('const node = html`<div class="test"></div>`;');
      expect(output).toContain('tag: "div"');
    });
  });

  describe("Portal import", () => {
    test("Portal JSX injects Portal import", () => {
      const imports = getNamedImports('<Portal target={target}>content</Portal>', '@hellajs/dom');
      expect(imports).toContain('Portal');
    });

    test("Portal in html`` - parsing limitation", () => {
      const output = transformJSX('const node = html`<div class="test"></div>`;');
      expect(output).toContain('tag: "div"');
    });
  });

  describe("Lazy import", () => {
    test("Lazy JSX injects Lazy import", () => {
      const imports = getNamedImports('<Lazy component={Comp} />', '@hellajs/dom');
      expect(imports).toContain('Lazy');
    });
  });

  describe("duplicate import prevention", () => {
    test("existing component import is not duplicated", () => {
      const code = `
        import { component } from '@hellajs/dom';
        <Button />
      `;
      const output = transformJSX(code);
      const matches = output.match(/import\s*{\s*component\s*}/g);
      expect(matches?.length).toBe(1);
    });

    test("existing css import is not duplicated", () => {
      const code = `
        import { css } from '@hellajs/css';
        <style>{{ color: "red" }}</style>
      `;
      const output = transformJSX(code);
      const matches = output.match(/import\s*{\s*css\s*}/g);
      expect(matches?.length).toBe(1);
    });
  });
});

describe("Complex transformations", () => {
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
    expect(output).toContain('expr');
    expect(output).toContain('tag: "span"');
  });

  test("passthrough with component children", () => {
    const output = transformJSX(`
      <ForEach each={items} use={item => <Item data={item} />} />
    `);
    expect(normalize(output)).toBe('import { ForEach, component } from "@hellajs/dom"; ForEach({ each: items, use: item => component(Item, { data: item }) });');
  });

  test("fragment with components", () => {
    const output = transformJSX('<><Button /><span /></>');
    expect(normalize(output)).toBe('import { component } from "@hellajs/dom"; ({ tag: "$", children: [component(Button, {}), { tag: "span" }] });');
  });

  test("attribute with expression", () => {
    const output = transformJSX('<div class={dynamicClass} />');
    expect(normalize(output)).toBe('({ tag: "div", props: { class: dynamicClass } });');
  });

  test("event handler arrow function", () => {
    const output = transformJSX('<button on:click={() => console.log("clicked")}>Click</button>');
    expect(normalize(output)).toBe('({ tag: "button", on: { click: () => console.log("clicked") }, children: ["Click"] });');
  });

  test("bind with signal", () => {
    const output = transformJSX('<input bind:value={count} />');
    expect(normalize(output)).toBe('({ tag: "input", bind: { value: count } });');
  });

  test("hook lifecycle", () => {
    const output = transformJSX('<div hook:mount={() => mounted = true} />');
    expect(normalize(output)).toBe('({ tag: "div", hooks: { mount: () => mounted = true } });');
  });
});

describe("e: prefix (direct non-delegated events)", () => {
  test("transforms e:click to e property", () => {
    const output = transformJSX('<button e:click={handler}>Click</button>');
    expect(normalize(output)).toBe('({ tag: "button", e: { click: handler }, children: ["Click"] });');
  });

  test("e: with arrow function", () => {
    const output = transformJSX('<button e:click={() => console.log("clicked")}>Click</button>');
    expect(normalize(output)).toBe('({ tag: "button", e: { click: () => console.log("clicked") }, children: ["Click"] });');
  });

  test("e: and on: can coexist", () => {
    const output = transformJSX('<div e:click={direct} on:click={delegated} />');
    expect(normalize(output)).toBe('({ tag: "div", on: { click: delegated }, e: { click: direct } });');
  });

  test("multiple e: handlers", () => {
    const output = transformJSX('<input e:click={onClick} e:input={onInput} />');
    expect(normalize(output)).toBe('({ tag: "input", e: { click: onClick, input: onInput } });');
  });

  test("e: with other attributes", () => {
    const output = transformJSX('<button id="btn" class="primary" e:click={handler}>Click</button>');
    expect(normalize(output)).toBe('({ tag: "button", props: { id: "btn", class: "primary" }, e: { click: handler }, children: ["Click"] });');
  });

  test("html template parsing with e: prefix", () => {
    const output = transformJSX('const node = html`<button e:click=${fn}>Click</button>`;');
    expect(normalize(output)).toBe('const node = { tag: "button", e: { click: fn }, children: ["Click"] };');
  });

  test("html template with e: and on: on same element", () => {
    const output = transformJSX('const node = html`<button e:click=${direct} on:click=${delegated}>Click</button>`;');
    expect(normalize(output)).toBe('const node = { tag: "button", on: { click: delegated }, e: { click: direct }, children: ["Click"] };');
  });

  test("html template with multiple e: handlers", () => {
    const output = transformJSX('const node = html`<input e:click=${fn} e:input=${handler} />`;');
    expect(normalize(output)).toBe('const node = { tag: "input", e: { click: fn, input: handler } };');
  });
});
