/**
 * Demo showing how the new DOM template system works
 * This demonstrates the performance benefits of caching actual DOM elements
 */

// Mock DOM environment for demonstration
const mockDocument = {
  createElement: (tag) => ({
    tagName: tag.toLowerCase(),
    nodeType: 1,
    children: [],
    attributes: {},
    textContent: '',
    appendChild: function(child) { this.children.push(child); },
    cloneNode: function(deep) {
      const clone = {
        tagName: this.tagName,
        nodeType: this.nodeType,
        children: deep ? this.children.map(c => c.cloneNode ? c.cloneNode(true) : c) : [],
        attributes: { ...this.attributes },
        textContent: this.textContent,
        appendChild: function(child) { this.children.push(child); },
        cloneNode: this.cloneNode,
        setAttribute: this.setAttribute,
      };
      return clone;
    },
    setAttribute: function(name, value) { this.attributes[name] = value; }
  }),
  createTextNode: (text) => ({
    nodeType: 3,
    textContent: text,
    cloneNode: function() { return { ...this }; }
  })
};

// Simulate the new DOM template system
class DOMTemplateCache {
  constructor() {
    this.templates = new Map();
  }

  registerTemplate(id, templateFn) {
    const template = templateFn();
    this.templates.set(id, template);
    console.log(`✓ Registered DOM template: ${id}`);
  }

  bindTemplate(id, context) {
    const template = this.templates.get(id);
    if (!template) return null;

    // Clone the template element (this is the key performance optimization!)
    const cloned = template.element.cloneNode(true);
    
    // Apply bindings efficiently
    template.bindings.forEach(binding => {
      const value = binding.accessor(context);
      const target = this.getNodeAtPath(cloned, binding.path);
      
      if (target) {
        switch (binding.type) {
          case 'text':
            target.textContent = String(value ?? '');
            break;
          case 'attribute':
            if (binding.name) target.setAttribute(binding.name, String(value ?? ''));
            break;
        }
      }
    });

    return cloned;
  }

  getNodeAtPath(parent, path) {
    let current = parent;
    for (const index of path) {
      if (!current.children || !current.children[index]) return null;
      current = current.children[index];
    }
    return current;
  }
}

// Demo usage
const cache = new DOMTemplateCache();

// Register a template (this would typically be done by the Babel plugin)
cache.registerTemplate('user-card', () => {
  // Create the template DOM structure
  const cardElement = mockDocument.createElement('div');
  cardElement.setAttribute('class', 'user-card');
  
  const nameElement = mockDocument.createElement('h3');
  cardElement.appendChild(nameElement);
  
  const ageElement = mockDocument.createElement('p');
  cardElement.appendChild(ageElement);

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
    },
    {
      type: 'attribute',
      path: [], // Root element
      name: 'data-user-id',
      accessor: (ctx) => ctx.user.id
    }
  ];

  return {
    element: cardElement,
    bindings: bindings,
    paramNames: ['user']
  };
});

// Performance comparison demonstration
console.log('\n=== Performance Comparison Demo ===');

const users = [
  { id: 1, name: 'Alice', age: 30 },
  { id: 2, name: 'Bob', age: 25 },
  { id: 3, name: 'Carol', age: 35 }
];

console.log('\n1. OLD WAY (VNode creation every time):');
console.time('VNode Creation');
users.forEach((user, i) => {
  // Simulate creating VNode every time
  const vnode = {
    tag: 'div',
    props: { class: 'user-card', 'data-user-id': user.id },
    children: [
      { tag: 'h3', children: [user.name] },
      { tag: 'p', children: [`Age: ${user.age}`] }
    ]
  };
  // Then convert VNode to DOM (expensive)
  console.log(`  Created VNode ${i + 1}: ${user.name}`);
});
console.timeEnd('VNode Creation');

console.log('\n2. NEW WAY (DOM element cloning):');
console.time('DOM Template Cloning');
users.forEach((user, i) => {
  // Use cached DOM template - much faster!
  const element = cache.bindTemplate('user-card', { user });
  console.log(`  Cloned template ${i + 1}: ${user.name} (${element.children.length} children)`);
});
console.timeEnd('DOM Template Cloning');

console.log('\n=== Benefits of DOM Template Caching ===');
console.log('✓ Templates are pre-compiled DOM structures');
console.log('✓ No VNode -> DOM conversion needed');
console.log('✓ Fast cloneNode() operations');
console.log('✓ Efficient data binding with pre-computed paths');
console.log('✓ Memory efficient - templates shared across instances');
console.log('✓ Maintains compatibility with existing forEach patterns');

// Show the structure of a cloned element
console.log('\n=== Example Cloned Element ===');
const example = cache.bindTemplate('user-card', { user: users[0] });
console.log('Tag:', example.tagName);
console.log('Attributes:', example.attributes);
console.log('Children count:', example.children.length);
console.log('First child text:', example.children[0].textContent);
console.log('Second child text:', example.children[1].textContent);