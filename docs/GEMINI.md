# Gemini

This file provides guidance to Gemini when working with the HellaJS documentation website. Use Serena for file operations.

## Overview

Documentation website for HellaJS built with Astro and Starlight theme.

## Development Commands

- **Start dev server**: `bun dev` (http://localhost:4321/)
- **Build**: `bun build`
- **Preview**: `bun preview`

## Project Structure

### Key Files
- `astro.config.mjs`: Astro/Starlight configuration
- `src/content.config.ts`: Content collections config
- `src/styles/global.css`: Global styles and Tailwind imports

### Content Structure
- `src/content/docs/`: All documentation (MDX files)
  - `concepts/`: Core explanations (reactivity, templates, styling, context, routing)
  - `learn/`: Tutorials (quick start, todo tutorial)
  - `packages/`: API docs for each package

## Content Organization

### Packages API Reference
- `@hellajs/core`: signal(), effect(), computed(), batch(), untracked()
- `@hellajs/dom`: mount(), forEach()
- `@hellajs/css`: css(), cssVars()
- `@hellajs/resource`: resource()
- `@hellajs/router`: router(), route(), navigate()
- `@hellajs/store`: store()

## Development Workflow

1. **Content**: Edit MDX files in `src/content/docs/`
2. **Navigation**: Update sidebar in `astro.config.mjs`
3. **Styling**: Modify `src/styles/global.css`

## MDX Guidelines

All content uses MDX format with required frontmatter:
```yaml
---
title: Page Title
description: Page description for SEO
---
```

### Content Rules
- Keep explanations clear and concise
- Include practical examples
- Use consistent HellaJS terminology
- Link related concepts
- Focus on actionable guidance

## Technical Stack

- **Astro**: Static site generator
- **Starlight**: Documentation theme
- **Tailwind CSS v4**: Styling framework
- **Sharp**: Image optimization

## Build Output

Static site built to `dist/` with optimized assets, SEO metadata, and sitemap generation.