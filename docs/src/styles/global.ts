import { css } from "@hellajs/css";
import { tokens } from "./tokens";
// Registry theme sheet registers site-wide (static head, every layout):
// `body.dark` resolves its `.dark` values for the canvas/portal base, and
// its light `:root` registration loses everywhere it matters because body
// and `.docs-palette` declare the same properties at element level
// (element-level declarations beat inherited values, order-free).
import "../components/ui/tokens.js";

/**
 * Site-wide element styles: dark color scheme, scrollbar tint, the body
 * canvas (background/typography on the ported palette), and the page-scroll
 * ergonomics the fixed navbar imposes — smooth in-page anchor jumps (the old
 * TOC script's scrollIntoView) and a scroll offset so anchored headings land
 * below the bar instead of under it. Truly global (no markup owner), so it
 * lives in styles/ next to preflight and fonts; the layouts import it for
 * the deterministic cssText() head set.
 */
css({
  html: {
    colorScheme: "dark",
    scrollBehavior: "smooth",
    // html sits outside `.docs-palette`, so site vars no longer resolve
    // here; the color-mix pins the exact values the token expression
    // expanded to (`tokens.foreground`, `tokens.base100`).
    scrollbarColor:
      "color-mix(in oklab, oklch(97.807% 0.029 256.847) 20%, transparent) hsl(222.2 47.4% 8%)",
  },
  // Registry default dark base: body paints the canvas (background
  // propagates to the viewport) and anchors the portal layer - demo
  // portals append to body and inherit these values.
  body: {
    backgroundColor: "var(--background)",
  },
  // Site palette overlay: every layout wraps its body content in this
  // wrapper, so chrome, prose, and the landing page resolve the site
  // ladder instead of the registry values inherited from body.
  ".docs-palette": {
    backgroundColor: tokens.base100,
    color: tokens.foreground,
    fontFamily: tokens.fontSans,
  },

  // Anchored headings must not land under the fixed navbar (07 deferred
  // this here: chrome, not prose).
  "main :is(h2, h3, h4, h5, h6)": {
    scrollMarginTop: `calc(${tokens.navbarH} + 1rem)`,
  },
});
