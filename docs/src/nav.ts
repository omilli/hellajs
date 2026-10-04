/**
 * Docs navigation tree — the site's authored URL map (unit 09 of the
 * site-foundation set). The data is the pre-existing tree, unchanged: the
 * chrome components (docs/src/chrome/) consume it as pure data — no
 * functions cross this boundary, so the shape stays JSON-serializable.
 *
 * Entry forms:
 * - string — page slug; URL builds as `<section base>/<slug lowercased>`,
 *   display title falls back to the slug's dashes-turned-spaces when no
 *   pages/*.mdx frontmatter title resolves.
 * - { label, slug } — slug entry with an authored display label (labels may
 *   carry characters a folder name cannot, e.g. the `on:` attribute prefix).
 * - { Group: children } — a group heading; children prefix the group's
   folder URL only when that folder holds real pages (learn/concepts),
 *   otherwise they keep the section root (ui's flat component pages).
 */
export type NavLeaf = string | { label: string; slug: string };
export type NavGroup = { [group: string]: NavLeaf[] };
export type NavEntry = NavLeaf | NavGroup;
export type NavSection = "learn" | "reference" | "plugins" | "ui";

/**
 * The chrome-internal resolved shape: the tree after URL construction and
 * frontmatter title lookup, as rendered by DocsNav/NavNode. Both fields are
 * plain data (build-time only — the nav is server-rendered, nothing ships
 * to the client).
 */
export interface NavTreeNode {
  title: string;
  url?: string;
  children?: NavTreeNode[];
}

export const navigation: Record<NavSection, NavEntry[]> = {
  learn: [
    "Quick-Start",
    {
      Concepts: [
        "Reactivity",
        "Templates",
        "Attribute-Prefixes",
        "Components",
        "Control-Flow",
        "Styling",
        "State",
        "Routing",
        "Resources",
        "Error-Handling",
        "Reactive-Refs",
        "Custom-Elements",
        "SSR",
        "Hydration",
        "Headless-Behaviors",
      ],
    },
    {
      Patterns: [
        "Reactivity",
        "Rendering",
        "Styling",
        "State",
        "Routing",
        "Resource",
        "SSR",
        "Testing",
      ],
    },
    {
      "Tutorials": [
        "Counter",
        "Theme-Switcher",
        "Todo",
        "Blog",
        "SSR-Islands",
        "SSR-Routing",
        "SSR-Streaming",
        "Astro-Islands",
      ],
    }
  ],
  reference: [
    { core: ["signal", "signalArray", "signalMap", "signalSet", "computed", "effect", "batch", "scope", "untracked", "flush"] },
    {
      dom: [
        { label: "on:", slug: "on" },
        { label: "e:", slug: "e" },
        { label: "hook:", slug: "hook" },
        { label: "error:", slug: "error" },
        "mount",
        "hydrate",
        "element",
        "html",
        "raw",
        "ForEach",
        "Portal",
        "Lazy",
        "Transition",
        "Suspense",
        "onError",
        "$ref",
        "$collection",
        "component",
        "registry",
        "trapFocus",
        "onEscape",
        "onOutside",
        "rovingTabIndex",
        "anchorPosition",
        "computeAnchorPosition",
        "hoverIntent",
        "menuTypeahead",
        "onDrag",
        "onSwipe",
        "onPinch",
        "onLongPress",
        "onDoubleTap",
        "layerDismissal",
      ]
    },
    { css: ["css", "style", "cva", "cx", "vars", "keyframes", "cssText", "removeCss", "removeStyle", "removeVars", "removeKeyframes", "resetCss", "resetVars"] },
    { store: ["store", "persiststore", "localstorageadaptor", "sessionstorageadaptor"] },
    { router: ["router", "route", "navigate", "href", "resetrouter"] },
    { resource: ["resource", "resourcecache", "resetresource"] },
    { ssr: ["ssr", "doc"] },
  ],
  plugins: ["babel", "rollup", "vite", "astro"],
  ui: [
    { Config: ["Installation", "Theming", "CLI"] },
    { Components: ["Accordion","Alert","Alert-Dialog","Aspect-Ratio","Attachment","Avatar","Badge","Breadcrumb","Bubble","Button","Button-Group","Calendar","Card","Checkbox","Collapsible","Combobox","Command","Context-Menu","Dialog","Direction","Drawer","Dropdown-Menu","Empty","Field","Form","Hover-Card","Input","Input-Group","Input-Otp","Item","Kbd","Label","Marker","Menubar","Message","Message-Scroller","Native-Select","Navigation-Menu","Pagination","Popover","Progress","Radio-Group","Resizable","Scroll-Area","Select","Separator","Sheet","Sidebar","Skeleton","Slider","Sonner","Spinner","Switch","Table","Tabs","Textarea","Toggle","Toggle-Group","Tooltip"] },
  ],
} as const;
