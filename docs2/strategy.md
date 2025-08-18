# HellaJS Documentation Content Strategy

## Writing Principles for Progressive Disclosure

### 1. Lead with Value, Not Concepts

**❌ Traditional approach:**
```markdown
## Reactivity System

HellaJS implements a fine-grained reactivity system based on a directed acyclic graph (DAG) that tracks dependencies between reactive primitives...
```

**✅ Progressive disclosure approach:**
```markdown
## Making Things Reactive

Update your UI automatically when data changes:

```jsx
const name = signal('Jane');
const greeting = () => `Hello, ${name()}!`;

name('John'); // UI updates automatically
```

The magic happens through HellaJS's reactivity system...
[Show more about how it works ↓]
```

### 2. Structure Every Page with Progressive Layers

#### Universal Page Template

```markdown
# Page Title

<!-- Layer 1: Immediate Value -->
## Quick Example
[Working code that demonstrates the core value]

<!-- Layer 2: Essential Usage -->
## Basic Usage  
[The 80% use case with clear examples]

<!-- Layer 3: Configuration -->
## Configuration
[Common options and customization]

<!-- Layer 4: Advanced Scenarios -->  
## Advanced Usage
[Complex cases, edge cases, performance considerations]

<!-- Layer 5: Understanding (Optional) -->
## How It Works
[Implementation details for those who want to understand]

<!-- Layer 6: Best Practices -->
## Best Practices
[Do's and don'ts, common pitfalls]

<!-- Layer 7: Related Topics -->
## See Also
[Cross-references to related concepts]
```

### 3. Code-First Documentation

Every concept should be introduced with working code:

**✅ Good progression:**
```markdown
## Creating a Counter

```jsx
const Counter = () => {
  const count = signal(0);
  return <button onclick={() => count(count() + 1)}>{count}</button>;
};
```

This creates a reactive counter. When you click the button:
1. `count(count() + 1)` updates the signal
2. The button text `{count}` updates automatically  
3. No virtual DOM diffing required

### Why This Works
[Deeper explanation for those who want it]
```

### 4. Expandable Sections Strategy

Use collapsible sections to hide complexity:

```markdown
## Basic Resource Usage

```jsx
const user = resource(() => fetch('/api/user').then(r => r.json()));
user.fetch(); // Load the data
```

<details>
<summary>🔍 How resources handle loading states</summary>

Resources automatically track loading, error, and success states:

```jsx
// All these are reactive and update automatically
user.loading()  // true while fetching
user.error()    // error object if failed  
user.data()     // response data when successful
```

</details>

<details>
<summary>⚙️ Advanced resource configuration</summary>

```jsx
const user = resource(
  (id) => fetch(`/api/users/${id}`).then(r => r.json()),
  {
    key: () => userId(),           // Refetch when userId changes
    cacheTime: 5 * 60 * 1000,     // Cache for 5 minutes
    retry: 3,                      // Retry failed requests
    onError: (err) => notify(err)  // Handle errors
  }
);
```

</details>
```

## Content Organization Strategies

### 1. Concept Documentation Pattern

Concepts explain "why" and "when" with illustrative examples:

```markdown
# Concept Name (e.g., "Reactivity")

<!-- The Hook -->
## The Problem
[What pain point does this solve?]

<!-- The Solution -->  
## The HellaJS Approach
```jsx
[Simple example showing the solution]
```

<!-- Understanding Layers -->
## Understanding [Concept]

### The Fundamentals
[Core principles with minimal examples]

### Common Patterns
[How this concept applies in real scenarios]

### Advanced Techniques
[Complex scenarios and optimizations]

### Mental Model
[How to think about this concept]

## When to Use This Approach
- ✅ Good for: [Specific scenarios]
- ❌ Avoid when: [Alternative approaches]

## Common Pitfalls
[What goes wrong and how to avoid it]

## Related Concepts
[Links to related concept pages]

## API References
[Links to relevant API documentation]
```

### 2. API Reference Documentation Pattern

API docs focus on "how" with comprehensive usage examples:

```markdown
# functionName()

## Signature

```typescript
function functionName(param: Type): ReturnType
```

## Quick Example

```jsx
[Minimal working example showing basic usage]
```

## Parameters

### param: Type
[Description of parameter, including optional/required status]

## Return Value

### ReturnType
[Description of what the function returns]

## Usage Examples

### Basic Usage
```jsx
[Simple, common use case]
```

### Advanced Usage
```jsx
[Complex scenario with explanations]
```

### With TypeScript
```tsx
[TypeScript-specific usage patterns]
```

## Performance Considerations
[Performance implications and optimization tips]

## Common Patterns
[Reusable patterns using this API]

## Troubleshooting
[Common issues and solutions]

## Related APIs
[Links to related function documentation]

## Conceptual Background
[Links to relevant concept documentation]
```

### 3. Guide Documentation Pattern

Guides solve specific problems with step-by-step solutions:

```markdown
# Guide Title (e.g., "Building a Todo App")

## What You'll Build
[Brief description and end result]

## Prerequisites
- [Concept links] you should understand
- [API references] you'll use

## Step-by-Step Tutorial

### Step 1: [Action]
[Clear instruction with code example]

### Step 2: [Action]
[Building on previous step]

### Step N: [Final Step]
[Completing the solution]

## Complete Example
[Full working code]

## Next Steps
[What to learn or build next]

## Troubleshooting
[Common issues in this guide]

## Related Guides
[Links to similar problem-solving guides]

### 5. Performance & Testing Guides

Guides focused on performance and testing should provide actionable advice and clear, measurable outcomes.

- **Performance**: Start with a benchmark or a common bottleneck, and walk through the steps to optimize it.
- **Testing**: Provide complete, runnable test cases for different scenarios (unit, integration, e2e).
```

### 4. Cross-Reference Strategy

Create clear connections between concepts, APIs, and guides:

#### From Concept Pages to API Pages
```markdown
## Related APIs

The following functions implement this concept:
- [`signal()`](/api/core/signal) - Create reactive values
- [`computed()`](/api/core/computed) - Derive reactive values  
- [`effect()`](/api/core/effect) - React to value changes

## See in Action
- [Building a Counter Guide](/guides/getting-started/tutorial#counter-example)
- [State Patterns Guide](/guides/patterns/state-patterns)
```

#### From API Pages to Concept Pages
```markdown
## Conceptual Background

**Prerequisites:** Understand [Reactivity](/concepts/reactivity) before using this API.

**Related Concepts:**
- [State Management](/concepts/state-management) - When to use signals vs stores
- [Performance](/concepts/performance) - Optimization considerations

## Usage Guides
- [Building Your First App](/guides/getting-started/tutorial)
- [Advanced State Patterns](/guides/patterns/state-patterns)
```

#### From Guides to Both
```markdown
## What You'll Learn

**Concepts:** You'll understand [Reactivity](/concepts/reactivity) and [State Management](/concepts/state-management)

**APIs:** You'll use [`signal()`](/api/core/signal), [`computed()`](/api/core/computed), and [`mount()`](/api/dom/mount)

## Next Steps
- **Concepts:** Learn about [Performance Optimization](/concepts/performance)
- **APIs:** Explore [`effect()`](/api/core/effect) for side effects
- **Guides:** Try [Building a Real App](/guides/patterns/real-world-app)
```

### 4. Example Quality Standards

All examples should be:

1. **Runnable**: Can be copied and pasted to work immediately
2. **Focused**: Show one concept at a time  
3. **Realistic**: Solve actual problems developers face
4. **Progressive**: Build from simple to complex

**✅ Good example:**
```jsx
// User profile that updates when ID changes
const UserProfile = () => {
  const userId = signal(1);
  const user = resource(() => 
    fetch(`/api/users/${userId()}`).then(r => r.json())
  );
  
  return (
    <div>
      <button onclick={() => userId(userId() + 1)}>Next User</button>
      <Show when={user.loading()}>Loading...</Show>
      <Show when={user.data()}>
        <h2>{user.data().name}</h2>
      </Show>
    </div>
  );
};
```

## Tone and Voice Guidelines

### 1. Conversational but Precise

**❌ Too academic:**
> "The reactive system employs a directed acyclic graph to maintain referential transparency while optimizing update propagation."

**✅ Conversational:**
> "HellaJS tracks which parts of your UI depend on which data. When data changes, only the affected parts update automatically."

### 2. Confident but Humble

**❌ Overselling:**
> "HellaJS is the fastest, most powerful framework ever created."

**✅ Honest positioning:**
> "HellaJS prioritizes simplicity and performance. It's fast, lightweight, and designed to feel familiar if you know React."

### 3. Helpful Problem-Solving Focus

**❌ Feature-focused:**
> "The resource primitive includes caching, retry logic, and error handling."

**✅ Problem-solving focused:**
> "Loading data from APIs? Resources handle the loading states, errors, and caching so you don't have to."

## Visual Hierarchy

### 1. Use Consistent Symbols

- 🚀 Getting Started
- 💡 Key Concept  
- ⚡ Performance
- 🐛 Debugging
- ✅ Best Practice
- ❌ Anti-Pattern
- 🔍 Deep Dive
- 💭 Conceptual
- 📝 Example
- ⚙️ Configuration

### 2. Information Density

- **High density**: API reference pages
- **Medium density**: Concept explanations
- **Low density**: Getting started guides

### 3. Scannable Structure

- Lead with headings that answer "what will I learn?"
- Use bullet points for lists of benefits/features
- Code examples break up text walls
- Clear "next steps" at the end of sections

## Success Metrics

Good documentation should enable users to:

1. **Get started in under 5 minutes** (Quick Start success)
2. **Find specific information quickly** (Reference success)  
3. **Understand concepts deeply when needed** (Learning success)
4. **Solve problems independently** (Self-service success)

Each page should have a clear "success outcome" - what should the user be able to do after reading it?