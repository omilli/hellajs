/**
 * Site font: Mulish Variable, registered as a css() block instead of plain
 * CSS. The load-bearing detail is the `src`: Vite rewrites `url()` only
 * inside the CSS pipeline (a linked stylesheet), never inside `set:html`
 * style tags — so the woff2 enters through the JS asset graph. The default
 * import of the @fontsource file is the emitted, hashed asset URL, and the
 * same string lands identically in the SSR head tag (cssText peek) and the
 * client island graph. Truly global (one face for the whole site), so it
 * lives in styles/; both layouts import it.
 */
import mulishWoff2 from "@fontsource-variable/mulish/files/mulish-latin-wght-normal.woff2";
import { css } from "@hellajs/css";

css({
  "@font-face": {
    fontFamily: "'Mulish Variable'",
    fontStyle: "normal",
    fontDisplay: "swap",
    fontWeight: "200 1000",
    src: `url(${mulishWoff2}) format('woff2-variations')`,
    unicodeRange:
      "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
  },
});
