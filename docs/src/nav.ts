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
        "Attribute-Prefixes",
        "Components",
        "Control-Flow",
        "Advanced-Dom",
        "State",
        "Styling",
        "Routing",
        "Resources",
      ],
    },
    {
      Patterns: [
        "Reactivity",
        "Rendering",
        "State",
        "Styling",
        "Routing",
        "Data",
      ],
    },
    {
      Apps: [
        "Auth-Dashboard",
        "Task-Manager",
        "Theme-Switcher",
        "Blog",
      ],
    },
  ],
  reference: [
    { core: ["batch", "computed", "effect", "signal", "scope", "untracked"] },
    { css: ["css", "cssRemove", "cssReset", "cssVars", "cssVarsReset"] },
    {
      dom: [
        { label: "e:", slug: "e" },
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
    { resource: ["resource", "resourcecache"] },
    { router: ["navigate", "route", "router"] },
    { store: ["store"] },
  ],
  plugins: ["babel", "rollup", "vite"],
} as const;