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
    { core: ["batch", "computed", "effect", "signal", "untracked"] },
    { css: ["css", "cssRemove", "cssReset", "cssVars", "cssVarsReset"] },
    { dom: ["forEach", "mount"] },
    { resource: ["resource", "resourcecache"] },
    { router: ["navigate", "route", "router"] },
    { store: ["store"] },
  ],
  plugins: ["babel", "rollup", "vite"],
} as const;