import { describe, test, expect, beforeEach } from "vite-plus/test";
import { flush } from "@hellajs/core";
import {
  resetTestState,
  setupContainer,
  compileJsx,
  runCompiledModule,
} from "@utils/test-helpers.js";
import { hydrate, component } from "@hellajs/dom";
import type { ComponentFn, TemplateBuildFn } from "@hellajs/dom";
import server from "../server.mjs";
import * as runtimeNs from "@hellajs/dom/runtime";
import * as domNs from "@hellajs/dom";
import * as coreNs from "@hellajs/core";

const { renderToStaticMarkup } = server;

/**
 * One island, both plugin targets: the server arm compiles at the ast target (what the astro
 * server environment builds), the client arm at target "dom" (what the imperative client build
 * emits) — the same split the astro integration's environments produce.
 */
const ISLAND = `import { signal } from "@hellajs/core";
  const App = () => {
    const count = signal(0);
    return (
      <div id="counter">
        <span>{count}</span>
        <button on:click={() => count(count() + 1)}>+1</button>
      </div>
    );
  };`;

const MODULES = {
  "@hellajs/dom/runtime": runtimeNs,
  "@hellajs/dom": domNs,
  "@hellajs/core": coreNs,
};

describe("astro", () => {
  describe("island hydration", () => {
    beforeEach(() => {
      resetTestState();
    });

    test("hydrates a dom-compiled island over its server html and wires interactions", async () => {
      const serverApp = runCompiledModule(await compileJsx(ISLAND), MODULES, "App");
      const { html } = await renderToStaticMarkup(
        serverApp as Parameters<typeof renderToStaticMarkup>[0],
        {},
        undefined,
      );
      const el = setupContainer();
      el.innerHTML = html;
      const span = el.querySelector("span");
      const domApp = runCompiledModule(
        await compileJsx(ISLAND, { target: "dom" }),
        MODULES,
        "App",
      ) as unknown as ComponentFn;
      hydrate(() => component(domApp, {}) as TemplateBuildFn, el);
      expect(el.innerHTML).not.toContain("<!--[");
      expect(el.querySelector("span")).toBe(span);
      (el.querySelector("button") as HTMLButtonElement).click();
      flush();
      expect(span?.textContent).toBe("1");
    });
  });
});
