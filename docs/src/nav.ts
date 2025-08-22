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
    { core: ["batch", "computed", "effect", "signal", "untracked"] },
    { css: ["css", "cssVars"] },
    { dom: ["forEach", "mount"] },
    { resource: ["resource"] },
    { router: ["navigate", "route", "router"] },
    { store: ["store"] },
  ],
  plugins: ["babel", "rollup", "vite"],
} as const;