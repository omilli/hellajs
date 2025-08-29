export const TEST_DATA = {
  // Simple test data
  simple: {
    text: 'Hello World',
    number: 42,
    boolean: true,
    array: [1, 2, 3, 4, 5],
    object: { id: 1, name: 'Test', active: true }
  },

  // List data for forEach testing
  lists: {
    small: Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      text: `Item ${i + 1}`,
      value: Math.random(),
      active: i % 2 === 0
    })),
    
    medium: Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      text: `Item ${i + 1}`,
      value: Math.random(),
      category: `Category ${(i % 5) + 1}`,
      tags: [`tag${i % 3}`, `tag${(i + 1) % 3}`],
      active: i % 2 === 0
    })),
    
    large: Array.from({ length: 1000 }, (_, i) => ({
      id: i + 1,
      text: `Item ${i + 1}`,
      value: Math.random(),
      category: `Category ${(i % 10) + 1}`,
      description: `This is a longer description for item ${i + 1}`,
      metadata: {
        created: new Date(2024, i % 12, (i % 28) + 1),
        priority: i % 5,
        score: Math.random() * 100
      },
      tags: Array.from({ length: (i % 5) + 1 }, (_, j) => `tag${(i + j) % 10}`),
      active: i % 2 === 0
    }))
  },

  // Component tree structures
  trees: {
    shallow: {
      type: 'div',
      props: { class: 'container' },
      children: Array.from({ length: 10 }, (_, i) => ({
        type: 'p',
        props: { key: i },
        children: [`Paragraph ${i + 1}`]
      }))
    },
    
    deep: (() => {
      let current = { type: 'span', children: ['Deep leaf'] };
      for (let i = 0; i < 20; i++) {
        current = {
          type: 'div',
          props: { class: `level-${i}` },
          children: [current]
        };
      }
      return current;
    })(),
    
    wide: {
      type: 'div',
      props: { class: 'wide-container' },
      children: Array.from({ length: 50 }, (_, i) => ({
        type: 'div',
        props: { 
          key: i,
          class: `item item-${i}`,
          'data-index': i
        },
        children: [
          {
            type: 'h3',
            children: [`Title ${i + 1}`]
          },
          {
            type: 'p',
            children: [`Description for item ${i + 1}`]
          },
          {
            type: 'ul',
            children: Array.from({ length: 3 }, (_, j) => ({
              type: 'li',
              children: [`Sub-item ${j + 1}`]
            }))
          }
        ]
      }))
    }
  }
};

export function createVNode(type, props = {}, children = []) {
  return { type, props, children };
}

export function createComponent(name, renderFn) {
  return function Component(props = {}) {
    return renderFn(props);
  };
}

export function generateListUpdate(originalList, operation) {
  const list = [...originalList];
  
  switch (operation) {
    case 'prepend':
      return [{ id: Date.now(), text: 'New Item', value: Math.random(), active: true }, ...list];
    
    case 'append':
      return [...list, { id: Date.now(), text: 'New Item', value: Math.random(), active: true }];
    
    case 'insert-middle':
      const midIndex = Math.floor(list.length / 2);
      return [
        ...list.slice(0, midIndex),
        { id: Date.now(), text: 'New Item', value: Math.random(), active: true },
        ...list.slice(midIndex)
      ];
    
    case 'remove-first':
      return list.slice(1);
    
    case 'remove-last':
      return list.slice(0, -1);
    
    case 'remove-middle':
      const removeIndex = Math.floor(list.length / 2);
      return [...list.slice(0, removeIndex), ...list.slice(removeIndex + 1)];
    
    case 'shuffle':
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
      return list;
    
    case 'reverse':
      return [...list].reverse();
    
    case 'sort':
      return [...list].sort((a, b) => a.text.localeCompare(b.text));
    
    case 'update-random':
      const updateIndex = Math.floor(Math.random() * list.length);
      const updated = [...list];
      updated[updateIndex] = {
        ...updated[updateIndex],
        text: `Updated Item ${Date.now()}`,
        value: Math.random(),
        active: !updated[updateIndex].active
      };
      return updated;
    
    default:
      return list;
  }
}

export const HTML_TEMPLATES = {
  basic: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>HellaJS DOM Benchmark</title>
      <style>
        body { margin: 0; padding: 20px; font-family: sans-serif; }
        #app { min-height: 100vh; }
        .benchmark-container { margin: 20px 0; }
        .item { padding: 8px; border: 1px solid #ddd; margin: 2px 0; }
        .item.active { background-color: #e8f5e8; }
        .loading { opacity: 0.5; }
      </style>
    </head>
    <body>
      <div id="app"></div>
      <script type="module">
        // Benchmark will inject code here
      </script>
    </body>
    </html>
  `,
  
  withHellaJS: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>HellaJS DOM Benchmark</title>
      <style>
        body { margin: 0; padding: 20px; font-family: sans-serif; }
        #app { min-height: 100vh; }
        .benchmark-container { margin: 20px 0; }
        .item { padding: 8px; border: 1px solid #ddd; margin: 2px 0; }
        .item.active { background-color: #e8f5e8; }
        .loading { opacity: 0.5; }
      </style>
    </head>
    <body>
      <div id="app"></div>
      <script type="module">
        import { signal, effect, computed } from '/dist/core/index.js';
        import { mount, forEach } from '/dist/dom/index.js';
        
        // Make available globally for benchmarks
        window.HellaJS = { signal, effect, computed, mount, forEach };
      </script>
    </body>
    </html>
  `
};