# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the HellaJS documentation website. Use serena where possible.

## Overview

This is the documentation website for HellaJS, built with Astro and the Starlight documentation theme. It provides comprehensive guides, tutorials, API documentation, and examples for the HellaJS reactive framework.

## Development Commands

- **Start development server**: `npm run dev` or `bun dev` (runs at http://localhost:4321/)
- **Build for production**: `npm run build` or `bun build`
- **Preview production build**: `npm run preview` or `bun preview`
- **Run Astro CLI**: `npm run astro` or `bun astro`

## Project Structure

### Core Files
- `astro.config.mjs`: Astro configuration with Starlight integration
- `package.json`: Dependencies and scripts
- `src/content.config.ts`: Content collections configuration

### Content Structure
- `src/content/docs/`: All documentation content (MDX files)
  - `index.mdx`: Homepage content
  - `concepts/`: Core concept explanations (reactivity, templates, styling, etc.)
  - `learn/`: Tutorials and guides (quick start, todo tutorial)
  - `packages/`: API documentation for each HellaJS package
  - `plugins.mdx`: Build tool plugins documentation

### Styling
- `src/styles/global.css`: Global styles and Tailwind imports
- `src/tw.ts`: Tailwind CSS configuration utilities
- Uses Tailwind CSS v4 via Vite plugin

### Assets
- `src/assets/`: Images and other static assets
- `public/`: Public assets (favicon, etc.)

## Content Guidelines

### MDX Files
- All documentation uses MDX format (`.mdx` extension)
- Supports JSX components and imports
- Follow Starlight content structure conventions

### Navigation
- Sidebar navigation configured in `astro.config.mjs`
- Auto-generated sections for package documentation
- Manual configuration for concepts and learning sections

### Frontmatter Structure
Each MDX file should include appropriate frontmatter:
```yaml
---
title: Page Title
description: Page description for SEO
---
```

## Content Organization

### Concepts Section
High-level explanations of HellaJS core concepts:
- Reactivity system
- Template syntax
- Styling approaches
- Context API
- Routing

### Learn Section
Step-by-step tutorials and guides:
- Quick start guide
- Todo tutorial
- Real-world application examples

### Packages Section
API documentation for each HellaJS package:
- `@hellajs/core`: signal(), effect(), computed(), batch(), untracked()
- `@hellajs/dom`: mount(), forEach()
- `@hellajs/css`: css(), cssVars()
- `@hellajs/resource`: resource()
- `@hellajs/router`: router(), route(), navigate()
- `@hellajs/store`: store()

## Development Workflow

1. **Content Changes**: Edit MDX files in `src/content/docs/`
2. **Navigation Changes**: Update sidebar in `astro.config.mjs`
3. **Styling Changes**: Modify `src/styles/global.css` or component styles
4. **Configuration**: Update `astro.config.mjs` for site-wide changes

## Dependencies

### Core
- **Astro**: Static site generator
- **Starlight**: Documentation theme
- **Sharp**: Image optimization

### Styling
- **Tailwind CSS v4**: Utility-first CSS framework
- **Tailwind Vite Plugin**: Vite integration for Tailwind
- **Mulish Font**: Variable font for typography

### HellaJS Integration
- Imports HellaJS packages for live examples and demonstrations
- Version-synced with main HellaJS monorepo

## Code Style

- Use MDX for all documentation content
- Follow Starlight conventions for frontmatter and structure
- Use Tailwind classes for custom styling
- Keep content focused and example-driven
- Include interactive demos where possible

## Building and Deployment

The site is built as a static site that can be deployed to any static hosting provider:
- Build output goes to `dist/` directory
- All assets are optimized and hashed
- SEO metadata is generated automatically
- Sitemap and RSS feeds are created

## Content Writing Guidelines

- Write clear, concise explanations
- Include practical examples for all concepts
- Use consistent terminology with the main framework
- Provide both basic and advanced usage examples
- Link between related concepts and APIs