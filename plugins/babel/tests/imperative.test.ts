import { describe, test, expect } from "vite-plus/test";
import { transformJSX, normalize, getNamedImports } from "./helpers";

describe("imperative emission (target dom)", () => {
  test("compiles the keyed bench row shape to a hoisted template and a marked build fn", () => {
    const output = transformJSX(
      `
      const Row = ({ row }) => (
        <tr key={row.id} class={() => (selected() === row.id ? "danger" : "")}>
          <td class="col-md-1">{row.id}</td>
          <td class="col-md-4">
            <a class="lbl" on:click={() => selected(row.id)}>
              {row.label}
            </a>
          </td>
          <td class="col-md-1">
            <a class="remove" on:click={() => remove(row.id)}>
              <span class="glyphicon glyphicon-remove" ariaHidden="true"></span>
            </a>
          </td>
          <td class="col-md-6" />
        </tr>
      );
    `,
      { target: "dom" },
    );
    expect(normalize(output)).toBe(
      `const _hellaTpl = _hellaTemplate("<tr><td class=\\"col-md-1\\"></td><td class=\\"col-md-4\\"><a class=\\"lbl\\"></a></td><td class=\\"col-md-1\\"><a class=\\"remove\\"><span class=\\"glyphicon glyphicon-remove\\" aria-hidden=\\"true\\"></span></a></td><td class=\\"col-md-6\\"></td></tr>"); ` +
        `import { template as _hellaTemplate, mark as _hellaMark, prop as _hellaProp, on as _hellaOn, child as _hellaChild } from "@hellajs/dom/runtime"; ` +
        `const Row = ({ row }) => _hellaMark(() => { ` +
        `const _hellaRoot = _hellaTpl(); ` +
        `_hellaProp(_hellaRoot, "class", () => selected() === row.id ? "danger" : ""); ` +
        `_hellaChild(_hellaRoot.firstElementChild, row.id); ` +
        `_hellaOn(_hellaRoot.children[1].firstElementChild, "click", () => selected(row.id)); ` +
        `_hellaChild(_hellaRoot.children[1].firstElementChild, row.label); ` +
        `_hellaOn(_hellaRoot.children[2].firstElementChild, "click", () => remove(row.id)); ` +
        `return _hellaRoot; }, { key: row.id });`,
    );
  });

  test("compiles an element without key to a bare marked build fn", () => {
    const output = transformJSX(`<div class={cls}><span>{label()}</span></div>`, {
      target: "dom",
    });
    expect(normalize(output)).toBe(
      `const _hellaTpl = _hellaTemplate("<div><span></span></div>"); ` +
        `import { template as _hellaTemplate, mark as _hellaMark, prop as _hellaProp, child as _hellaChild } from "@hellajs/dom/runtime"; ` +
        `_hellaMark(() => { const _hellaRoot = _hellaTpl(); ` +
        `_hellaProp(_hellaRoot, "class", cls); ` +
        `_hellaChild(_hellaRoot.firstElementChild, () => label()); ` +
        `return _hellaRoot; });`,
    );
  });

  test("compiles a fully static subtree to a bare create build fn with no runtime calls", () => {
    const output = transformJSX(`<div id="x"><span>hi</span></div>`, { target: "dom" });
    expect(normalize(output)).toBe(
      `const _hellaTpl = _hellaTemplate("<div id=\\"x\\"><span>hi</span></div>"); ` +
        `import { template as _hellaTemplate, mark as _hellaMark } from "@hellajs/dom/runtime"; ` +
        `_hellaMark(() => { const _hellaRoot = _hellaTpl(); return _hellaRoot; });`,
    );
  });

  test("compiles a fragment root to a fragment builder and marked build fn", () => {
    const output = transformJSX(`<>count {dyn()}</>`, { target: "dom" });
    expect(normalize(output)).toBe(
      `const _hellaFrag = _hellaFragment("count "); ` +
        `import { fragment as _hellaFragment, mark as _hellaMark, child as _hellaChild } from "@hellajs/dom/runtime"; ` +
        `_hellaMark(() => { const _hellaRoot = _hellaFrag(); _hellaChild(_hellaRoot, () => dyn()); return _hellaRoot; });`,
    );
  });

  test("emits the parse namespace for svg-interior sites and today's shape for plain templates", () => {
    const output = transformJSX(
      `
      const App = () => (
        <svg>
          {label()}
          <g><circle r="4"/></g>
        </svg>
      );
    `,
      { target: "dom" },
    );
    expect(normalize(output)).toBe(
      `const _hellaTpl = _hellaTemplate("<g><circle r=\\"4\\"></circle></g>", "http://www.w3.org/2000/svg"), _hellaTpl2 = _hellaTemplate("<svg></svg>"); ` +
        `import { template as _hellaTemplate, mark as _hellaMark, child as _hellaChild } from "@hellajs/dom/runtime"; ` +
        `import "@hellajs/dom/features/namespaces"; ` +
        `const App = () => _hellaMark(() => { ` +
        `const _hellaRoot = _hellaTpl2(); ` +
        `_hellaChild(_hellaRoot, () => label()); ` +
        `_hellaChild(_hellaRoot, _hellaMark(() => { const _hellaRoot = _hellaTpl(); return _hellaRoot; })); ` +
        `return _hellaRoot; });`,
    );
  });

  test("folds literal props into the template and emits prop calls for the rest", () => {
    const output = transformJSX(
      `<input id="s" count={5} required disabled={false} value="x" checked={true} class={cls} />`,
      { target: "dom" },
    );
    expect(normalize(output)).toBe(
      `const _hellaTpl = _hellaTemplate("<input id=\\"s\\" count=\\"5\\" required>"); ` +
        `import { template as _hellaTemplate, mark as _hellaMark, prop as _hellaProp } from "@hellajs/dom/runtime"; ` +
        `_hellaMark(() => { const _hellaRoot = _hellaTpl(); ` +
        `_hellaProp(_hellaRoot, "value", "x"); ` +
        `_hellaProp(_hellaRoot, "checked", true); ` +
        `_hellaProp(_hellaRoot, "class", cls); ` +
        `return _hellaRoot; });`,
    );
  });

  test("emits delegated and direct handler calls with the direct-events feature import", () => {
    const output = transformJSX(`<button on:click={h} e:focus={d} />`, { target: "dom" });
    expect(normalize(output)).toBe(
      `const _hellaTpl = _hellaTemplate("<button></button>"); ` +
        `import { template as _hellaTemplate, mark as _hellaMark, on as _hellaOn, direct as _hellaDirect } from "@hellajs/dom/runtime"; ` +
        `import "@hellajs/dom/features/direct-events"; ` +
        `_hellaMark(() => { const _hellaRoot = _hellaTpl(); ` +
        `_hellaOn(_hellaRoot, "click", h); _hellaDirect(_hellaRoot, "focus", d); ` +
        `return _hellaRoot; });`,
    );
  });

  test("emits hook calls and the hooks feature import", () => {
    const output = transformJSX(`<div hook:afterMount={h} />`, { target: "dom" });
    expect(normalize(output)).toBe(
      `const _hellaTpl = _hellaTemplate("<div></div>"); ` +
        `import { template as _hellaTemplate, mark as _hellaMark, hook as _hellaHook } from "@hellajs/dom/runtime"; ` +
        `import "@hellajs/dom/features/hooks"; ` +
        `_hellaMark(() => { const _hellaRoot = _hellaTpl(); _hellaHook(_hellaRoot, "afterMount", h); return _hellaRoot; });`,
    );
  });

  test("emits errorConfig with the build self-reference and the errors feature import", () => {
    const output = transformJSX(`<div error:fallback={Fallback} />`, { target: "dom" });
    expect(normalize(output)).toBe(
      `const _hellaTpl = _hellaTemplate("<div></div>"); ` +
        `import { template as _hellaTemplate, mark as _hellaMark, errorConfig as _hellaErrorConfig } from "@hellajs/dom/runtime"; ` +
        `import "@hellajs/dom/features/errors"; ` +
        `_hellaMark(function _hellaBuild() { const _hellaRoot = _hellaTpl(); ` +
        `_hellaErrorConfig(_hellaRoot, { fallback: Fallback }, _hellaBuild); ` +
        `return _hellaRoot; });`,
    );
  });

  test("emits child for every dynamic child (polymorphic — runtime classifies text vs element)", () => {
    const output = transformJSX(`<div>{cond() ? <a /> : <b />}{s()}</div>`, { target: "dom" });
    expect(normalize(output)).toBe(
      `const _hellaTpl = _hellaTemplate("<div></div>"), _hellaTpl2 = _hellaTemplate("<a></a>"), ` +
        `_hellaTpl3 = _hellaTemplate("<b></b>"); ` +
        `import { template as _hellaTemplate, mark as _hellaMark, child as _hellaChild } from "@hellajs/dom/runtime"; ` +
        `_hellaMark(() => { const _hellaRoot = _hellaTpl(); ` +
        `_hellaChild(_hellaRoot, () => cond() ? ` +
        `_hellaMark(() => { const _hellaRoot = _hellaTpl2(); return _hellaRoot; }) : ` +
        `_hellaMark(() => { const _hellaRoot = _hellaTpl3(); return _hellaRoot; })); ` +
        `_hellaChild(_hellaRoot, () => s()); return _hellaRoot; });`,
    );
  });

  test("routes spread props through per-key prop calls at runtime", () => {
    const output = transformJSX(`<div {...rest} id="x" />`, { target: "dom" });
    expect(normalize(output)).toBe(
      `const _hellaTpl = _hellaTemplate("<div id=\\"x\\"></div>"); ` +
        `import { template as _hellaTemplate, mark as _hellaMark, prop as _hellaProp } from "@hellajs/dom/runtime"; ` +
        `_hellaMark(() => { const _hellaRoot = _hellaTpl(); ` +
        `Object.keys(rest).forEach(k => _hellaProp(_hellaRoot, k, rest[k])); ` +
        `return _hellaRoot; }, { ...rest });`,
    );
  });

  test("emits static text after a dynamic child as text calls to preserve order", () => {
    const output = transformJSX(`<td>hello {name()} world</td>`, { target: "dom" });
    expect(normalize(output)).toBe(
      `const _hellaTpl = _hellaTemplate("<td>hello </td>"); ` +
        `import { template as _hellaTemplate, mark as _hellaMark, text as _hellaText, child as _hellaChild } from "@hellajs/dom/runtime"; ` +
        `_hellaMark(() => { const _hellaRoot = _hellaTpl(); ` +
        `_hellaChild(_hellaRoot, () => name()); _hellaText(_hellaRoot, " world"); ` +
        `return _hellaRoot; });`,
    );
  });

  test("routes component children through child calls and nested static sites", () => {
    const output = transformJSX(`<div><Button>Go</Button><span>ok</span></div>`, {
      target: "dom",
    });
    expect(normalize(output)).toBe(
      `const _hellaTpl = _hellaTemplate("<span>ok</span>"), _hellaTpl2 = _hellaTemplate("<div></div>"); ` +
        `import { template as _hellaTemplate, mark as _hellaMark, child as _hellaChild } from "@hellajs/dom/runtime"; ` +
        `import { component } from "@hellajs/dom"; ` +
        `_hellaMark(() => { const _hellaRoot = _hellaTpl2(); ` +
        `_hellaChild(_hellaRoot, component(Button, { children: ["Go"] })); ` +
        `_hellaChild(_hellaRoot, _hellaMark(() => { const _hellaRoot = _hellaTpl(); return _hellaRoot; })); ` +
        `return _hellaRoot; });`,
    );
  });

  test("keeps property-assigned keys out of template folding and emits prop calls", () => {
    const output = transformJSX(`<div><input value="x" /></div>`, { target: "dom" });
    expect(normalize(output)).toBe(
      `const _hellaTpl = _hellaTemplate("<div><input></div>"); ` +
        `import { template as _hellaTemplate, mark as _hellaMark, prop as _hellaProp } from "@hellajs/dom/runtime"; ` +
        `_hellaMark(() => { const _hellaRoot = _hellaTpl(); ` +
        `_hellaProp(_hellaRoot.firstElementChild, "value", "x"); ` +
        `return _hellaRoot; });`,
    );
  });

  test("emits the namespaces feature import for svg structure under target dom", () => {
    const output = transformJSX(`<svg><circle r="1" /></svg>`, { target: "dom" });
    expect(normalize(output)).toBe(
      `const _hellaTpl = _hellaTemplate("<svg><circle r=\\"1\\"></circle></svg>"); ` +
        `import { template as _hellaTemplate, mark as _hellaMark } from "@hellajs/dom/runtime"; ` +
        `import "@hellajs/dom/features/namespaces"; ` +
        `_hellaMark(() => { const _hellaRoot = _hellaTpl(); return _hellaRoot; });`,
    );
  });

  test("emits the custom-elements feature import for hyphenated tags under target dom", () => {
    const output = transformJSX(`<div><my-icon name="bolt" /></div>`, { target: "dom" });
    expect(normalize(output)).toBe(
      `const _hellaTpl = _hellaTemplate("<div><my-icon name=\\"bolt\\"></my-icon></div>"); ` +
        `import { template as _hellaTemplate, mark as _hellaMark } from "@hellajs/dom/runtime"; ` +
        `import "@hellajs/dom/features/custom-elements"; ` +
        `_hellaMark(() => { const _hellaRoot = _hellaTpl(); return _hellaRoot; });`,
    );
  });

  test("emits one custom-elements import for a program mixing hyphenated and standard tags", () => {
    const output = transformJSX(`<div><my-icon /><span>ok</span></div>`, { target: "dom" });
    expect(output.split("@hellajs/dom/features/custom-elements").length - 1).toBe(1);
  });

  test("emits no custom-elements import for all-standard programs under target dom", () => {
    const output = transformJSX(`<div><span>hi</span></div>`, { target: "dom" });
    expect(output).not.toContain("@hellajs/dom/features/custom-elements");
  });

  test("routes spread and array children through child calls", () => {
    const output = transformJSX(`<div>{[<i>a</i>, <i>b</i>]}{props.children}</div>`, {
      target: "dom",
    });
    expect(normalize(output)).toBe(
      `const _hellaTpl = _hellaTemplate("<div></div>"), _hellaTpl2 = _hellaTemplate("<i>a</i>"), ` +
        `_hellaTpl3 = _hellaTemplate("<i>b</i>"); ` +
        `import { template as _hellaTemplate, mark as _hellaMark, child as _hellaChild } from "@hellajs/dom/runtime"; ` +
        `_hellaMark(() => { const _hellaRoot = _hellaTpl(); ` +
        `_hellaChild(_hellaRoot, [_hellaMark(() => { const _hellaRoot = _hellaTpl2(); return _hellaRoot; }), ` +
        `_hellaMark(() => { const _hellaRoot = _hellaTpl3(); return _hellaRoot; })]); ` +
        `_hellaChild(_hellaRoot, props.children); return _hellaRoot; });`,
    );
  });

  test("imports exactly the helpers a file uses and never dom internals", () => {
    const output = transformJSX(`<div><span>x</span></div>`, { target: "dom" });
    expect(getNamedImports(output, "@hellajs/dom/runtime")).toEqual([
      "template as _hellaTemplate",
      "mark as _hellaMark",
    ]);
    expect(output).not.toContain("@hellajs/dom/internal");
    expect(output).not.toContain(`from "@hellajs/dom"`);
  });

  test("still compiles component call sites through component() under target dom", () => {
    const output = transformJSX(`<Row row={row} />`, { target: "dom" });
    expect(normalize(output)).toBe(
      `import { component } from "@hellajs/dom"; component(Row, { row: row });`,
    );
    expect(output).not.toContain("@hellajs/dom/runtime");
  });
});
