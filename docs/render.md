# Render

## Table of Contents

- [Overview](#overview)
  - [HellaElement](#hellaelement)
- [API](#apis)
  - [render](#render)
  - [html](#html)
- [Technical Details](#technical-details)
  - [DOM Diffing](#dom-diffing)
  - [Event Delegation](#event-delegation)
  - [Security](#security)
  - [Performance](#performance)

## Overview

The render system provides a lightweight virtual DOM-like approach to creating and updating DOM elements reactively. It uses intelligent diffing and event delegation to minimize DOM operations and memory usage.

### HellaElement

A plain object representation of DOM elements with reactive capabilities:

```typescript
interface HellaElement {
  tag: string; // HTML tag name
  classes?: ClassValue; // String, object or function
  content?: HNodeChildren; // String, number, element or array
  data?: Record<string, string>; // Data attributes
  onRender?: (el: HTMLElement) => void; // Lifecycle hook
  [key: string]: any; // Other HTML attributes
}
```

## APIs

### render(hellaElement, rootSelector?)

Core rendering function that handles both static and reactive elements.

```typescript
// Static element
render(
  {
    tag: "div",
    content: "Hello",
  },
  "#app"
);

// Reactive element
render(
  () => ({
    tag: "div",
    classes: { "has-count": count() > 0 },
    content: () => count(),
  }),
  "#app"
);
```

### html

Proxy-based HTML tag functions for ergonomic element creation. returns a typed `HTMLElement`

```typescript
// Tag functions
html.div("Content");

// Destructured usage
const { div, p, button } = html;

// Content only
const content = div("Click Me");

// Content Array
const fooBar = div(["Foo", "Bar"]);

// Props and content
const btn = button(
  {
    classes "btn",
    onclick: () => alert(fooBar.innerHTML),
  },
  content
);

// Fragment shorthand
const { $ } = html;
$([fooBar, btn]);

// Tag functions are typed
// html.div = HTMLDivElement;
// html.button = HTMLButtonElement;
// etc...
```

### Lifecycle Hooks

Elements can use lifecycle hooks for setup and cleanup:

```typescript
render(
  {
    tag: "div",
    onPreRender: () => {
      // Before element creation
    },
    onRender: (element) => {
      // Element is typed to the HTMLElement "tag" property above
      const cleanup = setup(element);
      return () => cleanup(); // On unmount
    },
  },
  "#app"
);
```

## Technical Details

### DOM Diffing

1. **Node Type Comparison**
   - First checks if nodes are of same type (element/text)
   - Different types trigger full node replacement
2. **Attribute Diffing**

   - Removes old attributes
   - Updates changed attributes

3. **Node Reconciliation**
   - Children are diffed using positional comparison
   - Uses DocumentFragment for batch updates
   - Preserves DOM nodes when possible

### Event Delegation

1. **Delegation Process**

   - Events are attached to root elements
   - Event bubbling handles child element events
   - Handlers are looked up using element references
   - Memory-efficient with automatic cleanup

2. **Security**
   - Event handlers are validated against unsafe patterns
   - Dangerous event types are blocked
   - XSS prevention through handler sanitization

### Security Considerations

1. **HTML Sanitization**

   - Blocks dangerous HTML tags like `script`, `iframe`, `object`, and `embed`
   - Prevents XSS attacks through content injection
   - Validates all HTML attributes before rendering
   - Strips malicious content from user-provided strings
   - Enforces strict content sanitization on dynamic updates

2. **URL and Resource Validation**

   - Validates all URLs against allowed protocols (http/https only)
   - Prevents javascript: protocol exploitation
   - Sanitizes href, src, and action attributes
   - Blocks data URIs and other potentially harmful schemes
   - Validates external resource references

3. **Event Handler Protection**

   - Blocks dangerous JavaScript functions like eval() and Function constructor
   - Prevents timer-based exploits (setTimeout/setInterval)
   - Validates event handler source code before attachment
   - Implements event delegation to prevent handler tampering
   - Automatically cleanups handlers to prevent memory leaks

4. **DOM Manipulation Guards**

   - Enforces maximum element nesting depth (prevents stack overflow attacks)
   - Validates all DOM operations before execution
   - Prevents prototype pollution through property validation
   - Sanitizes class names and style attributes
   - Implements safe attribute mutation strategies

5. **Data Attribute Protection**
   - Sanitizes all data-\* attribute values
   - Prevents script injection through custom attributes
   - Validates attribute names against allowed patterns
   - Implements safe attribute update mechanisms
   - Enforces string-only values for data attributes

### Performance Optimizations

1. **Batching**

   - DOM updates are batched using DocumentFragment
   - Attribute updates are grouped
   - Event listeners use delegation

2. **Caching**

   - Event handlers are cached
   - Element references are preserved
   - Text node templates are reused

3. **Memory Management**
   - Automatic event cleanup
   - Dead element detection
   - Resource disposal on unmount
