import { setupBrowser, teardownBrowser, getPerformanceMetrics } from './shared/setup.mjs';
import { BrowserBenchmark, calculateStats } from './shared/performance.mjs';
import { TEST_DATA, generateListUpdate, HTML_TEMPLATES } from './shared/fixtures.mjs';

const browsers = ['chromium'];
const results = {};

global.suite('DOM - forEach (Browser)', async (suite) => {
  for (const browserName of browsers) {
    suite.add(`forEach - Small List Render [${browserName}]`, async () => {
      const { browser, page } = await setupBrowser(browserName);
      
      try {
        await page.setContent(HTML_TEMPLATES.withHellaJS);
        
        const benchmark = new BrowserBenchmark(page, 'Small List Render');
        const result = await benchmark.run(() => {
          const { signal, mount, forEach } = window.HellaJS;
          
          const items = signal(${JSON.stringify(TEST_DATA.lists.small)});
          
          const ListComponent = () => ({
            type: 'div',
            props: { class: 'list-container' },
            children: [
              {
                type: 'ul',
                children: [
                  forEach(items, (item) => ({
                    type: 'li',
                    props: { 
                      key: item.id,
                      class: item.active ? 'item active' : 'item'
                    },
                    children: [item.text]
                  }))
                ]
              }
            ]
          });
          
          document.getElementById('app').innerHTML = '';
          mount(ListComponent, '#app');
        }, { 
          iterations: 500,
          measureMemory: true 
        });

        results[`${browserName}-small-list`] = result;
        return result.hz;
      } finally {
        await teardownBrowser(browser);
      }
    });

    suite.add(`forEach - Medium List Render [${browserName}]`, async () => {
      const { browser, page } = await setupBrowser(browserName);
      
      try {
        await page.setContent(HTML_TEMPLATES.withHellaJS);
        
        const benchmark = new BrowserBenchmark(page, 'Medium List Render');
        const result = await benchmark.run(() => {
          const { signal, mount, forEach } = window.HellaJS;
          
          const items = signal(${JSON.stringify(TEST_DATA.lists.medium)});
          
          const ItemComponent = (item) => ({
            type: 'div',
            props: { 
              key: item.id,
              class: item.active ? 'item active' : 'item',
              'data-category': item.category
            },
            children: [
              {
                type: 'h4',
                children: [item.text]
              },
              {
                type: 'p',
                children: [\`Category: \${item.category}\`]
              },
              {
                type: 'div',
                props: { class: 'tags' },
                children: item.tags.map(tag => ({
                  type: 'span',
                  props: { class: 'tag' },
                  children: [tag]
                }))
              }
            ]
          });
          
          const ListComponent = () => ({
            type: 'div',
            props: { class: 'list-container' },
            children: [
              forEach(items, ItemComponent)
            ]
          });
          
          document.getElementById('app').innerHTML = '';
          mount(ListComponent, '#app');
        }, { 
          iterations: 200,
          measureMemory: true 
        });

        results[`${browserName}-medium-list`] = result;
        return result.hz;
      } finally {
        await teardownBrowser(browser);
      }
    });

    suite.add(`forEach - List Insert Operations [${browserName}]`, async () => {
      const { browser, page } = await setupBrowser(browserName);
      
      try {
        await page.setContent(HTML_TEMPLATES.withHellaJS);
        
        const benchmark = new BrowserBenchmark(page, 'List Insert Operations');
        const result = await benchmark.run(() => {
          const { signal, mount, forEach } = window.HellaJS;
          
          const items = signal([]);
          
          const ListComponent = () => ({
            type: 'ul',
            children: [
              forEach(items, (item) => ({
                type: 'li',
                props: { key: item.id },
                children: [item.text]
              }))
            ]
          });
          
          document.getElementById('app').innerHTML = '';
          mount(ListComponent, '#app');
          
          // Perform insert operations
          for (let i = 0; i < 50; i++) {
            const current = items();
            items([...current, {
              id: i + 1,
              text: \`Item \${i + 1}\`,
              value: Math.random()
            }]);
          }
        }, { 
          iterations: 100,
          measureMemory: true 
        });

        results[`${browserName}-list-inserts`] = result;
        return result.hz;
      } finally {
        await teardownBrowser(browser);
      }
    });

    suite.add(`forEach - List Reorder Operations [${browserName}]`, async () => {
      const { browser, page } = await setupBrowser(browserName);
      
      try {
        await page.setContent(HTML_TEMPLATES.withHellaJS);
        
        const benchmark = new BrowserBenchmark(page, 'List Reorder Operations');
        const result = await benchmark.run(() => {
          const { signal, mount, forEach } = window.HellaJS;
          
          const initialItems = Array.from({ length: 100 }, (_, i) => ({
            id: i + 1,
            text: \`Item \${i + 1}\`,
            value: Math.random()
          }));
          
          const items = signal(initialItems);
          
          const ListComponent = () => ({
            type: 'ul',
            children: [
              forEach(items, (item) => ({
                type: 'li',
                props: { 
                  key: item.id,
                  'data-id': item.id
                },
                children: [item.text]
              }))
            ]
          });
          
          document.getElementById('app').innerHTML = '';
          mount(ListComponent, '#app');
          
          // Perform shuffle operations
          const current = [...items()];
          for (let i = current.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [current[i], current[j]] = [current[j], current[i]];
          }
          items(current);
        }, { 
          iterations: 100,
          measureMemory: true 
        });

        results[`${browserName}-list-reorder`] = result;
        return result.hz;
      } finally {
        await teardownBrowser(browser);
      }
    });

    suite.add(`forEach - List Remove Operations [${browserName}]`, async () => {
      const { browser, page } = await setupBrowser(browserName);
      
      try {
        await page.setContent(HTML_TEMPLATES.withHellaJS);
        
        const benchmark = new BrowserBenchmark(page, 'List Remove Operations');
        const result = await benchmark.run(() => {
          const { signal, mount, forEach } = window.HellaJS;
          
          const initialItems = Array.from({ length: 100 }, (_, i) => ({
            id: i + 1,
            text: \`Item \${i + 1}\`,
            value: Math.random()
          }));
          
          const items = signal(initialItems);
          
          const ListComponent = () => ({
            type: 'ul',
            children: [
              forEach(items, (item) => ({
                type: 'li',
                props: { key: item.id },
                children: [item.text]
              }))
            ]
          });
          
          document.getElementById('app').innerHTML = '';
          mount(ListComponent, '#app');
          
          // Remove every other item
          const current = items();
          const filtered = current.filter((_, index) => index % 2 === 0);
          items(filtered);
        }, { 
          iterations: 200,
          measureMemory: true 
        });

        results[`${browserName}-list-removes`] = result;
        return result.hz;
      } finally {
        await teardownBrowser(browser);
      }
    });

    suite.add(`forEach - Mixed List Operations [${browserName}]`, async () => {
      const { browser, page } = await setupBrowser(browserName);
      
      try {
        await page.setContent(HTML_TEMPLATES.withHellaJS);
        
        const benchmark = new BrowserBenchmark(page, 'Mixed List Operations');
        const result = await benchmark.run(() => {
          const { signal, mount, forEach } = window.HellaJS;
          
          const initialItems = Array.from({ length: 50 }, (_, i) => ({
            id: i + 1,
            text: \`Item \${i + 1}\`,
            value: Math.random(),
            active: i % 2 === 0
          }));
          
          const items = signal(initialItems);
          
          const ItemComponent = (item) => ({
            type: 'div',
            props: { 
              key: item.id,
              class: item.active ? 'item active' : 'item'
            },
            children: [
              {
                type: 'span',
                children: [item.text]
              },
              {
                type: 'small',
                children: [\` (ID: \${item.id})\`]
              }
            ]
          });
          
          const ListComponent = () => ({
            type: 'div',
            props: { class: 'mixed-list' },
            children: [
              forEach(items, ItemComponent)
            ]
          });
          
          document.getElementById('app').innerHTML = '';
          mount(ListComponent, '#app');
          
          // Perform mixed operations
          let current = [...items()];
          
          // Add new items
          current.push({ id: 101, text: 'New Item 1', value: Math.random(), active: true });
          current.push({ id: 102, text: 'New Item 2', value: Math.random(), active: false });
          
          // Remove some items
          current = current.filter(item => item.id % 5 !== 0);
          
          // Shuffle
          for (let i = current.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [current[i], current[j]] = [current[j], current[i]];
          }
          
          // Update active status
          current = current.map(item => ({
            ...item,
            active: Math.random() > 0.5
          }));
          
          items(current);
        }, { 
          iterations: 100,
          measureMemory: true 
        });

        results[`${browserName}-mixed-operations`] = result;
        return result.hz;
      } finally {
        await teardownBrowser(browser);
      }
    });

    suite.add(`forEach - Large List Performance [${browserName}]`, async () => {
      const { browser, page } = await setupBrowser(browserName);
      
      try {
        await page.setContent(HTML_TEMPLATES.withHellaJS);
        
        const benchmark = new BrowserBenchmark(page, 'Large List Performance');
        const result = await benchmark.run(() => {
          const { signal, mount, forEach } = window.HellaJS;
          
          const largeList = Array.from({ length: 1000 }, (_, i) => ({
            id: i + 1,
            text: \`Item \${i + 1}\`,
            category: \`Category \${(i % 10) + 1}\`,
            value: Math.random() * 100,
            active: i % 3 === 0
          }));
          
          const items = signal(largeList);
          
          const ListComponent = () => ({
            type: 'div',
            props: { class: 'large-list' },
            children: [
              forEach(items, (item) => ({
                type: 'div',
                props: { 
                  key: item.id,
                  class: \`list-item \${item.active ? 'active' : ''}\`,
                  'data-category': item.category
                },
                children: [
                  {
                    type: 'strong',
                    children: [item.text]
                  },
                  {
                    type: 'span',
                    props: { class: 'value' },
                    children: [\` - \${item.value.toFixed(2)}\`]
                  }
                ]
              }))
            ]
          });
          
          document.getElementById('app').innerHTML = '';
          mount(ListComponent, '#app');
        }, { 
          iterations: 10,
          measureMemory: true,
          timeout: 60000
        });

        results[`${browserName}-large-list`] = result;
        return result.hz;
      } finally {
        await teardownBrowser(browser);
      }
    });
  }
  
  suite.on('complete', () => {
    console.log('\n--- forEach Benchmark Results ---');
    const stats = calculateStats(Object.values(results));
    if (stats) {
      console.log(`Average Hz: ${stats.avgHz.toFixed(2)}`);
      console.log(`Memory Growth: ${(stats.memoryGrowth / 1024).toFixed(2)} KB`);
    }
  });
});