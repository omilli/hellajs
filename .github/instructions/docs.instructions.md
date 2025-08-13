---
applyTo: "**"
---

# Instructions 

Follow these instructions when working in this monorepo sub-folder. This app is the documentation website for HellaJS, it's built with Astro, Tailwind and the Starlight theme.

## Key Structure
- `astro.config.mjs`: Astro/Starlight configuration
- `src/content.config.ts`: Content collections config
- `src/styles/global.css`: Global styles and Tailwind imports
- `src/content/docs/`: All documentation (MDX files)
  - `concepts/`: Core explanations (reactivity, templates, styling, context, routing)
  - `learn/`: Tutorials (quick start, todo tutorial)
  - `packages/`: API docs for each package
  - `plugins/`: Plugin documentation

## Commands

- **Dev**: `bun dev` (http://localhost:4321/)
- **Build**: `bun build`
- **Preview**: `bun preview`

### Content Rules
- Reference src code from the root `/packages` folder
- Keep explanations clear and concise
- Include practical examples
- Use consistent HellaJS terminology
- Focus on actionable guidance
- Avoid unnecessary jargon