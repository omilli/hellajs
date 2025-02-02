# DOM API Reference

## Index

- [render(hellaElement, rootSelector?)](#rendernode-rootselector)
  - [Parameters](#parameters)
  - [Examples](#examples)
- [html](#html)
  - [Usage](#usage)
  - [Examples](#examples-1)

## render(hellaElement, rootSelector?)

Renders a Hella element or component to the DOM.

### Parameters

- `node`: A Hella element or component function that returns a Hella element
- `rootSelector`: Optional CSS selector string for the mount point

### Examples

```typescript
// Render element to body
render(html.div(["Hello World"]), "body");

// Render component
const App = () => html.div(["My App"]);
render(App);

// Render with mount point
render(html.div(["Content"]), "#app");

// Dynamic rendering
render(() => html.div([count()]));
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
    main([props.children]),
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
