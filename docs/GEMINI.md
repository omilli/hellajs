# Documentation Instructions

Follow these instructions when working in this monorepo sub-folder. This is the documentation site for HellaJS, built with Astro and Tailwind CSS.

## Structure
- **src/pages/**: Documentation pages (MDX format)
- **src/components/**: Reusable components
- **src/layouts/**: Page layouts

## Content Guidelines

### Writing Style
- Use clear, concise language
- Include practical code examples
- Follow consistent formatting
- Use active voice when possible

## Content Organization

The documentation is organized into main sections:
- **Learn**: Getting started, tutorials, and core concepts
- **Reference**: API documentation for each package
- **Plugins**: Build tool integrations


### API Reference
use the following content structure as a base for all API refrence pages: 
- API
- Typescript
- Basic Usage
- Key Concepts
- Important Considerations
- Use Cases 

When adding new content:
1. Determine the appropriate section
2. Create the MDX file in the correct directory
3. Update navigation in `src/nav.ts`
4. Ensure all links are working
5. Test the content locally before committing