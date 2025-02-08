xw# DOM API Reference

## Index

- [render(hellaElement, rootSelector?)](#rendernode-rootselector)
  - [Parameters](#parameters)
  - [Examples](#examples)
- [html](#html)
  - [Usage](#usage)
  - [Examples](#examples-1)

## render(hellaElement, rootSelector?)

Renders a Hella element or component to the DOM. A HellaElement is a plain object representation of an HTML element with reactive capabilities.

### Parameters

- `hellaElement`: Element definition object
- `rootSelector`: Optional CSS selector for mount point

### Examples

```typescript
// Basic element
import { render } from "../../lib";

render(
  {
    tag: "div",
    class: "greeting",
    content: "Hello World",
  },
  "#app"
);

// With events and attributes
render(
  {
    tag: "button",
    class: "btn",
    onclick: (e) => console.log("clicked"),
    // convenient data object instead of
    // { "data-id-submit-btn": "submit-btn" }
    data: {
      id: "submit-btn",
      testid: "submit",
    },
    content: "Click me",
  },
  "#app"
);

// Nested elements
render(
  {
    tag: "div",
    class: "card",
    content: [
      {
        tag: "h2",
        content: "Card Title",
      },
      {
        tag: "p",
        content: "Card content",
      },
    ],
  },
  "#app"
);

// Reactive props
const isActive = signal(false);

render(
  () => ({
    tag: "div",
    class: { active: isActive() },
    content: [
      {
        tag: "button",
        id: "toggle",
        onclick: () => isActive.set(!isActive()),
        content: "Toggle Active",
      },
      {
        class: { active: isActive() },
        tag: "p",
        content: `Active: ${isActive()}`,
      },
    ],
  }),
  "#app"
);

// With lifecycle hooks
render(
  {
    tag: "div",
    onRender: (element) => {
      // Called after element is mounted
      const cleanup = setupComponent(element);
      return () => cleanup(); // Called on unmount
    },
    content: ["Dynamic Component"],
  },
  "#app"
);
```

## html

HTML tag functions are created through a Proxy, meaning they are only instantiated when accessed.

You can access tags either through dot notation or object destructuring:

### Examples

```typescript
html.div(["Content"]);

// Destructured components
const { $, div, h1, p, button } = html;

// Basic element
div(["Hello"]);

// Fragment with multiple elements
$([
  h1(["Title"]),
  p(["Content"]),
  button({ onclick: () => alert("clicked") }, ["Click"]),
]);

// Reusable component with destructured tags
const { article, header, main, footer } = html;
const Layout = (props) =>
  article([
    header([props.header]),
    main([props.content]),
    footer([props.footer]),
  ]);

// Dynamic content with destructured tags
const Counter = () => {
  const { button, span } = html;
  return div([
    button({ onclick: decrement }, ["-"]),
    span([() => count()]),
    button({ onclick: increment }, ["+"]),
  ]);
};
```
