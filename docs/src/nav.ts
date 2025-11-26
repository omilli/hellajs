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
    { dom: ["forEach", "html", "mount", "ref"] },
    { resource: ["resource", "resourcecache"] },
    { router: ["navigate", "route", "router"] },
    { store: ["store"] },
  ],
  plugins: ["babel", "rollup", "vite"],
} as const;