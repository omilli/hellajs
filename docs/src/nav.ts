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
      "Tutorials": [
        "Auth-Dashboard",
        "Blog",
        "Counter",
        "Task-Manager",
        "Theme-Switcher",
        "Todo",
      ],
    }
  ],
  reference: [
    { core: ["batch", "computed", "effect", "signal", "scope", "untracked"] },
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
    { css: ["css", "cssRemove", "cssReset", "cssVars", "cssVarsReset"] },
    { store: ["store"] },
    { router: ["navigate", "route", "router"] },
    { resource: ["resource", "resourcecache"] },
  ],
  plugins: ["babel", "rollup", "vite"],
} as const;