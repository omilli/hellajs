---
applyTo: "docs/**"
---

# Claude Code Documentation Instructions

You are an expert technical writer and developer working on the HellaJS documentation site. This site showcases a modern reactive JavaScript framework with comprehensive documentation for developers.

## Project Context

HellaJS is a reactive JavaScript framework built on fine-grained reactivity with signals, effects, and computed values. The documentation covers core concepts, API references, tutorials, migration guides, and build tool integrations.

## Tech Stack

- **Astro v5** - Static site generator with component islands
  - Astro Icon v1 - Icon system integration
  - Astro Pagefind v1 - Search functionality
- **Tailwind v4** - Utility-first CSS framework
- **Daisy UI v5** - Component library built on Tailwind
- **Iconify v3** - Icon library with PhosphorIcons
- **TypeIt v8** - Typewriter animation effects
- **MDX** - Markdown with JSX components

## File Structure

```
docs/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── CodeExample.mdx  # Code demonstration component
│   │   ├── NavItem.astro    # Navigation item component
│   │   ├── Navbar.astro     # Main navigation bar
│   │   ├── RightSidebar.astro # Table of contents sidebar
│   │   └── Sidebar.astro    # Main sidebar navigation
│   ├── layouts/             # Page layout templates
│   │   ├── LandingLayout.astro # Homepage layout
│   │   └── MainLayout.astro    # Documentation page layout
│   ├── pages/               # Content pages (MDX format)
│   │   ├── index.astro      # Homepage
│   │   ├── learn/           # Learning materials
│   │   │   ├── index.mdx    # Learning hub overview
│   │   │   ├── quick-start.mdx # Getting started guide
│   │   │   ├── concepts/    # Core framework concepts
│   │   │   │   ├── reactivity.mdx # Signal-based reactivity
│   │   │   │   ├── templates.mdx  # JSX templates
│   │   │   │   ├── state.mdx      # State management
│   │   │   │   ├── styling.mdx    # CSS-in-JS system
│   │   │   │   ├── routing.mdx    # Client-side routing
│   │   │   │   └── resources.mdx  # Data fetching
│   │   │   ├── tutorials/   # Step-by-step guides
│   │   │   │   ├── counter-app.mdx # Basic counter tutorial
│   │   │   │   └── todo-app.mdx    # Todo list tutorial
│   │   │   └── migrating/   # Framework migration guides
│   │   │       ├── react.mdx   # From React
│   │   │       ├── vue.mdx     # From Vue
│   │   │       ├── solid.mdx   # From SolidJS
│   │   │       ├── angular.mdx # From Angular
│   │   │       └── svelte.mdx  # From Svelte
│   │   ├── reference/       # API documentation
│   │   │   ├── index.mdx    # API overview
│   │   │   ├── core/        # Core primitives API
│   │   │   │   ├── batch.mdx      # Batching updates
│   │   │   │   ├── computed.mdx   # Computed values
│   │   │   │   ├── effect.mdx     # Side effects
│   │   │   │   ├── signal.mdx     # Reactive signals
│   │   │   │   └── untracked.mdx  # Untracked execution
│   │   │   ├── css/         # CSS-in-JS API
│   │   │   │   ├── css.mdx     # CSS function
│   │   │   │   └── cssvars.mdx # CSS variables
│   │   │   ├── dom/         # DOM utilities API
│   │   │   │   ├── foreach.mdx # List rendering
│   │   │   │   └── mount.mdx   # Component mounting
│   │   │   ├── resource/    # Data fetching API
│   │   │   │   └── resource.mdx # Resource primitive
│   │   │   ├── router/      # Routing API
│   │   │   │   ├── navigate.mdx # Navigation utilities
│   │   │   │   ├── route.mdx    # Route definitions
│   │   │   │   └── router.mdx   # Router setup
│   │   │   └── store/       # State management API
│   │   │       └── store.mdx # Global store
│   │   └── plugins/         # Build tool integrations
│   │       ├── index.mdx    # Plugin overview
│   │       ├── babel.mdx    # Babel plugin
│   │       ├── rollup.mdx   # Rollup plugin
│   │       └── vite.mdx     # Vite plugin
│   ├── types/               # TypeScript definitions
│   │   └── navigation.ts    # Navigation type definitions
│   ├── nav.ts               # Site navigation structure
│   └── global.css           # Global styles and CSS variables
├── public/                  # Static assets
│   ├── favicon.svg          # Site favicon
│   └── llms.txt             # LLM instructions
├── astro.config.mjs         # Astro configuration
├── package.json             # Project dependencies
├── tsconfig.json            # TypeScript configuration
└── bun.lock                 # Bun lockfile
```

## Content Guidelines

### Writing Style
- Use clear, concise language without jargon or hyperbole
- Write in an active, instructional tone when possible
- Focus on practical, actionable information
- Keep explanations progressive - simple concepts first, complexity later

### Documentation Standards
- **Never make implementation assumptions** - always test your theories
- Include **simple, concise practical code examples** that work
- Follow **consistent formatting and section/heading order**
- Use frontmatter with proper title, description, and layout
- Structure API docs consistently: description → API signature → parameters → examples

### Code Examples
- Use TypeScript for all code examples
- Include realistic, working examples that users can copy-paste
- Show both basic and advanced usage patterns
- Demonstrate error handling and edge cases where relevant
- Use consistent variable names and patterns across examples

### Visual Elements
- Use Daisy UI alert components for callouts and important information
- Include Iconify icons (primarily PhosphorIcons) for visual hierarchy
- Use proper semantic HTML structure for accessibility
- Leverage Tailwind classes for consistent spacing and typography

## Component Patterns

### Page Structure (MDX)
```mdx
---
title: Clear, descriptive title
description: Brief, SEO-friendly description (under 160 chars)
layout: ../../../layouts/MainLayout.astro
---

# Main Heading

Brief introduction paragraph explaining what this covers.

## Section Heading

Content with examples...

### Subsection

More specific content...
```

### Code Examples
```mdx
## API

```typescript
function signal<T>(initialValue?: T): Signal<T>
```

- `initialValue`: Optional initial value
- **Returns**: Signal function for reading/writing

## Example

```typescript
import { signal } from '@hellajs/core';

const count = signal(0);
console.log(count()); // 0

count(42);
console.log(count()); // 42
```

### Alert/Callout Components
```mdx
<div role="alert" class="alert alert-info alert-soft text-base">
  <Icon name="ph:info" width={24} height={24} />
  <span>Important information or tips for users.</span>
</div>
```

### Navigation Structure
The `nav.ts` file defines the site structure:
- **learn**: Tutorials, concepts, and migration guides
- **reference**: Complete API documentation for all packages
- **plugins**: Build tool integration documentation

## Development Workflow

### Local Development
```bash
cd docs
bun install
bun dev
```

### Content Creation
1. Create new MDX files in appropriate directories
2. Add proper frontmatter with title, description, and layout
3. Follow established patterns for headings and code examples
4. Update `nav.ts` if adding new sections
5. Test locally before committing

### Navigation Updates
When adding new pages, update the navigation structure in `src/nav.ts`:

```typescript
export const navigation = {
  learn: [
    // Learning content structure
  ],
  reference: [
    // API reference structure
  ],
  plugins: [
    // Plugin documentation
  ],
} as const;
```

## Best Practices

### Content Organization
- Group related concepts together logically
- Progress from simple to complex topics
- Cross-reference related sections appropriately
- Maintain consistent depth and detail levels

### Technical Accuracy
- All code examples must be tested and functional
- Keep examples up-to-date with current API
- Include proper error handling in examples
- Show realistic use cases, not just toy examples

### User Experience
- Provide clear navigation paths
- Include practical examples users can immediately apply
- Explain the "why" behind API design decisions
- Address common pitfalls and gotchas

### Performance
- Optimize images and assets
- Use Astro's static generation efficiently
- Minimize client-side JavaScript
- Leverage component islands for interactive elements

## Maintenance

### Regular Updates
- Keep dependencies updated
- Review and update code examples
- Ensure links remain functional
- Update migration guides as frameworks evolve

### Quality Assurance
- Test all code examples regularly
- Validate HTML and accessibility
- Check cross-browser compatibility
- Monitor site performance metrics

This documentation site serves as the primary resource for HellaJS developers. Maintain high standards for clarity, accuracy, and usability in all content creation and updates.