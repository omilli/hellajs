/**
 * Shared chrome menu vocabulary: the nav/toc item link look and the list
 * reset every chrome menu surface uses. The item look re-declares the
 * registry sidebar css vocabulary it was composed from (packages/ui/
 * registry/sidebar/sidebar-css.ts: menu, menuItem, menuButton sm, groupLabel,
 * menuSub) under site-owned class names, speaking the same `--sidebar-*`
 * token vocabulary tokens.ts overrides — the registry's built output keeps
 * style constants module-private (only component functions export), so a
 * static nav cannot import them; the copies are docs-owned and the registry
 * file stays the reference implementation (drift is manual).
 *
 * Shared (DocsNav, NavNode, and Toc render these classes; no single markup
 * owner), so it lives in styles/ and each consumer imports it for side
 * effect — registration dedups by text identity, so multiple imports of the
 * module and repeated renders register once. `data-active` is the
 * active-route hook, set server-side by the consumers.
 */
import { css } from "@hellajs/css";
import { tokens } from "./tokens";

css({
  // Nav/toc item link — registry sidebar menuButton sm values (cited, see
  // header).
  ".site-menu-link": {
    alignItems: "center",
    borderRadius: `calc(${tokens.radius} * 0.8)`,
    color: tokens.sidebarForeground,
    display: "flex",
    fontSize: "0.875rem",
    gap: "0.5rem",
    height: "2rem",
    minWidth: "0",
    overflow: "hidden",
    padding: "0.5rem",
    textAlign: "left",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    width: "100%",
    "&:hover": {
      backgroundColor: tokens.sidebarAccent,
      color: tokens.sidebarAccentForeground,
    },
    "&:focus-visible": {
      boxShadow: `0 0 0 2px ${tokens.sidebarRing}`,
    },
    "&[data-active='true']": {
      backgroundColor: tokens.sidebarAccent,
      color: tokens.sidebarAccentForeground,
      fontWeight: "500",
    },
  },

  // List reset shared by every chrome menu surface (the daisy/tailwind
  // era's preflight owned it; explicit so the chrome survives unit 11).
  ".site-menu, .toc-mobile ul, .toc-rail ul": {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
    listStyle: "none",
    margin: "0",
    minWidth: "0",
    padding: "0",
    width: "100%",
  },
});
