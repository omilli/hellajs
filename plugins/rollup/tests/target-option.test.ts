import { describe, test, expect } from "vite-plus/test";
import { resolve } from "node:path";
import rollupHellaJS from "../index.mjs";

describe("rollup-plugin-hellajs target option", () => {
  test("forwards target dom through the transform hook", () => {
    const plugin = rollupHellaJS({ target: "dom" });
    const result = plugin.transform("const x = <div class={c} />;", "/src/App.tsx");
    expect(result?.code).toContain("@hellajs/dom/runtime");
    expect(result?.code).toContain("_hellaMark(");
  });

  test("forwards target dom through the load hook", () => {
    const plugin = rollupHellaJS({ target: "dom" });
    const rowPath = resolve(import.meta.dirname, "../../../examples/bench/src/Row.tsx");
    const result = plugin.load(rowPath);
    expect(result?.code).toContain("@hellajs/dom/runtime");
    expect(result?.code).toContain("_hellaMark(");
  });

  test("defaults to the dom target without options (the flipped default)", () => {
    const plugin = rollupHellaJS();
    const result = plugin.transform("const x = <div class={c} />;", "/src/App.tsx");
    expect(result?.code).toContain("@hellajs/dom/runtime");
    expect(result?.code).toContain("_hellaMark(");
    expect(result?.code).not.toContain('tag: "div"');
  });
});
