/**
 * Docs prose typography on the ported palette (unit 07 of the site-foundation
 * set). Re-expresses the current tailwind-typography + daisyUI prose look as
 * one `css()` ruleset nested under the layout's `main` element, consuming
 * tokens.ts: metrics port the compiled `.prose` rules of the pre-exit build,
 * colors port daisyUI's base-content mapping (body text at 80% foreground,
 * headings/bold/links/quotes/table headers at full foreground, bullets and
 * row borders at 50%/20% mixes). Callouts are NOT styled here: the vocabulary
 * routes them through the ui registry alert's style module via a docs Callout
 * wrapper (unit 11); demo-frame classes stay in global.css until 11. The only
 * `!important` is the pre background, which must beat shiki's inline `style`
 * attr on `pre.astro-code`; token colors inside code blocks are inline spans
 * and are deliberately untouched. kbd/figure/video/figcaption are omitted:
 * no mdx content uses them (add when one does). Collected by the MainLayout
 * head tag via `cssText()`; imported for side effect by the layout, no
 * exports. All rules nest under `main` (user directive: no repeated prefix
 * selectors, site-wide convention for css()/style() objects).
 */
import { css } from "@hellajs/css";
import "./tokens";

const MONO =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

css({
  main: {
    // Typography base: 1rem/1.75, body text at 80% foreground.
    fontSize: "1rem",
    lineHeight: 1.75,
    color: "color-mix(in oklab, var(--foreground) 80%, transparent)",

    // Headings: full foreground, the typography scale.
    h1: {
      color: "var(--foreground)",
      marginTop: 0,
      marginBottom: ".888889em",
      fontSize: "2.25em",
      fontWeight: 800,
      lineHeight: 1.11111,
    },
    h2: {
      color: "var(--foreground)",
      marginTop: "2em",
      marginBottom: "1em",
      fontSize: "1.5em",
      fontWeight: 700,
      lineHeight: 1.33333,
      code: { fontSize: ".875em" },
    },
    h3: {
      color: "var(--foreground)",
      marginTop: "1.6em",
      marginBottom: ".6em",
      fontSize: "1.25em",
      fontWeight: 600,
      lineHeight: 1.6,
      code: { fontSize: ".9em" },
    },
    h4: {
      color: "var(--foreground)",
      marginTop: "2em",
      marginBottom: ".6em",
      fontSize: "1.125em",
      fontWeight: 600,
      lineHeight: 1.6,
    },
    ":is(h5, h6)": {
      color: "var(--foreground)",
      marginTop: "2em",
      marginBottom: ".6em",
      fontSize: "1em",
      fontWeight: 600,
      lineHeight: 1.6,
    },

    p: { marginTop: "1.25em", marginBottom: "1.25em" },

    // Links and emphasis: full-foreground text, underline, 500/600 weights.
    a: { color: "var(--foreground)", fontWeight: 500, textDecoration: "underline" },
    strong: { color: "var(--foreground)", fontWeight: 600 },

    // Lists.
    ul: {
      marginTop: "1.25em",
      marginBottom: "1.25em",
      paddingInlineStart: "1.625em",
      listStyleType: "disc",
      "> li::marker": {
        color: "color-mix(in oklab, var(--foreground) 50%, transparent)",
      },
      "> li p": { marginTop: ".75em", marginBottom: ".75em" },
      ":is(ul, ol)": { marginTop: ".75em", marginBottom: ".75em" },
    },
    ol: {
      marginTop: "1.25em",
      marginBottom: "1.25em",
      paddingInlineStart: "1.625em",
      listStyleType: "decimal",
      "> li::marker": { color: "var(--foreground)", fontWeight: 400 },
      "> li p": { marginTop: ".75em", marginBottom: ".75em" },
      ":is(ul, ol)": { marginTop: ".75em", marginBottom: ".75em" },
    },
    li: { marginTop: ".5em", marginBottom: ".5em" },
    ":is(ul, ol) > li": { paddingInlineStart: ".375em" },

    // Blockquote: italic, left rule at the 20% mix, typographic quotes.
    blockquote: {
      color: "var(--foreground)",
      fontStyle: "italic",
      fontWeight: 500,
      marginTop: "1.6em",
      marginBottom: "1.6em",
      paddingInlineStart: "1em",
      borderInlineStart:
        ".25rem solid color-mix(in oklab, var(--foreground) 20%, transparent)",
      quotes: '"\u201c" "\u201d" "\u201c" "\u201d"',
      "p:first-of-type::before": { content: "open-quote" },
      "p:last-of-type::after": { content: "close-quote" },
    },

    // Definition lists (dom/api/foreach.mdx, ssr-streaming tutorial).
    dl: { marginTop: "1.25em", marginBottom: "1.25em" },
    dt: { color: "var(--foreground)", marginTop: "1.25em", fontWeight: 600 },
    dd: { marginTop: ".5em", paddingInlineStart: "1.625em" },

    hr: {
      marginTop: "3em",
      marginBottom: "3em",
      border: "none",
      borderTop:
        "1px solid color-mix(in oklab, var(--foreground) 20%, transparent)",
    },

    // Tables: 0.875em body, 50%-mix head rule, 20%-mix row rules; collapse
    // stated explicitly so the table reads right regardless of what the
    // base-layer preflight carries.
    table: {
      tableLayout: "auto",
      width: "100%",
      borderCollapse: "collapse",
      marginTop: "2em",
      marginBottom: "2em",
      fontSize: ".875em",
      lineHeight: 1.71429,
      "> thead": {
        borderBottom:
          "1px solid color-mix(in oklab, var(--foreground) 50%, transparent)",
      },
      th: {
        color: "var(--foreground)",
        verticalAlign: "bottom",
        textAlign: "start",
        fontWeight: 600,
        padding: ".571429em",
      },
      td: {
        verticalAlign: "baseline",
        textAlign: "start",
        padding: ".571429em",
      },
      ":is(tbody, tfoot) tr": {
        borderBottom:
          "1px solid color-mix(in oklab, var(--foreground) 20%, transparent)",
      },
      "tbody tr:last-child": { borderBottom: "none" },
      ":is(tbody, tfoot) td:first-child": { paddingInlineStart: 0 },
      ":is(tbody, tfoot) td:last-child": { paddingInlineEnd: 0 },
    },

    // Images: block display + media constraints restated (the preflight
    // port carries them too; kept so prose stays self-sufficient).
    img: {
      display: "block",
      maxWidth: "100%",
      height: "auto",
      marginTop: "2em",
      marginBottom: "2em",
    },

    // Inline code chrome: base-50 fill, input-color border (fork 3 port).
    ":where(code)": {
      color: "var(--foreground)",
      fontFamily: MONO,
      fontSize: ".875em",
      fontWeight: 600,
      backgroundColor: "var(--base-50)",
      border: "1px solid var(--input)",
      borderRadius: ".25rem",
      padding: ".125rem .25rem",
    },

    // Code blocks: chrome only; shiki token colors are inline spans. The
    // !important background beats shiki's inline `style` attr (fork 3).
    "pre.astro-code": {
      backgroundColor: "var(--base-50) !important",
      border: "1px solid var(--border)",
      borderRadius: ".375rem",
      marginTop: "1.71429em",
      marginBottom: "1.71429em",
      padding: ".857143em 1.14286em",
      fontFamily: MONO,
      fontSize: ".875em",
      fontWeight: 400,
      lineHeight: 1.71429,
      overflowX: "auto",
    },

    // Reset the inline-code chrome inside blocks; shiki's inner code inherits
    // the pre's font metrics and its spans carry their own colors.
    "pre code": {
      backgroundColor: "transparent",
      border: "none",
      borderRadius: 0,
      padding: 0,
      color: "inherit",
      fontFamily: "inherit",
      fontSize: "inherit",
      fontWeight: "inherit",
      lineHeight: "inherit",
    },
  },
});
