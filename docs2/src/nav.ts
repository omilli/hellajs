export const navigation = {
  learn: [
    "installation",
    {
      "tutorials": [
        "counter-app",
        "todo-app",
      ],
    },
    {
      concepts: [
        "reactivity",
        "templating",
        "components",
        "styling",
        "state",
        "context",
        "routing",
        "resources",
        "performance",
        "testing",
        "architecture",
      ],
    },
    {
      migration: [
        "from-react",
        "from-vue",
        "from-solid",
        "from-angular",
        "from-svelte",
      ],
    },
    {
      internals: [
        "reactive-graph",
        "granular-dom",
        "cleanup",
      ],
    },
  ],
  reference: [
    { core: ["signal", "computed", "effect", "batch", "untracked"] },
    { dom: ["mount", "forEach"] },
    { store: ["store"] },
    { resource: ["resource"] },
    { router: ["router", "route", "navigate"] },
    { css: ["css", "cssVars"] },
  ],
  plugins: ["vite", "rollup", "babel"],
} as const;