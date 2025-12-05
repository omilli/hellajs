import { describe, test, expect } from "bun:test";
import { transform } from "@babel/core";
import babelPlugin from "../index.mjs";

describe("Lazy component Babel transformation", () => {
  test("transforms Lazy components in JSX", () => {
    const input = `
      import { Lazy } from "@hellajs/dom";

      function App() {
        return <Lazy loader={() => import("./Component")} fallback={<div>Loading...</div>} />;
      }
    `;

    const result = transform(input, {
      plugins: [[babelPlugin]],
      filename: "test.jsx",
    });

    // Lazy should be called directly, not wrapped in component()
    expect(result.code).toContain("Lazy({");
    expect(result.code).not.toContain("component(Lazy,");
  });

  test("transforms Lazy components in html templates", () => {
    const input = `
      import { Lazy, html } from "@hellajs/dom";

      const template = html\`
        <div>
          <\${Lazy} loader=\${() => import("./Component")} fallback=\${html\`<div>Loading...</div>\`} />
        </div>
      \`;
    `;

    const result = transform(input, {
      plugins: [[babelPlugin]],
      filename: "test.js",
    });

    // Lazy should be called directly in the template
    expect(result.code).toContain("Lazy({");
    expect(result.code).not.toContain("component(Lazy,");
  });

  test("Lazy component is in PASSTHROUGH_NAMES", async () => {
    const { findPassthroughComponents } = await import("../src/utils/traversal.mjs");

    const ast = {
      tag: "Lazy",
      children: []
    };

    const passthrough = findPassthroughComponents(ast);
    expect(passthrough.has("Lazy")).toBe(true);
  });
});