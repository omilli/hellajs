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
        "Templating",
        "Components",
        "Styling",
        "State",
        "Context",
        "Routing",
        "Resources",
        "Performance",
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
    },
    {
      Internals: [
        "Reactive-Graph",
        "Granular-DOM",
        "Cleanup",
      ],
    },
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