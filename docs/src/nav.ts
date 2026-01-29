export const navigation = {
  learn: [
    "Quick-Start",
    {
      "Tutorials": [
        "Counter-App",
        "Todo-App",
      ],
    },
    {
      Concepts: [
        "Reactivity",
        "Templates",
        "State",
        "Styling",
        "Routing",
        "Resources",
      ],
    },
  ],
  reference: [
    { core: ["batch", "computed", "effect", "signal", "scope", "untracked"] },
    { css: ["css", "cssRemove", "cssReset", "cssVars", "cssVarsReset"] },
    { dom: [
  { label: "on:", slug: "on" },
  { label: "e:", slug: "e" },
  { label: "bind:", slug: "bind" },
  { label: "hook:", slug: "hook" },
  "$collection",
  "$ref",
  "component",
  "element",
  "ForEach",
  "html",
  "Lazy",
  "mount",
  "Portal",
  "registry",
] },
    { resource: ["resource", "resourcecache"] },
    { router: ["navigate", "route", "router"] },
    { store: ["store"] },
  ],
  plugins: ["babel", "rollup", "vite"],
} as const;