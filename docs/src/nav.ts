export const navigation = {
  learn: [
    "Overview",
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
    {
      Migrating: [
        "React",
        "Vue",
        "Solid",
        "Angular",
        "Svelte",
      ],
    }
  ],
  reference: [
    "Overview",
    { core: ["batch", "computed", "effect", "signal", "untracked"] },
    { css: ["css", "cssVars"] },
    { dom: ["forEach", "mount"] },
    { resource: ["resource"] },
    { router: ["navigate", "route", "router"] },
    { store: ["store"] },
  ],
  plugins: ["babel", "rollup", "vite"],
} as const;