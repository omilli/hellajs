# DOM Template Caching System

## Overview

The DOM Template Caching System replaces the previous VNode template approach with actual DOM element caching for significantly improved performance in `forEach` loops and other repeated rendering scenarios.

## Key Benefits

1. **True Performance Optimization**: Cache actual DOM elements instead of VNode factory functions
2. **Efficient Cloning**: Use native `cloneNode()` for fast element duplication
3. **Direct Data Binding**: Update cloned elements directly without VNode → DOM conversion
4. **Memory Efficient**: Share template structures across multiple instances
5. **Backward Compatible**: Maintains compatibility with existing forEach patterns

## How It Works

### 1. Template Registration

Templates are registered as DOM element structures with binding information:

```typescript
registerDOMTemplate("user-card", () => {
  // Create the template DOM structure
  const element = document.createElement("div");
  element.className = "user-card";
  
  const name = document.createElement("h3");
  const age = document.createElement("p");
  element.appendChild(name);
  element.appendChild(age);
  
  // Define bindings for dynamic content
  const bindings = [
    {
      type: 'text',
      path: [0], // First child (h3)
      accessor: (ctx) => ctx.user.name
    },
    {
      type: 'text',
      path: [1], // Second child (p)
      accessor: (ctx) => `Age: ${ctx.user.age}`
    }
  ];
  
  return { element, bindings, paramNames: ['user'] };
});
```

### 2. Template Binding

When rendering, templates are cloned and bound with data:

```typescript
const boundElement = bindDOMTemplate("user-card", { 
  user: { name: "Alice", age: 30 } 
});
```

### 3. forEach Integration

The system integrates seamlessly with forEach:

```javascript
forEach(users, (user) => fallbackRender(user), "user-card", ["user"])
```

## Performance Comparison

### Old VNode System
```
forEach iteration:
1. Call template function → Create VNode
2. Call resolveNode → Convert VNode to DOM
3. Apply properties and children
4. Return DOM element
```

### New DOM Template System  
```
forEach iteration:
1. Clone cached DOM template (fast cloneNode)
2. Apply data bindings directly to DOM
3. Return bound DOM element
```

## API Reference

### `registerDOMTemplate(id: string, createTemplate: () => DOMTemplate)`

Registers a DOM template with the given ID.

**Parameters:**
- `id`: Unique identifier for the template
- `createTemplate`: Function that returns the template structure and bindings

### `bindDOMTemplate(id: string, ctx: Record<string, unknown>): HellaElement | null`

Creates a bound DOM element from a registered template.

**Parameters:**
- `id`: Template identifier
- `ctx`: Context object with data for binding

**Returns:** Cloned and bound DOM element, or null if template doesn't exist

### `createTemplateFromVNode(vnode: any, paramNames: string[])`

Helper function to convert VNode structures to DOM templates (used by Babel plugin).

## Binding Types

### Text Binding
Updates the `textContent` of a node:
```typescript
{
  type: 'text',
  path: [0, 1], // Path to target node
  accessor: (ctx) => ctx.user.name
}
```

### Attribute Binding  
Sets an attribute on an element:
```typescript
{
  type: 'attribute', 
  path: [0],
  name: 'data-user-id',
  accessor: (ctx) => ctx.user.id
}
```

### Property Binding
Sets a property on an element:
```typescript
{
  type: 'property',
  path: [0],
  name: 'checked', 
  accessor: (ctx) => ctx.isSelected
}
```

## Babel Plugin Integration

The Babel plugin automatically generates DOM template registrations for JSX in forEach:

```jsx
// Input JSX
forEach(users, (user, index) => (
  <div class="user-card" key={user.id}>
    <h3>{user.name}</h3>
    <p>Age: {user.age}</p>
  </div>
))

// Generated code includes:
registerDOMTemplate("__hellaTemplate_1", () => {
  const result = createTemplateFromVNode(vnodeStructure, ["user", "index"]);
  return {
    element: result.element,
    bindings: result.bindings, 
    paramNames: ["user", "index"]
  };
});
```

## Migration Notes

- **Automatic**: No code changes needed for existing forEach usage
- **Fallback**: Legacy VNode templates still supported as fallback
- **Performance**: Immediate performance improvement for repeated rendering
- **Memory**: Reduced memory allocation in render loops

## File Structure

- `packages/dom/lib/template.ts`: Core DOM template system
- `packages/dom/lib/forEach.ts`: Integration with forEach
- `plugins/babel/index.mjs`: Babel plugin for JSX compilation
- `packages/dom/lib/types/template.ts`: TypeScript interfaces

## Examples

See `tests/dom/dom-template.test.js` for comprehensive usage examples.