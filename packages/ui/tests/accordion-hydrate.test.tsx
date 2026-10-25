import { describe, test, expect, beforeEach } from "vite-plus/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { transformSync } from "@babel/core";
import presetTypeScript from "@babel/preset-typescript";
import babelHellaJS from "babel-plugin-hellajs";
import { flush } from "@hellajs/core";
import {
  compileJsx,
  resetTestState,
  runCompiledModule,
  setupContainer,
} from "@utils/test-helpers.js";
// The bare "@hellajs/dom" index, not the bundle: the compiled registry components — and this
// harness's babel-transformed arms — import the bare specifier, so the harness hydrate and the
// components share one dom instance.
import { hydrate } from "@hellajs/dom";
import * as domNs from "@hellajs/dom";
import * as domRuntimeNs from "@hellajs/dom/runtime";
import * as coreNs from "@hellajs/core";
import * as cssNs from "@hellajs/css";
import { ssr } from "@hellajs/ssr";
import * as AccordionRegistry from "../dist/registry/accordion/css/accordion";
import { tokens } from "../dist/registry/accordion/css/tokens";
import type { HellaNode, TemplateBuildFn } from "@hellajs/dom";

beforeEach(() => {
  resetTestState();
});

// The docs site's accordion surface: the byte-exact css-jsx `add` output the Astro islands render.
// It compiles per environment there (vite: ast on the server, dom on the client) — the same split
// this harness reproduces. The built dist/registry module is dom-target currency only (`ssr`
// rejects a flagged build), so the server arm compiles this source at the ast target while the
// client arm binds the built registry module `hydrate` consumes.
const ACCORDION_SOURCE = readFileSync(
  join(import.meta.dirname, "../../../docs/src/components/ui/accordion.tsx"),
  "utf8",
);

const APP_SOURCE = `import { Accordion } from "./accordion.js";
const items = [
  { value: "shipping", trigger: "Shipping", content: "Shipping body" },
  { value: "billing", trigger: "Billing", content: "Billing body" },
  { value: "disabled-entry", trigger: "Disabled entry", content: "Disabled body", disabled: true },
];
const App = () => <Accordion type="single" collapsible open="shipping" items={items} />;
const __out = { App };`;

/**
 * Two-target accordion fixture: fills a container with the REAL `ssr()` output of the ast-compiled
 * accordion and returns the container plus the client arm's `App` (a `() => TemplateBuildFn` thunk
 * whose build is the compiled registry module) for `hydrate`. The fixture binds the accordion
 * specifier per arm: the ast-compiled docs source on the server, the built registry module on the
 * client.
 */
const twoTargetAccordion = async (): Promise<{
  container: Element;
  app: () => TemplateBuildFn;
}> => {
  // The docs module is a real ES module: strip its `export` prefixes (runCompiledModule strips
  // imports only — its `new Function` body cannot carry ESM syntax) and re-emit the export names
  // as a plain object the fixture binds as the accordion namespace.
  const serverAccordion = runCompiledModule(
    `${
      transformSync(ACCORDION_SOURCE, {
        plugins: [[babelHellaJS, { target: "ast" }]],
        presets: [presetTypeScript],
        filename: "accordion.tsx",
        configFile: false,
        parserOpts: { plugins: ["jsx"] },
      })?.code?.replace(/^export /gm, "") ?? ""
    }\nconst __out = { AccordionItem, AccordionTrigger, AccordionContent, Accordion };`,
    {
      "@hellajs/core": coreNs,
      "@hellajs/dom": domNs,
      "@hellajs/css": cssNs,
      "./tokens.js": { tokens },
    },
    "__out",
  ) as Record<string, unknown>;
  const server = runCompiledModule(
    await compileJsx(APP_SOURCE),
    { "./accordion.js": serverAccordion, "@hellajs/core": coreNs, "@hellajs/dom": domNs },
    "__out",
  ) as Record<string, unknown>;
  const container = setupContainer();
  container.innerHTML = ssr((server.App as () => HellaNode)());
  const client = runCompiledModule(
    await compileJsx(APP_SOURCE, { target: "dom" }),
    {
      "./accordion.js": AccordionRegistry,
      "@hellajs/dom": domNs,
      "@hellajs/dom/runtime": domRuntimeNs,
    },
    "__out",
  ) as Record<string, unknown>;
  return { container, app: client.App as () => TemplateBuildFn };
};

const triggers = (container: Element) =>
  Array.from(container.querySelectorAll('[data-slot="accordion-trigger"]')) as HTMLElement[];

const items = (container: Element) =>
  Array.from(container.querySelectorAll('[data-slot="accordion-item"]')) as HTMLElement[];

const click = (el: HTMLElement) => el.dispatchEvent(new MouseEvent("click", { bubbles: true }));

describe("accordion", () => {
  describe("hydrate", () => {
    test("opens a closed trigger post-hydrate, closing the previously open item with node identity preserved", async () => {
      const { container, app } = await twoTargetAccordion();
      const billingTrigger = triggers(container)[1]!;
      const billingItem = items(container)[1]!;
      expect(billingTrigger.getAttribute("aria-expanded")).toBe("false");

      hydrate(app, container);
      expect(triggers(container)[1]).toBe(billingTrigger);
      expect(items(container)[1]).toBe(billingItem);

      click(billingTrigger);
      flush();
      expect(billingItem.getAttribute("data-state")).toBe("open");
      expect(billingTrigger.getAttribute("data-state")).toBe("open");
      expect(billingTrigger.getAttribute("aria-expanded")).toBe("true");
      expect(items(container)[0]!.getAttribute("data-state")).toBe("closed");
      expect(triggers(container)[0]!.getAttribute("aria-expanded")).toBe("false");
      expect(triggers(container)[1]).toBe(billingTrigger);
      expect(items(container)[1]).toBe(billingItem);
    });

    test("closes the open item when its hydrated trigger is clicked while collapsible", async () => {
      const { container, app } = await twoTargetAccordion();
      hydrate(app, container);
      const shippingTrigger = triggers(container)[0]!;
      expect(shippingTrigger.getAttribute("data-state")).toBe("open");

      click(shippingTrigger);
      flush();
      expect(shippingTrigger.getAttribute("data-state")).toBe("closed");
      expect(shippingTrigger.getAttribute("aria-expanded")).toBe("false");
      expect(items(container)[0]!.getAttribute("data-state")).toBe("closed");
    });

    test("ignores clicks on a disabled entry's hydrated trigger", async () => {
      const { container, app } = await twoTargetAccordion();
      hydrate(app, container);
      const disabledTrigger = triggers(container)[2]!;

      click(disabledTrigger);
      flush();
      expect(disabledTrigger.getAttribute("data-state")).toBe("closed");
      expect(disabledTrigger.getAttribute("aria-expanded")).toBe("false");
      expect(triggers(container)[0]!.getAttribute("data-state")).toBe("open");
    });
  });
});
