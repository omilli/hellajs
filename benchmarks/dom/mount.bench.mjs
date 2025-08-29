import { setupBrowser, teardownBrowser, getPerformanceMetrics } from './shared/setup.mjs';
import { BrowserBenchmark, calculateStats } from './shared/performance.mjs';
import { TEST_DATA, HTML_TEMPLATES } from './shared/fixtures.mjs';

const browsers = ['chromium'];
const results = {};

global.suite('DOM - Mount (Browser)', async (suite) => {
  for (const browserName of browsers) {
    suite.add(`Mount - Basic Component [${browserName}]`, async () => {
      const { browser, page } = await setupBrowser(browserName);
      
      try {
        await page.setContent(HTML_TEMPLATES.withHellaJS);
        
        const benchmark = new BrowserBenchmark(page, 'Basic Mount');
        const result = await benchmark.run(() => {
          const { mount } = window.HellaJS;
          
          // Clear previous mount
          document.getElementById('app').innerHTML = '';
          
          // Mount basic component
          mount(() => ({
            type: 'div',
            props: { class: 'test-component' },
            children: ['Hello World']
          }), '#app');
        }, { 
          iterations: 1000,
          measureMemory: true 
        });

        results[`${browserName}-basic-mount`] = result;
        return result.hz;
      } finally {
        await teardownBrowser(browser);
      }
    });

    suite.add(`Mount - Function Component [${browserName}]`, async () => {
      const { browser, page } = await setupBrowser(browserName);
      
      try {
        await page.setContent(HTML_TEMPLATES.withHellaJS);
        
        const benchmark = new BrowserBenchmark(page, 'Function Component Mount');
        const result = await benchmark.run(() => {
          const { mount } = window.HellaJS;
          
          const TestComponent = (props) => ({
            type: 'div',
            props: { class: 'function-component' },
            children: [
              {
                type: 'h1',
                children: [props.title || 'Default Title']
              },
              {
                type: 'p',
                children: [props.message || 'Default message']
              }
            ]
          });
          
          document.getElementById('app').innerHTML = '';
          mount(() => TestComponent({ 
            title: 'Benchmark Title',
            message: 'Benchmark message' 
          }), '#app');
        }, { 
          iterations: 500,
          measureMemory: true 
        });

        results[`${browserName}-function-component`] = result;
        return result.hz;
      } finally {
        await teardownBrowser(browser);
      }
    });

    suite.add(`Mount - Reactive Props [${browserName}]`, async () => {
      const { browser, page } = await setupBrowser(browserName);
      
      try {
        await page.setContent(HTML_TEMPLATES.withHellaJS);
        
        const benchmark = new BrowserBenchmark(page, 'Reactive Props Mount');
        const result = await benchmark.run(() => {
          const { signal, mount } = window.HellaJS;
          
          const title = signal('Initial Title');
          const count = signal(0);
          
          document.getElementById('app').innerHTML = '';
          mount(() => ({
            type: 'div',
            props: { 
              class: () => count() > 5 ? 'high-count' : 'low-count'
            },
            children: [
              {
                type: 'h1',
                children: [title]
              },
              {
                type: 'p',
                children: [() => `Count: ${count()}`]
              }
            ]
          }), '#app');
          
          // Trigger reactive updates
          title('Updated Title');
          count(10);
        }, { 
          iterations: 300,
          measureMemory: true 
        });

        results[`${browserName}-reactive-props`] = result;
        return result.hz;
      } finally {
        await teardownBrowser(browser);
      }
    });

    suite.add(`Mount - Complex Tree [${browserName}]`, async () => {
      const { browser, page } = await setupBrowser(browserName);
      
      try {
        await page.setContent(HTML_TEMPLATES.withHellaJS);
        
        const benchmark = new BrowserBenchmark(page, 'Complex Tree Mount');
        const result = await benchmark.run(() => {
          const { mount } = window.HellaJS;
          
          const createComplexTree = (depth, width) => {
            if (depth === 0) {
              return { type: 'span', children: ['Leaf'] };
            }
            
            return {
              type: 'div',
              props: { 
                class: `level-${depth}`,
                'data-depth': depth
              },
              children: Array.from({ length: width }, (_, i) => 
                createComplexTree(depth - 1, Math.max(1, width - 1))
              )
            };
          };
          
          document.getElementById('app').innerHTML = '';
          mount(() => createComplexTree(5, 3), '#app');
        }, { 
          iterations: 100,
          measureMemory: true 
        });

        results[`${browserName}-complex-tree`] = result;
        return result.hz;
      } finally {
        await teardownBrowser(browser);
      }
    });

    suite.add(`Mount - Fragment Mounting [${browserName}]`, async () => {
      const { browser, page } = await setupBrowser(browserName);
      
      try {
        await page.setContent(HTML_TEMPLATES.withHellaJS);
        
        const benchmark = new BrowserBenchmark(page, 'Fragment Mount');
        const result = await benchmark.run(() => {
          const { mount } = window.HellaJS;
          
          document.getElementById('app').innerHTML = '';
          mount(() => [
            {
              type: 'h1',
              children: ['Fragment Title']
            },
            {
              type: 'p',
              children: ['Fragment paragraph 1']
            },
            {
              type: 'p',
              children: ['Fragment paragraph 2']
            },
            {
              type: 'ul',
              children: [
                { type: 'li', children: ['Item 1'] },
                { type: 'li', children: ['Item 2'] },
                { type: 'li', children: ['Item 3'] }
              ]
            }
          ], '#app');
        }, { 
          iterations: 500,
          measureMemory: true 
        });

        results[`${browserName}-fragment-mount`] = result;
        return result.hz;
      } finally {
        await teardownBrowser(browser);
      }
    });

    suite.add(`Mount - Nested Components [${browserName}]`, async () => {
      const { browser, page } = await setupBrowser(browserName);
      
      try {
        await page.setContent(HTML_TEMPLATES.withHellaJS);
        
        const benchmark = new BrowserBenchmark(page, 'Nested Components Mount');
        const result = await benchmark.run(() => {
          const { mount } = window.HellaJS;
          
          const Button = ({ label, onClick }) => ({
            type: 'button',
            props: { onClick },
            children: [label]
          });
          
          const Card = ({ title, content, actions }) => ({
            type: 'div',
            props: { class: 'card' },
            children: [
              {
                type: 'div',
                props: { class: 'card-header' },
                children: [
                  { type: 'h3', children: [title] }
                ]
              },
              {
                type: 'div',
                props: { class: 'card-body' },
                children: [
                  { type: 'p', children: [content] }
                ]
              },
              {
                type: 'div',
                props: { class: 'card-actions' },
                children: actions.map(action => Button(action))
              }
            ]
          });
          
          const App = () => ({
            type: 'div',
            props: { class: 'app' },
            children: [
              Card({
                title: 'Benchmark Card',
                content: 'This is a nested component benchmark',
                actions: [
                  { label: 'Action 1', onClick: () => {} },
                  { label: 'Action 2', onClick: () => {} }
                ]
              })
            ]
          });
          
          document.getElementById('app').innerHTML = '';
          mount(App, '#app');
        }, { 
          iterations: 300,
          measureMemory: true 
        });

        results[`${browserName}-nested-components`] = result;
        return result.hz;
      } finally {
        await teardownBrowser(browser);
      }
    });
  }
  
  suite.on('complete', () => {
    console.log('\n--- Mount Benchmark Results ---');
    const stats = calculateStats(Object.values(results));
    if (stats) {
      console.log(`Average Hz: ${stats.avgHz.toFixed(2)}`);
      console.log(`Memory Growth: ${(stats.memoryGrowth / 1024).toFixed(2)} KB`);
    }
  });
});