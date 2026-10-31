import { describe, test, expect } from "vite-plus/test";
import { transform } from "../index.mjs";
import type { TransformOptions } from "../index.d.ts";
import { transformJSX, normalize, getNamedImports } from "./helpers";

describe("compiler ast target", () => {
  test("hoists a fully-static element to a module const declared before use", () => {
    const output = transformJSX('mount(<div id="x">hi</div>);').code;
    const normalized = normalize(output);
    expect(normalized).toContain(
      'const _hellaStatic = { tag: "div", props: { id: "x" }, children: ["hi"], static: true }',
    );
    expect(normalized).toContain("mount(_hellaStatic)");
    expect(normalized.indexOf("const _hellaStatic")).toBeLessThan(normalized.indexOf("mount("));
  });

  test("joins static children into one string literal", () => {
    expect(normalize(transformJSX("<div>Hello   World</div>").code)).toBe(
      'const _hellaStatic = { tag: "div", children: ["Hello World"], static: true }; _hellaStatic;',
    );
  });

  test("hoists nested static subtrees as one maximal const", () => {
    expect(normalize(transformJSX("<div><span>nested</span></div>").code)).toBe(
      'const _hellaStatic = { tag: "div", children: [{ tag: "span", children: ["nested"], static: true }], static: true }; _hellaStatic;',
    );
  });

  test("hoists a fragment with static children", () => {
    expect(normalize(transformJSX("<>a<span>b</span>c</>").code)).toBe(
      'const _hellaStatic = { tag: "$", children: ["a", { tag: "span", children: ["b"], static: true }, "c"], static: true }; _hellaStatic;',
    );
  });

  test("hoists two static sites to distinct merged-declaration consts", () => {
    expect(normalize(transformJSX("const a = <div>a</div>; const b = <span>b</span>;").code)).toBe(
      'const _hellaStatic = { tag: "div", children: ["a"], static: true }, _hellaStatic2 = { tag: "span", children: ["b"], static: true }; const a = _hellaStatic; const b = _hellaStatic2;',
    );
  });

  test("emits field-omitted vnodes for dynamic elements", () => {
    expect(normalize(transformJSX("<div class={dyn()} />").code)).toBe(
      '({ tag: "div", props: { class: () => dyn() } });',
    );
  });

  test("kebab-cases camelCase data/aria props into quoted keys", () => {
    expect(normalize(transformJSX('<div dataTestId="123" ariaLabel="label" />').code)).toBe(
      'const _hellaStatic = { tag: "div", props: { "data-test-id": "123", "aria-label": "label" }, static: true }; _hellaStatic;',
    );
  });

  test("keeps namespaced attribute keys as quoted string keys", () => {
    expect(normalize(transformJSX('<div xml:lang="en" />').code)).toContain('"xml:lang": "en"');
  });

  test("renders boolean attrs as true and keeps explicit false", () => {
    expect(normalize(transformJSX("<input required disabled={false} />").code)).toBe(
      'const _hellaStatic = { tag: "input", props: { required: true, disabled: false }, static: true }; _hellaStatic;',
    );
  });

  test("emits delegated handlers without a feature import", () => {
    const output = transformJSX(
      '<button on:click={() => console.log("clicked")}>Click</button>',
    ).code;
    expect(normalize(output)).toBe(
      '({ tag: "button", on: { click: () => console.log("clicked") }, children: ["Click"] });',
    );
    expect(output).not.toContain("@hellajs/dom/features");
  });

  test("wraps call-containing children in arrow thunks and keeps bare identifiers static", () => {
    expect(normalize(transformJSX("<div>{fn()}</div>").code)).toBe(
      '({ tag: "div", children: [() => fn()] });',
    );
    expect(normalize(transformJSX("<div>{x}</div>").code)).toBe('({ tag: "div", children: [x] });');
  });

  test("wraps ternary children containing a call", () => {
    expect(normalize(transformJSX("<div>{cond() ? a : b}</div>").code)).toBe(
      '({ tag: "div", children: [() => cond() ? a : b] });',
    );
  });

  test("emits explicit arrow children verbatim (double-wrap guard)", () => {
    expect(normalize(transformJSX("<div>{() => fn(1)}</div>").code)).toBe(
      '({ tag: "div", children: [() => fn(1)] });',
    );
  });

  test("wraps call-containing prop values", () => {
    expect(normalize(transformJSX("<input id={foo()} />").code)).toBe(
      '({ tag: "input", props: { id: () => foo() } });',
    );
  });

  test("suppresses hoisting for on: but a static sibling still hoists", () => {
    expect(
      normalize(transformJSX("<div class={dyn()}><span>static</span><b>{expr}</b></div>").code),
    ).toBe(
      'const _hellaStatic = { tag: "span", children: ["static"], static: true }; ({ tag: "div", props: { class: () => dyn() }, children: [_hellaStatic, { tag: "b", children: [expr] }] });',
    );
    expect(normalize(transformJSX("<button on:click={fn}>go</button>").code)).toBe(
      '({ tag: "button", on: { click: fn }, children: ["go"] });',
    );
    expect(normalize(transformJSX("<div {...spread} />").code)).toBe(
      '({ tag: "div", props: { ...spread } });',
    );
  });

  test("detects components and injects the component import", () => {
    expect(normalize(transformJSX("<Button />").code)).toBe(
      'import {component} from "@hellajs/dom"; component(Button, {});',
    );
    expect(normalize(transformJSX("<UI.Button />").code)).toBe(
      'import {component} from "@hellajs/dom"; component(UI.Button, {});',
    );
    expect(normalize(transformJSX("<div><Button /></div>").code)).toBe(
      'import {component} from "@hellajs/dom"; ({ tag: "div", children: [component(Button, {})] });',
    );
  });

  test("keeps prefixed attrs verbatim in component props", () => {
    expect(normalize(transformJSX("<Button on:click={h}>x</Button>").code)).toBe(
      'import {component} from "@hellajs/dom"; component(Button, { "on:click": h, children: ["x"] });',
    );
  });

  test("component children and props pass through unwrapped", () => {
    expect(normalize(transformJSX("<Comp>{foo()}</Comp>").code)).toBe(
      'import {component} from "@hellajs/dom"; component(Comp, { children: [foo()] });',
    );
    expect(normalize(transformJSX("<Btn class={foo()} />").code)).toBe(
      'import {component} from "@hellajs/dom"; component(Btn, { class: foo() });',
    );
  });

  test("calls passthrough components directly and injects their imports", () => {
    expect(normalize(transformJSX("<ForEach each={items} use={item => item} />").code)).toBe(
      'import {ForEach} from "@hellajs/dom"; ForEach({ each: items, use: item => item });',
    );
    expect(getNamedImports("<Portal target={target}>content</Portal>", "@hellajs/dom")).toContain(
      "Portal",
    );
    expect(getNamedImports("<Lazy component={Comp} />", "@hellajs/dom")).toContain("Lazy");
  });

  test("merges component specifiers into an existing aliased import", () => {
    const code = "import { component as c } from '@hellajs/dom';\nconst n = <Button />;";
    expect(getNamedImports(code, "@hellajs/dom")).toEqual(["component as c", "component"]);
    expect(normalize(transformJSX(code).code)).toBe(
      "import {component as c, component} from '@hellajs/dom'; const n = component(Button, {});",
    );
  });

  test("emits each feature import once for repeated trigger syntax", () => {
    const output = transformJSX(
      "<div><span hook:afterMount={a} /><p hook:beforeMount={b} /></div>",
    ).code;
    expect(output.match(/import\s+"@hellajs\/dom\/features\/hooks";/g)?.length).toBe(1);
  });

  test("emits the namespaces feature import for svg/math inside hoisted subtrees", () => {
    const output = transformJSX("<div><svg><circle /></svg><math /></div>").code;
    expect(normalize(output)).toContain(
      'const _hellaStatic = { tag: "div", children: [{ tag: "svg", children: [{ tag: "circle", static: true }], static: true }, { tag: "math", static: true }], static: true }',
    );
    expect(output.match(/import\s+"@hellajs\/dom\/features\/namespaces";/g)?.length).toBe(1);
  });

  test("emits the custom-elements feature import for hyphenated tags incl. folded statics", () => {
    const output = transformJSX('<div><my-icon name="bolt" /><my-badge class={cls} /></div>').code;
    expect(output.match(/import\s+"@hellajs\/dom\/features\/custom-elements";/g)?.length).toBe(1);
    expect(normalize(output)).toContain(
      'const _hellaStatic = { tag: "my-icon", props: { name: "bolt" }, static: true }',
    );
  });

  test("emits feature imports for prefixed component-position attrs", () => {
    const output = transformJSX(
      "<Comp on:click={a} hook:afterMount={b} error:fallback={c} e:click={d} />",
    ).code;
    expect(output).not.toContain("@hellajs/dom/features/routed-props");
    expect(output).toContain('import "@hellajs/dom/features/hooks";');
    expect(output).toContain('import "@hellajs/dom/features/errors";');
    expect(output).toContain('import "@hellajs/dom/features/direct-events";');
  });

  test("spreads bare props.children through a concat call", () => {
    expect(normalize(transformJSX("<div>{props.children}</div>").code)).toBe(
      '({ tag: "div", children: [].concat(props.children) });',
    );
  });

  test("throws the prefixed error on an invalid target", () => {
    const options = { filename: "a.js", target: "bogus" } as unknown as TransformOptions;
    expect(() => transform("", options)).toThrow(
      '[hellajs-compiler] invalid target "bogus" — expected "ast" or "dom"',
    );
  });

  test("throws on unknown option keys", () => {
    const options = { filename: "a.js", targets: "dom" } as unknown as TransformOptions;
    expect(() => transform("", options)).toThrow(
      '[hellajs-compiler] unknown option "targets" — only "filename", "lang" and "target" are supported',
    );
  });

  test("throws on non-object options", () => {
    const options = 42 as unknown as TransformOptions;
    expect(() => transform("", options)).toThrow(
      "[hellajs-compiler] options must be an object, received 42",
    );
  });

  test("compiles omitted target to dom output (default pin)", () => {
    const output = transform("<div />", { filename: "a.jsx" })!.code;
    expect(output).toContain("@hellajs/dom/runtime");
    expect(output).toContain("_hellaMark(");
    expect(normalize(output)).toBe(
      'const _hellaTpl = _hellaTemplate("<div></div>"); import {template as _hellaTemplate, mark as _hellaMark} from "@hellajs/dom/runtime"; _hellaMark(() => { const _hellaRoot = _hellaTpl(); return _hellaRoot; });',
    );
  });

  test("strips ts type syntax ahead of the walk", () => {
    const code =
      'import type { A } from "./a";\nimport { signal } from "@hellajs/core";\nconst f = <T,>(x: T): T => x;\nconst cfg = { a: 1 } satisfies Record<string, number>;\nconst el = <div>{f(1)}</div>;';
    const output = transformJSX(code, { filename: "app.tsx", lang: "tsx" }).code;
    expect(output).not.toContain("satisfies");
    expect(normalize(output)).toContain("const f = x => x;");
    expect(normalize(output)).toContain(
      'const el = { tag: "div", children: [() => f(1)] }; export {};',
    );
  });

  test("skips the strip stage for js lang so type syntax fails the parse", () => {
    const code = "const el: HTMLElement = a < b ? c : d;";
    expect(() => transform(code, { filename: "a.js", lang: "js" })).toThrow(
      "[hellajs-compiler] Unexpected token (1:8)",
    );
    expect(transform(code, { filename: "a.ts", lang: "ts" })).toBeNull();
  });

  test("returns null for JSX-free input at both targets", () => {
    expect(transform("const a = b < c;", { filename: "a.js", lang: "js" })).toBeNull();
    expect(
      transform("const a = b < c;", { filename: "a.js", lang: "js", target: "dom" }),
    ).toBeNull();
    expect(transform("", { filename: "hellajs-validate.js", target: "dom" })).toBeNull();
  });

  test("emitted output is JSX-free and re-transforms to null", () => {
    const once = transformJSX("<div hook:afterMount={fn} error:fallback={fn} />").code;
    expect(transform(once, { filename: "fixture.jsx", target: "ast" })).toBeNull();
  });
});
