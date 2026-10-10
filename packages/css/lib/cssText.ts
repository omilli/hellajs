import { cssTextCss } from "./cssTextCss";
import { cssTextVars } from "./cssTextVars";

/**
 * The `cssText` callable-namespace contract: the base call is the combined
 * collector; the members split the registered text into its two adoptable
 * halves for two-tag server delivery. Each member's full contract lives on
 * this interface.
 */
interface CssTextFn {
  /**
   * Collects the CSS text registered by `css()`, `style()`, `keyframes()`,
   * and `vars()` calls on the default host, in first-registration order (the
   * vars contribution appends after the css-side text — the `hella-vars`
   * sheet mirrors the two-element client model). Statement-leading texts
   * hoist ahead of braced-only texts within that order, so the server
   * `<style>` keeps statements ahead of every rule, mirroring the client's
   * before-braced placement. Each registered text is pretty-printed (one
   * declaration per line, 2-space indentation); separately-registered
   * blocks join with a blank line. A peek, never a drain: repeated calls
   * return the same string until `resetCss()` / `resetVars()` clear the
   * registrations. Identical on both platforms — registration runs without
   * a DOM, so this is the server-side `<style>` source
   * (`<style>${cssText()}</style>`). Host-qualified entries are excluded:
   * their rules live in host sheets (e.g. shadow roots), not
   * `document.head`. Split the contributions into separate adoptable tags
   * with `cssText.css()` / `cssText.vars()`.
   * @returns The joined rule text of all default-host registrations
   */
  (): string;
  /**
   * Collects the css-side contribution — the `css()`, `style()`, and
   * `keyframes()` registrations on the default host, in first-registration
   * order with statement-leading texts hoisted ahead of braced-only ones —
   * for delivery through the `hella-css` tag. Pretty-printed like the
   * combined call; a peek, never a drain; identical on both platforms.
   * Host-qualified entries are excluded: their rules live in host sheets,
   * not `document.head`.
   * @returns The css-side text, `""` when nothing css-side is registered
   */
  css(): string;
  /**
   * Collects the vars contribution — the `vars()` bucket rules on the
   * default host, in registration order, media-wrapped when the bucket's
   * `media` option was set — for delivery through the `hella-vars` tag. A
   * peek, never a drain; identical on both platforms.
   * @returns The vars-side text, `""` when nothing vars-side is registered
   */
  vars(): string;
}

/**
 * Collects the registered CSS text for server-side delivery. Callable
 * namespace: the base call is the combined collector (css side, then vars);
 * `cssText.css()` / `cssText.vars()` split the contributions so each embeds
 * into the `<style>` tag carrying its sheet id. Each member's full contract
 * lives on `CssTextFn`.
 */
export const cssText: CssTextFn = Object.assign(impl, { css: cssTextCss, vars: cssTextVars });

function impl(): string {
  const css = cssTextCss();
  const vars = cssTextVars();
  if (!css) return vars;
  return vars ? `${css}\n\n${vars}` : css;
}
