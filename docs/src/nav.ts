export const navigation = {
  learn: [
    "Quick-Start",
    {
      Concepts: [
        "Reactivity",
        "Templates",
        "Attribute-Prefixes",
        "Components",
        "Control-Flow",
        "Lifecycle-Hooks",
        "Error-Handling",
        "Reactive-Refs",
        "Custom-Elements",
        "Styling",
        "State",
        "Routing",
        "Resources",
        "ForEach",
        "Lazy-Loading",
        "Portals",
      ],
    },
    {
      Patterns: [
        "Reactivity",
        "Rendering",
        "State",
        "Styling",
        "Routing",
        "Resources",
      ],
    },
    {
      "Tutorials": [
        "Theme-Switcher",
        "Counter",
        "Todo",
        "Blog",
      ],
    }
  ],
  reference: [
    { core: ["batch", "computed", "effect", "signal", "scope", "untracked"] },
    {
      dom: [
        { label: "e:", slug: "e" },
        { label: "error:", slug: "error" },
        { label: "bind:", slug: "bind" },
        { label: "hook:", slug: "hook" },
        { label: "on:", slug: "on" },
        "$collection",
        "$ref",
        "component",
        "element",
        "ForEach",
        "html",
        "Lazy",
        "mount",
        "onError",
        "Portal",
        "registry",
      ]
    },
    { css: ["css", "cssRemove", "cssReset", "cssVars", "cssVarsReset"] },
    { store: ["store"] },
    { router: ["navigate", "route", "router"] },
    { resource: ["resource", "resourcecache"] },
  ],
  plugins: ["babel", "rollup", "vite"],
} as const;