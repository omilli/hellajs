# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Before Answering
- Analyze the question using agent-selector to determine the most appropriate sub-agent.
- Split tasks between sub-agents based on their strengths.
- Always use Serena for file system operations.

## KISS Principle

Keep It Simple, Stupid—solutions should be straightforward and uncomplicated. Avoid over-engineering and unnecessary complexity to ensure code remains readable and maintainable.

## YAGNI Principle

You Aren't Gonna Need It—implement only what is currently required. Avoid adding speculative features to reduce code bloat and maintenance overhead.

## Overview

HellaJS is a reactive client-side framework for building web interfaces.

## Architecture

A monorepo structure primarily using bun over npm.

### File Organization

- **/docs**: Astro Docs Website
- **/examples**: Example Apps
- **/packages**: Framework Packages
- **/plugins**: JSX Plugins
- **/scripts**: Bundle & Publish Scripts
- **/tests**: Unit & Integration Tests

### Packages

- **@hellajs/core**: Reactive Primitives
- **@hellajs/dom**: Granular DOM Manipulation
- **@hellajs/css**: CSS-in-JS
- **@hellajs/resource**: Reactive Data Fetching
- **@hellajs/router**: Rective Client-side Routing
- **@hellajs/store**: Reactive State Management

#### Key Package Files
- `/lib`: Source Code
- `/dist`: Built files
- `README.md`: Documentation

### JSX Plugins
- babel-plugin-hellajs
- rollup-plugin-hellajs
- vite-plugin-hellajs

### Examples
- **bench**: Krausest Benchmark App
- **text-image**: Text to Image App

## Development Commands

- **Build all packages**: `bun bundle --all` (builds in dependency order: core → css → dom → store → router → resource)
- **Build single package**: `bun bundle <package-name>` (e.g., `bun bundle core`)
- **Run tests**: `bun test` (uses Bun test runner)
- **Run tests with coverage**: `bun coverage`
- **Check (build + test)**: `bun check`
- **Lint**: `bun lint` (uses Biome)`
- **Format**: `bun format` (uses Biome with `--write`)

### Publishing Commands

- **Dry run release**: `bun run release:dry` (shows what would be published without making changes)
- **Create changeset**: `bun run changeset` (interactive prompt to document changes)
- **Version packages**: `bun run changeset:version` (applies changesets and updates versions with peer dep management)
- **Publish packages**: `bun run changeset:publish` (builds, tests, and publishes to npm with peer dependency management)
- **Check changeset status**: `bun run changeset:status` (shows which packages have changesets)
- **Release workflow**: Automated via GitHub Actions on push to master with changesets

## Build System

`core` must be built first as other packages depend on it.

### Bundle Output (per package)
Minified, optimized for Node 18+ and modern browsers (Chrome 91+, Safari 14+, Firefox 89+).

- Single ESM bundle
- TypeScript declarations
- Source Maps

## Testing

Uses Bun test runner with HappyDOM for DOM simulation. Test files use `.test.js` extension and must be placed in the `/tests` directory. You must build the packages before running tests to ensure the latest code is used.