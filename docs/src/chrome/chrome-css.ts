/**
 * Site chrome styles (unit 09 of the site-foundation set): left nav shell,
 * mobile drawer mechanics, "On This Page" surfaces, and the main-content
 * layout they impose. The nav/toc item look re-declares the registry
 * sidebar css vocabulary it was composed from (packages/ui/registry/
 * sidebar/sidebar-css.ts: menu, menuItem, menuButton sm, groupLabel,
 * menuSub) under site-owned class names, speaking the same `--sidebar-*`
 * token vocabulary tokens.ts overrides — the registry's built output keeps
 * style constants module-private (only component functions export), so a
 * static nav cannot import them; the copies are docs-owned chrome and the
 * registry file stays the reference implementation (drift is manual).
 *
 * The rest is the layout the registry module has no opinion about: fixed-
 * rail positioning, the zero-JS drawer (checkbox sibling selectors — the
 * pattern the daisyUI drawer used, kept for parity), the content margins
 * the rails require, heading anchor scroll offsets, and the smooth
 * scrolling the old TOC script did in JS.
 *
 * Unit 10 added the top bar (static header + search trigger) and the search
 * palette width; the palette itself is a hydrated island (SearchPalette.tsx)
 * whose skin ships with the registry command module it imports.
 *
 * Collected by the MainLayout head tag via `cssText()` (unit 08 mechanism);
 * imported for side effect by the layout, no exports. Unlayered: site
 * chrome outranks the registry's hella layer by cascade (layers rank below
 * unlayered author CSS) — notably the drawer-open close-icon rule beats
 * the close icon's display:none base rule (site-owned since unit 10; the
 * `hidden` utility it replaced died with unit 11).
 * Rules nest like Sass (set-wide directive): `&` composes state/compound
 * selectors. One structural exception the compiler forces: it substitutes
 * only a LEADING `&`, so the drawer's checkbox-state rules — whose subject
 * is the checkbox state, not a shared prefix — stay top-level keys (each
 * unique; nothing is repeated).
 */
import { css } from "@hellajs/css";
import "../styles/tokens";

/** Left rail / drawer width — the old chrome's w-70. */
const NAV_W = "17.5rem";
/** Right rail clearance — the old chrome's lg:mr-80. */
const TOC_W = "20rem";
/** Fixed navbar height the rails and anchors clear. */
const NAVBAR_H = "4rem";
const LG = "@media (min-width: 64rem)";
/** Mobile band — the complement of LG (tailwind's lg breakpoint). */
const MOBILE = "@media (max-width: 63.99rem)";

css({
  // Smooth in-page anchor jumps — the old TOC script's scrollIntoView.
  html: { scrollBehavior: "smooth" },

  // Anchored headings must not land under the fixed navbar (07 deferred
  // this here: chrome, not prose).
  "main :is(h2, h3, h4, h5, h6)": { scrollMarginTop: "5rem" },

  // Nav/toc item link — registry sidebar menuButton sm values (cited, see
  // header). data-active is the active-route hook, set server-side.
  ".site-menu-link": {
    alignItems: "center",
    borderRadius: "calc(var(--radius) * 0.8)",
    color: "var(--sidebar-foreground)",
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
      backgroundColor: "var(--sidebar-accent)",
      color: "var(--sidebar-accent-foreground)",
    },
    "&:focus-visible": {
      boxShadow: "0 0 0 2px var(--sidebar-ring)",
    },
    "&[data-active='true']": {
      backgroundColor: "var(--sidebar-accent)",
      color: "var(--sidebar-accent-foreground)",
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

  // Left nav: off-canvas drawer on mobile, fixed rail on desktop. Drawer
  // mechanics: the layout's hidden checkbox + Navbar's label[for]; sibling
  // selectors reach the surfaces because every one of them follows the
  // checkbox in body.
  ".site-nav": {
    background: "var(--sidebar)",
    color: "var(--sidebar-foreground)",
    insetBlock: "0",
    left: "0",
    overflowY: "auto",
    position: "fixed",
    transform: "translateX(-100%)",
    transition: "transform 200ms ease",
    width: NAV_W,
    zIndex: "40",
    "& > nav": { paddingBlock: "1rem", paddingInline: "0.5rem" },
    "& details": { marginTop: "0.75rem" },
    [LG]: {
      "&": { transform: "none", top: NAVBAR_H },
    },
  },

  // Drawer open: the checkbox state is the subject (leading-& substitution
  // only — see header), so the sibling rules sit at the top level.
  "#nav-drawer:checked ~ .site-nav": { transform: "none" },

  // Mobile drawer overlay: follows the checkbox like the nav; desktop
  // never shows it (the rail is static there).
  ".nav-overlay": {
    background: "rgb(0 0 0 / 60%)",
    display: "none",
    inset: "0",
    position: "fixed",
    zIndex: "30",
    [LG]: { "&": { display: "none" } },
  },
  "#nav-drawer:checked ~ .nav-overlay": { display: "block" },
  [LG]: {
    "#nav-drawer:checked ~ .nav-overlay": { display: "none" },
  },

  // Hamburger/close swap on the Navbar icons (moved here from the daisy-era
  // global.css rules the deleted Sidebar.astro owned).
  "body:has(#nav-drawer:checked)": {
    "& .sidebar-hamburger": { display: "none" },
    "& .sidebar-close": { display: "block" },
  },

  // Group disclosure row — registry sidebar groupLabel values (cited, see
  // header) plus the pointer/marker behavior a summary needs; the
  // parent-of-active highlight has no registry hook (groupLabel carries no
  // [data-active] rule), so chrome owns it.
  ".site-nav-group-label": {
    alignItems: "center",
    borderRadius: "calc(var(--radius) * 0.8)",
    color: "color-mix(in oklab, var(--sidebar-foreground) 70%, transparent)",
    cursor: "pointer",
    display: "flex",
    flexShrink: "0",
    fontSize: "0.75rem",
    fontWeight: "500",
    height: "2rem",
    lineHeight: "1rem",
    listStyle: "none",
    paddingInline: "0.5rem",
    width: "100%",
    "&::-webkit-details-marker": { display: "none" },
    "&[data-active='true']": { color: "var(--primary)" },
  },

  // Nested group list — registry sidebar menuSub values (cited, see header).
  ".site-nav-sub": {
    borderLeft: "1px solid var(--sidebar-border)",
    marginInline: "0.875rem",
    paddingBlock: "0.125rem",
    paddingInline: "0.625rem",
    translate: "1px",
  },

  // Mobile-only main-nav links list above the section tree; the bottom
  // border is the divider the daisy menu's hr used to draw.
  ".mobile-only": {
    borderBottom: "1px solid var(--sidebar-border)",
    marginBottom: "0.5rem",
    paddingBottom: "0.5rem",
    [LG]: { "&": { display: "none" } },
  },

  // Top bar (unit 10): static server-rendered header — logo, section
  // links (active computed at build, same normalization DocsNav applies),
  // search trigger (opens the palette island), GitHub link, and the drawer
  // toggle. Sections live in the 09 drawer below lg; the trigger collapses
  // to an icon button there. The close-icon base rule replaces the tailwind
  // `hidden` utility the daisy-era markup leaned on (unit 11 removes that
  // layer); the body:has swap below outranks it by specificity.
  ".site-topbar": {
    alignItems: "center",
    background: "var(--base-300)",
    display: "flex",
    gap: "1rem",
    height: NAVBAR_H,
    left: "0",
    paddingInline: "1rem",
    position: "fixed",
    right: "0",
    top: "0",
    zIndex: "50",
    [LG]: { "&": { paddingInline: "1.5rem" } },
  },

  ".site-logo": {
    alignItems: "center",
    borderRadius: "calc(var(--radius) * 0.8)",
    display: "flex",
    flexShrink: "0",
    height: "2.5rem",
    "& img": { height: "2rem", width: "2rem" },
    "&:focus-visible": { boxShadow: "0 0 0 2px var(--ring)" },
  },

  ".site-topbar-links": {
    display: "none",
    gap: "0.25rem",
    [LG]: { "&": { display: "flex" } },
  },

  ".site-topbar-link": {
    alignItems: "center",
    borderRadius: "calc(var(--radius) * 0.8)",
    color: "color-mix(in oklab, var(--foreground) 70%, transparent)",
    display: "flex",
    fontSize: "0.875rem",
    fontWeight: "500",
    height: "2rem",
    paddingInline: "0.75rem",
    "&:hover": {
      backgroundColor: "var(--base-50)",
      color: "var(--foreground)",
    },
    "&:focus-visible": { boxShadow: "0 0 0 2px var(--ring)" },
    "&[data-active='true']": { color: "var(--primary)", fontWeight: "700" },
  },

  ".site-topbar-actions": {
    alignItems: "center",
    display: "flex",
    flex: "1",
    gap: "0.25rem",
    justifyContent: "flex-end",
    marginLeft: "auto",
  },

  // Input-affordance button (opens the palette); ⌘K hint hides with the
  // label below lg. kbd values re-declare the registry kbd module's base
  // (packages/ui/registry/kbd/kbd-css.ts) — static chrome cannot import
  // registry constants (see file header).
  ".site-search-trigger": {
    alignItems: "center",
    background: "var(--base-200)",
    border: "1px solid var(--sidebar-border)",
    borderRadius: "calc(var(--radius) * 0.8)",
    color: "var(--muted-foreground)",
    cursor: "pointer",
    display: "flex",
    fontSize: "0.875rem",
    gap: "0.5rem",
    height: "2.25rem",
    paddingInline: "0.625rem",
    width: "16rem",
    "& svg": { flexShrink: "0", height: "1rem", width: "1rem" },
    "&:hover": { borderColor: "var(--input)", color: "var(--foreground)" },
    "&:focus-visible": { boxShadow: "0 0 0 2px var(--ring)" },
    [MOBILE]: {
      "&": { paddingInline: "0", width: "2.25rem", justifyContent: "center" },
      "& .site-search-label, & .site-search-kbd": { display: "none" },
    },
  },

  ".site-search-kbd": {
    alignItems: "center",
    border: "1px solid var(--border)",
    borderRadius: "calc(var(--radius) * 0.5)",
    color: "var(--muted-foreground)",
    display: "flex",
    fontFamily: "var(--font-sans)",
    fontSize: "0.75rem",
    fontWeight: "500",
    height: "1.25rem",
    justifyContent: "center",
    lineHeight: "1rem",
    marginLeft: "auto",
    paddingInline: "0.25rem",
    pointerEvents: "none",
    userSelect: "none",
  },

  ".site-icon-link": {
    alignItems: "center",
    borderRadius: "calc(var(--radius) * 0.8)",
    color: "color-mix(in oklab, var(--foreground) 70%, transparent)",
    display: "flex",
    height: "2.25rem",
    justifyContent: "center",
    width: "2.25rem",
    "&:hover": {
      backgroundColor: "var(--base-50)",
      color: "var(--foreground)",
    },
    "&:focus-visible": { boxShadow: "0 0 0 2px var(--ring)" },
    "& svg": { height: "1.25rem", width: "1.25rem" },
  },

  ".site-drawer-toggle": {
    alignItems: "center",
    borderRadius: "calc(var(--radius) * 0.8)",
    color: "color-mix(in oklab, var(--foreground) 70%, transparent)",
    cursor: "pointer",
    display: "flex",
    height: "2.25rem",
    justifyContent: "center",
    width: "2.25rem",
    "&:hover": {
      backgroundColor: "var(--base-50)",
      color: "var(--foreground)",
    },
    "&:focus-visible": { boxShadow: "0 0 0 2px var(--ring)" },
    "& svg": { height: "1.25rem", width: "1.25rem" },
    "& .sidebar-close": { display: "none" },
    [LG]: { "&": { display: "none" } },
  },

  // Search palette (unit 10): the dialog panel shrink-wraps its content,
  // so the island's command root carries the width; every other style on
  // it comes from the registry command module the island imports.
  ".site-search-command": {
    width: "min(40rem, calc(100vw - 2rem))",
  },

  // Content column: clear the fixed navbar, the left rail on desktop, and
  // the right rail when the page has one (has-toc set server-side by the
  // layout from the extracted TOC length).
  ".site-main": {
    paddingTop: NAVBAR_H,
    "&.has-toc": {
      [LG]: { "&": { marginRight: TOC_W } },
    },
    "& > main": {
      padding: "1rem",
      [LG]: { "&": { padding: "2rem" } },
    },
    [LG]: { "&": { marginLeft: NAV_W } },
  },

  // Mobile "On This Page": a native details/summary above the content —
  // content is server-rendered, the trigger is the browser's. Surfaces use
  // the same sidebar/accent pairing as the nav (base-300 panel, base-50
  // hover) so the toc reads as the same chrome.
  ".toc-mobile": {
    margin: `calc(${NAVBAR_H} + 1rem) 1rem 0`,
    [LG]: { "&": { display: "none" } },
    "& summary": {
      alignItems: "center",
      background: "var(--sidebar)",
      border: "1px solid var(--sidebar-border)",
      borderRadius: "calc(var(--radius) * 0.8)",
      cursor: "pointer",
      display: "flex",
      fontSize: "0.875rem",
      gap: "0.5rem",
      justifyContent: "space-between",
      listStyle: "none",
      paddingBlock: "0.625rem",
      paddingInline: "1rem",
      "&::-webkit-details-marker": { display: "none" },
    },
    "& .toc-chevron": {
      height: "1rem",
      transition: "transform 150ms ease",
      width: "1rem",
    },
    "&[open] .toc-chevron": { transform: "rotate(180deg)" },
    "& ul": {
      background: "var(--sidebar)",
      border: "1px solid var(--sidebar-border)",
      borderRadius: "calc(var(--radius) * 0.8)",
      marginBlockStart: "0.5rem",
      maxHeight: "calc(100dvh - 12rem)",
      overflowY: "auto",
      padding: "0.5rem",
    },
  },

  // Desktop "On This Page" rail: fixed, right, below the navbar. Hidden
  // entirely (mobile too) when the layout found no h2/h3 — the has-toc
  // margin only pairs with a rendered rail.
  ".toc-rail": {
    bottom: "0",
    display: "none",
    overflowY: "auto",
    position: "fixed",
    right: "0",
    top: NAVBAR_H,
    width: "17.5rem",
    zIndex: "20",
    "& h2": {
      color: "var(--foreground)",
      fontSize: "0.875rem",
      fontWeight: "700",
      marginBottom: "0.5rem",
      paddingInline: "0.5rem",
    },
    [LG]: { "&": { display: "block" } },
  },
});
