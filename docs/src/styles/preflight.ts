/**
 * Site preflight, base layer: a rule-for-rule port of tailwindcss's
 * preflight.css (source: https://github.com/tailwindlabs/tailwindcss/
 * blob/main/packages/tailwindcss/preflight.css) as a `css()` module,
 * replacing the hand-rolled survivors block global.css carried after the
 * utility exit. The survivors trimmed the sheet to what the site visibly
 * leaned on; this restores the full copy (form-control resets, table
 * collapse, [hidden], placeholder color, the datetime pseudo-elements).
 * One edit, forced by the medium: the `--theme(...)` build directives
 * resolve to their fallback chains — the default sans/mono stacks and
 * `normal` feature/variation settings, since no theme indirection exists
 * in plain CSS. The body wraps in `@layer base`: the layouts' site-head
 * tag opens with `@layer base, hella;`, so base ranks below both the
 * registry's hella layer and unlayered site CSS — the preflight can never
 * override the components it sits under. The survivors block's
 * site-specific tail moves with the conversion (html color-scheme +
 * scrollbar paint, body tokens fill + Mulish) and follows the copy — no
 * shared properties, order is documentation only. Consumed through
 * `cssText()` by both layouts, which import it first so its registration
 * leads the head deterministically; side-effect import, no exports.
 */
import { css } from "@hellajs/css";

const SANS = [
  "-apple-system",
  "BlinkMacSystemFont",
  "'Segoe UI'",
  "Roboto",
  "'Helvetica Neue'",
  "'Noto Sans'",
  "Arial",
  "sans-serif",
  "'Apple Color Emoji'",
  "'Segoe UI Emoji'",
  "'Segoe UI Symbol'",
  "'Noto Color Emoji'",
];

const MONO =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

css({
  "@layer base": {
    // Prevent padding and border from affecting element width; remove
    // default margins and padding; reset all borders.
    "*, ::after, ::before, ::backdrop, ::file-selector-button": {
      boxSizing: "border-box",
      margin: "0",
      padding: "0",
      border: "0 solid",
    },

    // Consistent line-height; no iOS font-size adjustment on orientation
    // change; readable tab size; default sans stack with normal
    // feature/variation settings; no iOS tap highlight.
    "html, :host": {
      lineHeight: 1.5,
      WebkitTextSizeAdjust: "100%",
      tabSize: "4",
      fontFamily: SANS,
      fontFeatureSettings: "normal",
      fontVariationSettings: "normal",
      WebkitTapHighlightColor: "transparent",
    },

    // Correct height and border-color inheritance in Firefox; reset the
    // top border to 1px.
    hr: {
      height: "0",
      color: "inherit",
      borderTopWidth: "1px",
    },

    // Correct text decoration in Chrome, Edge, and Safari.
    "abbr:where([title])": {
      WebkitTextDecoration: "underline dotted",
      textDecoration: "underline dotted",
    },

    // Remove the default font size and weight for headings.
    "h1, h2, h3, h4, h5, h6": {
      fontSize: "inherit",
      fontWeight: "inherit",
    },

    // Reset links to optimize for opt-in styling instead of opt-out.
    a: {
      color: "inherit",
      WebkitTextDecoration: "inherit",
      textDecoration: "inherit",
    },

    // Correct font weight in Edge and Safari.
    "b, strong": { fontWeight: "bolder" },

    // Default mono stack with normal feature/variation settings; correct
    // the odd `em` code sizing.
    "code, kbd, samp, pre": {
      fontFamily: MONO,
      fontFeatureSettings: "normal",
      fontVariationSettings: "normal",
      fontSize: "1em",
    },

    small: { fontSize: "80%" },

    // Prevent sub/sup from affecting the line height.
    "sub, sup": {
      fontSize: "75%",
      lineHeight: "0",
      position: "relative",
      verticalAlign: "baseline",
    },
    sub: { bottom: "-0.25em" },
    sup: { top: "-0.5em" },

    // No text indentation in table cells; inherit border color; collapse
    // border gaps.
    table: {
      textIndent: "0",
      borderColor: "inherit",
      borderCollapse: "collapse",
    },

    // Modern Firefox focus style for focusable elements.
    ":-moz-focusring:where(:not(iframe))": { outline: "auto" },

    progress: { verticalAlign: "baseline" },

    summary: { display: "list-item" },

    // Lists unstyled by default.
    "ol, ul, menu": { listStyle: "none" },

    // Replaced elements block-level and middle-aligned.
    "img, svg, video, canvas, audio, iframe, embed, object": {
      display: "block",
      verticalAlign: "middle",
    },

    // Constrain media to the parent width, keep the aspect ratio.
    "img, video": {
      maxWidth: "100%",
      height: "auto",
    },

    // Form controls inherit typography; no radius, background, or
    // disabled-opacity dimming.
    "button, input, select, optgroup, textarea, ::file-selector-button": {
      font: "inherit",
      fontFeatureSettings: "inherit",
      fontVariationSettings: "inherit",
      letterSpacing: "inherit",
      color: "inherit",
      borderRadius: "0",
      backgroundColor: "transparent",
      opacity: "1",
    },

    // Restore optgroup weight and indentation in multi-line selects.
    ":where(select:is([multiple], [size])) optgroup": {
      fontWeight: "bolder",
    },
    ":where(select:is([multiple], [size])) optgroup option": {
      paddingInlineStart: "20px",
    },

    // Restore space after the file selector button.
    "::file-selector-button": { marginInlineEnd: "4px" },

    // Full-opacity placeholders; semi-transparent currentcolor where
    // color-mix cannot crash the browser.
    "::placeholder": { opacity: "1" },
    "@supports (not (-webkit-appearance: -apple-pay-button)) or (contain-intrinsic-size: 1px)": {
      "::placeholder": {
        color: "color-mix(in oklab, currentcolor 50%, transparent)",
      },
    },

    textarea: { resize: "vertical" },

    // Chrome/Safari form-control pseudo-element fixes: search decoration,
    // datetime sizing/alignment/padding, calendar indicator, spinners.
    "::-webkit-search-decoration": { WebkitAppearance: "none" },
    "::-webkit-date-and-time-value": {
      minHeight: "1lh",
      textAlign: "inherit",
    },
    "::-webkit-datetime-edit": { display: "inline-flex" },
    "::-webkit-datetime-edit-fields-wrapper": { padding: "0" },
    "::-webkit-datetime-edit, ::-webkit-datetime-edit-year-field, ::-webkit-datetime-edit-month-field, ::-webkit-datetime-edit-day-field, ::-webkit-datetime-edit-hour-field, ::-webkit-datetime-edit-minute-field, ::-webkit-datetime-edit-second-field, ::-webkit-datetime-edit-millisecond-field, ::-webkit-datetime-edit-meridiem-field": {
      paddingBlock: "0",
    },
    "::-webkit-calendar-picker-indicator": { lineHeight: "1" },

    // No Firefox :invalid box-shadow.
    ":-moz-ui-invalid": { boxShadow: "none" },

    // Styleable border radius on iOS Safari buttons.
    "button, input:where([type='button'], [type='reset'], [type='submit']), ::file-selector-button": {
      appearance: "button",
    },

    // Auto-height spin buttons in Safari.
    "::-webkit-inner-spin-button, ::-webkit-outer-spin-button": {
      height: "auto",
    },

    // [hidden] stays hidden, beating any author display rule.
    "[hidden]:where(:not([hidden='until-found']))": {
      display: "none !important",
    },

    // Site overrides — the survivors block's site-specific tail. No shared
    // properties with the copy above; dark color-scheme + scrollbar paint,
    // body tokens fill + Mulish (tokens.ts vocabulary).
    html: {
      colorScheme: "dark",
      scrollbarColor:
        "color-mix(in oklab, var(--foreground) 20%, transparent) var(--base-100)",
    },
    body: {
      backgroundColor: "var(--base-100)",
      color: "var(--foreground)",
      fontFamily: "var(--font-sans)",
    },
  },
});
