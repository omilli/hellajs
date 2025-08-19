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
    { core: ["signal", "computed", "effect", "batch", "untracked"] },
    { css: ["css", "cssVars"] },
    { dom: ["mount", "forEach"] },
    { resource: ["resource"] },
    { router: ["router", "route", "navigate"] },
    { store: ["store"] },

  ],
  plugins: ["vite", "rollup", "babel"],
} as const;