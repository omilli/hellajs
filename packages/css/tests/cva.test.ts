import { describe, test, expect, beforeEach } from "bun:test";
import { resetTestState, getStylesheet } from "@utils/test-helpers.js";
import { cva, cssText, removeStyle } from "@hellajs/css/bundle";

beforeEach(() => {
  resetTestState();
});

describe("cva", () => {
  test("creating a recipe injects nothing", () => {
    cva({
      base: { padding: "1rem" },
      variants: { size: { sm: { fontSize: 12 }, lg: { fontSize: 16 } } },
      compoundVariants: [{ size: "lg", css: { fontWeight: 700 } }],
    });
    expect(getStylesheet("hella-css")).toBe("");
    expect(cssText()).toBe("");
  });

  test("resolves only the base class when nothing is selected", () => {
    const button = cva({
      base: { padding: "1rem" },
      variants: { size: { sm: { fontSize: 12 }, lg: { fontSize: 16 } } },
    });
    const base = button();
    expect(base).toMatch(/^h-base-[a-z0-9]+$/);
    expect(button({})).toBe(base);
    expect(getStylesheet("hella-css")).toBe(`.${base}{padding:1rem}`);
  });

  test("resolves only variant classes when the recipe has no base", () => {
    const recipe = cva({ variants: { size: { lg: { padding: "2rem" } } } });
    expect(recipe()).toBe("");
    expect(recipe({ size: "lg" })).toMatch(/^h-size-lg-[a-z0-9]+$/);
  });

  test("joins selected variant classes in config order after the base", () => {
    const button = cva({
      base: { padding: "1rem" },
      variants: {
        size: { sm: { fontSize: 12 }, lg: { fontSize: 16 } },
        tone: { primary: { background: "blue" }, danger: { background: "red" } },
        weight: { bold: { fontWeight: 700 } },
      },
    });
    const resolved = button({ size: "lg", tone: "primary" });
    const [base, size, tone] = resolved.split(" ");
    expect(base).toMatch(/^h-base-/);
    expect(size).toMatch(/^h-size-lg-/);
    expect(tone).toMatch(/^h-tone-primary-/);
    expect(resolved.split(" ")).toHaveLength(3);
  });

  test("fills missing selections from defaultVariants", () => {
    const button = cva({
      variants: { size: { sm: { fontSize: 12 }, lg: { fontSize: 16 } } },
      defaultVariants: { size: "sm" },
    });
    expect(button()).toMatch(/^h-size-sm-[a-z0-9]+$/);
  });

  test("explicit selections override defaultVariants", () => {
    const button = cva({
      variants: { size: { sm: { fontSize: 12 }, lg: { fontSize: 16 } } },
      defaultVariants: { size: "sm" },
    });
    expect(button({ size: "lg" })).toMatch(/^h-size-lg-[a-z0-9]+$/);
  });

  test("emits the compound class when every stated selection matches", () => {
    const button = cva({
      variants: {
        size: { sm: { fontSize: 12 }, lg: { fontSize: 16 } },
        tone: { primary: { background: "blue" }, danger: { background: "red" } },
      },
      compoundVariants: [
        { size: "lg", tone: "danger", css: { fontWeight: 700 } },
        { size: { initial: "lg" }, css: "size-lg-special" },
      ],
    });
    const resolved = button({ size: "lg", tone: "danger" });
    const [sizeCls, toneCls, compoundCls] = resolved.split(" ");
    expect(sizeCls).toMatch(/^h-size-lg-/);
    expect(toneCls).toMatch(/^h-tone-danger-/);
    expect(compoundCls).toMatch(/^h-size-lg-tone-danger-[a-z0-9]+$/);
    expect(getStylesheet("hella-css")).toBe(
      `.${sizeCls}{font-size:16px}.${toneCls}{background:red}.${compoundCls}{font-weight:700}`
    );
  });

  test("emits nothing when a compound only partially matches", () => {
    const button = cva({
      variants: {
        size: { sm: { fontSize: 12 }, lg: { fontSize: 16 } },
        tone: { primary: { background: "blue" }, danger: { background: "red" } },
      },
      compoundVariants: [{ size: "lg", tone: "danger", css: { fontWeight: 700 } }],
    });
    const resolved = button({ size: "lg" });
    expect(resolved.split(" ")).toHaveLength(1);
    expect(getStylesheet("hella-css")).toBe(`.${resolved}{font-size:16px}`);
  });

  test("rejects compound keys absent from variants at compile time", () => {
    cva({
      variants: { size: { sm: { fontSize: 12 }, lg: { fontSize: 16 } } },
      compoundVariants: [
        {
          size: "lg",
          // @ts-expect-error - ghost is not a configured variant
          ghost: "true",
          css: { fontWeight: 700 },
        },
      ],
    });
  });

  test("passes string base and string variant values through verbatim", () => {
    const button = cva({
      base: "btn",
      variants: { tone: { primary: "btn-primary", none: "" } },
    });
    expect(button({ tone: "primary" })).toBe("btn btn-primary");
    expect(button({ tone: "none" })).toBe("btn");
    expect(getStylesheet("hella-css")).toBe("");
  });

  test("the first call injects exactly the base and selected variants", () => {
    const button = cva({
      base: { padding: "1rem" },
      variants: {
        size: { sm: { fontSize: 12 }, lg: { fontSize: 16 } },
        tone: { primary: { background: "blue" }, danger: { background: "red" } },
      },
    });
    const [base, size] = button({ size: "lg" }).split(" ");
    expect(getStylesheet("hella-css")).toBe(`.${base}{padding:1rem}.${size}{font-size:16px}`);
  });

  test("repeat calls add no rules and return the identical string", () => {
    const button = cva({
      base: { padding: "1rem" },
      variants: { size: { sm: { fontSize: 12 }, lg: { fontSize: 16 } } },
    });
    const first = button({ size: "lg" });
    const second = button({ size: "lg" });
    expect(second).toBe(first);
    const [base, size] = first.split(" ");
    expect(getStylesheet("hella-css")).toBe(`.${base}{padding:1rem}.${size}{font-size:16px}`);
  });

  test("returns the same classes on the server and cssText carries the called styles", () => {
    const doc = globalThis.document;
    let serverClasses: string;
    let serverText: string;
    try {
      const serverButton = cva({
        base: { padding: "1rem" },
        variants: { size: { sm: { fontSize: 12 } } },
      });
      serverClasses = serverButton({ size: "sm" });
      serverText = cssText();
    } finally {
      (globalThis as unknown as Record<string, unknown>).document = doc;
    }
    const clientButton = cva({
      base: { padding: "1rem" },
      variants: { size: { sm: { fontSize: 12 } } },
    });
    expect(serverClasses).toBe(clientButton({ size: "sm" }));
    const [base, size] = serverClasses.split(" ");
    expect(serverText).toBe(`.${base}{padding:1rem}.${size}{font-size:12px}`);
    expect(cssText()).toBe(serverText);
  });

  test("removeStyle removes a rule the recipe generated", () => {
    const sizeLg = { padding: "0.75rem 1.5rem" };
    const button = cva({ variants: { size: { lg: sizeLg } } });
    button({ size: "lg" });
    removeStyle(sizeLg, { label: "size-lg" });
    expect(getStylesheet("hella-css")).toBe("");
  });

  test("throws on invalid config shapes", () => {
    expect(() => cva(42 as never)).toThrow("[css] cva: expected a config object");
    expect(() => cva({ variants: null } as never)).toThrow("[css] cva: expected a variants object");
    expect(() => cva({ base: 42, variants: {} } as never)).toThrow("[css] cva: expected base to be a style object or class string");
    expect(() => cva({ media: "md", variants: {} } as never)).toThrow("[css] cva: expected media to be a breakpoint object");
  });

  test("throws on non-object props", () => {
    const button = cva({ variants: { size: { sm: { fontSize: 12 } } } });
    expect(() => button(42 as never)).toThrow("[css] cva: expected a props object");
  });

  test("throws on a value absent from its variant", () => {
    const button = cva({ variants: { size: { sm: { fontSize: 12 } } } });
    expect(() => button({ size: "xxl" } as never)).toThrow('[css] cva: unknown value "xxl" for variant "size"');
  });
});
