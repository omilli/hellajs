import { describe, test, expect } from "vite-plus/test";
import viteHellaJS from "../index.mjs";
import type { ViteHellaJSOptions } from "../index.d.ts";

describe("vite-plugin-hellajs target option", () => {
  test("forwards target dom to the babel transform", async () => {
    const plugin = viteHellaJS({ target: "dom" });
    const result = await plugin.transform("const x = <div class={c} />;", "/src/App.tsx");
    expect(result?.code).toContain("@hellajs/dom/runtime");
    expect(result?.code).toContain("_hellaMark(");
  });

  test("defaults to the dom target for client transforms (the flipped default)", async () => {
    const plugin = viteHellaJS();
    const result = await plugin.transform("const x = <div class={c} />;", "/src/App.tsx");
    expect(result?.code).toContain("@hellajs/dom/runtime");
    expect(result?.code).toContain("_hellaMark(");
  });

  test("resolves the ast target for server builds when the vitest gate is out of the way", async () => {
    // The wrapper treats the test runner's ssr flag as module-fetch transport, not a build
    // target (VITEST defined → client default) — clear it to exercise the real resolution.
    const hadVitest = process.env.VITEST !== undefined;
    delete process.env.VITEST;
    try {
      const plugin = viteHellaJS();
      const ssrFlag = await plugin.transform("const x = <div class={c} />;", "/src/App.tsx", {
        ssr: true,
      });
      expect(ssrFlag?.code).toContain('tag: "div"');
      expect(ssrFlag?.code).not.toContain("@hellajs/dom/runtime");
      const serverEnv = await plugin.transform.call(
        { environment: { config: { consumer: "server" } } },
        "const x = <div class={c} />;",
        "/src/App.tsx",
      );
      expect(serverEnv?.code).toContain('tag: "div"');
    } finally {
      if (hadVitest) process.env.VITEST = "true";
    }
  });

  test("rejects invalid targets at construction via the babel validation", () => {
    const bad = { target: "bogus" } as unknown as ViteHellaJSOptions;
    expect(() => viteHellaJS(bad)).toThrow(
      '[babel-plugin-hellajs] invalid target "bogus" — expected "ast" or "dom"',
    );
  });
});
