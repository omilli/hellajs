import { describe, test, expect, beforeEach } from "bun:test";
import { resetTestState, getStylesheet } from "@utils/test-helpers.js";
import { cva } from "@hellajs/css/bundle";

const MEDIA = { md: "(min-width: 768px)", lg: "(min-width: 1024px)" };

beforeEach(() => {
  resetTestState();
});

describe("cva responsive", () => {
  test("emits the initial class un-wrapped and breakpoint classes under their media wrap", () => {
    const button = cva({
      media: MEDIA,
      variants: { size: { sm: { fontSize: 12 }, lg: { fontSize: 16 } } },
    });
    const [sm, lg] = button({ size: { initial: "sm", md: "lg" } }).split(" ");
    expect(sm).toMatch(/^h-size-sm-/);
    expect(lg).toMatch(/^h-size-lg-/);
    expect(getStylesheet("hella-css")).toBe(
      `.${sm}{font-size:12px}@media (min-width:768px){.${lg}{font-size:16px}}`
    );
  });

  test("emits the class once when the same value is selected at initial and a breakpoint", () => {
    const button = cva({
      media: MEDIA,
      variants: { size: { sm: { fontSize: 12 } } },
    });
    const sm = button({ size: { initial: "sm", md: "sm" } });
    expect(sm.split(" ")).toHaveLength(1);
    expect(getStylesheet("hella-css")).toBe(
      `.${sm}{font-size:12px}@media (min-width:768px){.${sm}{font-size:12px}}`
    );
  });

  test("falls back to the default at initial when a responsive selection omits it", () => {
    const button = cva({
      media: MEDIA,
      variants: { size: { sm: { fontSize: 12 }, lg: { fontSize: 16 } } },
      defaultVariants: { size: "sm" },
    });
    const [sm, lg] = button({ size: { md: "lg" } }).split(" ");
    expect(sm).toMatch(/^h-size-sm-/);
    expect(lg).toMatch(/^h-size-lg-/);
    expect(getStylesheet("hella-css")).toBe(
      `.${sm}{font-size:12px}@media (min-width:768px){.${lg}{font-size:16px}}`
    );
  });

  test("emits the compound class when its breakpoint selection matches", () => {
    const button = cva({
      media: MEDIA,
      variants: { size: { sm: { fontSize: 12 }, lg: { fontSize: 16 } } },
      compoundVariants: [{ size: { md: "lg" }, css: { fontWeight: 700 } }],
    });
    const resolved = button({ size: { initial: "sm", md: "lg" } });
    const [sm, lg, compound] = resolved.split(" ");
    expect(compound).toMatch(/^h-size-md-lg-[a-z0-9]+$/);
    expect(getStylesheet("hella-css")).toBe(
      `.${sm}{font-size:12px}@media (min-width:768px){.${lg}{font-size:16px}}.${compound}{font-weight:700}`
    );
  });

  test("skips the compound when its breakpoint selection is unmet", () => {
    const button = cva({
      media: MEDIA,
      variants: { size: { sm: { fontSize: 12 }, lg: { fontSize: 16 } } },
      compoundVariants: [{ size: { md: "lg" }, css: { fontWeight: 700 } }],
    });
    const sm = button({ size: "sm" });
    expect(sm.split(" ")).toHaveLength(1);
    expect(getStylesheet("hella-css")).toBe(`.${sm}{font-size:12px}`);
  });

  test("throws on a breakpoint absent from the media config", () => {
    const button = cva({
      media: MEDIA,
      variants: { size: { sm: { fontSize: 12 }, lg: { fontSize: 16 } } },
    });
    expect(() => button({ size: { xxl: "lg" } } as never)).toThrow(
      '[css] cva: unknown breakpoint "xxl" for variant "size" — add it to the media config'
    );
  });

  test("rejects breakpoint keys absent from the media config at compile time", () => {
    const button = cva({
      media: MEDIA,
      variants: { size: { sm: { fontSize: 12 }, lg: { fontSize: 16 } } },
    });
    expect(() =>
      // @ts-expect-error - xxl is not a configured breakpoint
      button({ size: { xxl: "lg" } }),
    ).toThrow();
  });
});
