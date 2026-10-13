import { css } from "@hellajs/css";
import { tokens } from "./tokens";

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
    scrollbarColor:
      `color-mix(in oklab, ${tokens.foreground} 20%, transparent) ${tokens.base100}`,
  },
  body: {
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
