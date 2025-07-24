# HellaJS CSS

⮺ [CSS Docs](https://hellajs.com/packages/css)

[![NPM Version](https://img.shields.io/npm/v/@hellajs/css)](https://www.npmjs.com/package/@hellajs/css)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@hellajs/css@latest)](https://bundlephobia.com/package/@hellajs/css)


```bash
npm install @hellajs/css
```
## CSS-in-JS

`@hellajs/css` provides an efficient way to work with stylesheets in JavaScript, offering runtime CSS-in-JS capabilities with resource management.

### Style Generation

When you define styles using the CSS function, the system processes your style objects by:

1. Converting the nested JavaScript object into a flattened CSS structure
2. Generating unique class names for scoped styles
3. Creating a stylesheet with the processed CSS rules
4. Injecting the stylesheet into the document head

The transformation process handles various CSS features including nested selectors, pseudo-classes, media queries, and keyframe animations.

### Style Processing

Behind the scenes, the system employs a sophisticated processing pipeline:

1. Property names are converted from camelCase to kebab-case
2. Special selectors (like &) are resolved with proper context
3. At-rules (@media, @keyframes) are processed with correct nesting
4. Values are properly formatted according to CSS specifications

### Scoping Mechanism

Scoped styles prevent naming collisions. The system accomplishes this by:

1. Generating unique class names when none are provided
2. Applying parent selectors when scoping is enabled
3. Processing nested selectors with proper context

Styles remain isolated and don't interfere with other components, while still allowing intentional global styles when needed.

### CSS Variables

The system offers a CSS variables implementation that:

1. Converts a JavaScript object hierarchy into flattened CSS custom properties
2. Injects these variables at the `:root` level of the document
3. Returns a reference object for use in other styles

Enable theme management and dynamic style updates by changing variables instead of regenerating entire stylesheets.

### Memory Management

A sophisticated reference counting system tracks style usage:

1. Each style definition is cached using a deterministic hash
2. When styles are applied, their reference count increases
3. When styles are removed, their reference count decreases
4. Styles are automatically cleaned up when their reference count reaches zero

Unused styles don't accumulate in the document or memory.

### Stylesheet Organization

The system intelligently manages stylesheet elements:

1. Creating separate stylesheet elements for regular styles and CSS variables
2. Updating stylesheets efficiently when styles change
3. Removing stylesheet elements when they're no longer needed

This approach keeps the document's head clean and organized, avoiding style bloat.
