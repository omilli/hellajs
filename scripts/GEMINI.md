# Scripts Instructions

Follow these instructions when working in this monorepo sub-folder. This folder contains scripts for development and publishing.

## Scripts
- **`bundle.mjs`** - Compiles packages in dependency order, and plugins.
- **`release.mjs`** - Handles versioning and publishing of packages.
- **`sync.mjs`** - Synchronizes LLM instructions.
- **`clean.mjs`** - Cleans build artifacts.
- **`validate.mjs`** - Validates the monorepo before publishing.
- **`badges.mjs`** - Updates bundle size badges in README files.

## Versioning
Changesets using a 0.x.x versioning scheme for all packages.

## Publishing
The core package is a peer dependency for all other packages. When publishing, ensure that the core package is published first and that all other packages are updated to use the latest version. for example, if the core package is updated to 0.2.0, all other packages should be updated to use 0.2.0 as their peer dependency, even when publishing simultaneously.