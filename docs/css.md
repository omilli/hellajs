# CSS API Reference

Typesafe CSS

## Index

- [css(styles, config?)](#cssstyles-config)
  - [Parameters](#parameters)
  - [Examples](#examples)
- [globalStyles(styles)](#globalstylesstyles)
  - [Parameters](#parameters-1)
  - [Examples](#examples-1)

## css(styles, config?)

Creates a reactive style definition that can be applied to elements. The function returns a style factory that can be used for both static and dynamic styling.

### Parameters

- `styles`: An object containing CSS properties and values. Supports:

  - Standard CSS properties in camelCase
  - Nested selectors
  - Pseudo-classes and pseudo-elements
  - Media queries and other at-rules
  - Dynamic values using functions

- `config`: Optional configuration object
  - `scope`: Determines how styles are applied
    - `"scoped"` (default): Creates unique, scoped class names
    - `"inline"`: Applies styles directly to element
    - `"global"`: Creates global styles
  - `sizeTo`: Unit for numerical values (default: "px")

### Examples

```typescript
// Basic usage
const buttonStyle = css({
  backgroundColor: "blue",
  color: "white",
  padding: 10, // Automatically converts to px
  ":hover": {
    backgroundColor: "darkblue",
  },
});

// Dynamic styles
const dynamicStyle = css({
  color: () => (isDark() ? "white" : "black"),
  backgroundColor: () => (isDark() ? "black" : "white"),
});

// With configuration
const inlineStyle = css(
  {
    fontSize: 16,
    color: "blue",
  },
  {
    scope: "inline",
    sizeTo: "rem",
  }
);
```

## globalStyles(styles)

Injects global CSS styles into the document. Useful for setting up base styles, themes, or CSS resets.

```typescript
function globalStyles(styles: StyleValue): void;
```

### Parameters

- `styles`: An object containing CSS properties and values. Supports all CSS features including:
  - Global selectors
  - Media queries
  - CSS custom properties
  - At-rules

### Examples

```typescript
// Basic global styles
globalStyles({
  "html, body": {
    margin: 0,
    padding: 0,
    fontFamily: "sans-serif",
  },
});

// Theme variables
globalStyles({
  ":root": {
    "--primary-color": "#007bff",
    "--secondary-color": "#6c757d",
  },
});

// Media queries
globalStyles({
  "@media (prefers-color-scheme: dark)": {
    body: {
      backgroundColor: "#121212",
      color: "#ffffff",
    },
  },
});
```
