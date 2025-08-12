---
applyTo: "**"
---

# Copilot

Instructions for Copilot when working with this repository.

## Scripts Overview

This directory contains build and publishing scripts for the HellaJS monorepo.

### Build Scripts
- **`bundle.mjs`** - Main build script that compiles all packages in dependency order
- **`global.mjs`** - Post-processes IIFE global bundles for browser usage  
- **`happydom.js`** - Test environment setup with HappyDOM

### Publishing Scripts (Changesets Integration)
- **`changeset-publish.mjs`** - Handles peer dependency updates and testing for changeset workflow
- **`changeset-dry-run.mjs`** - Comprehensive dry run analysis for publishing workflow

### Other Scripts
- **`sync-instructions.mjs`** - Synchronizes LLM instructions

## Usage

### Development
```bash
bun bundle [package-name]      # Build specific package
bun bundle --all              # Build all packages
bun check                     # Build and test all packages
```

### Publishing (via Changesets)
```bash
bun changeset                 # Create a new changeset
bun run changeset:version     # Version packages (creates PR)
bun run changeset:publish     # Publish packages (run in CI)
```

### Key Features
- **Peer Dependency Management**: Automatically updates `@hellajs/core` dependencies when core version changes
- **Plugin Dependencies**: Updates babel plugin dependencies in rollup/vite plugins
- **Testing Integration**: Runs package-specific tests before publishing
- **Provenance**: All packages published with npm provenance attestations
- **0.x.x Versioning**: Properly configured for pre-1.0 release cycle

## Workflow
1. Make code changes
2. Run `bun changeset` to describe changes  
3. Commit changeset files
4. Push - GitHub Actions will create release PR
5. Merge PR - packages are automatically published

The old manual `scripts/publish.mjs` has been removed in favor of the integrated changesets workflow.