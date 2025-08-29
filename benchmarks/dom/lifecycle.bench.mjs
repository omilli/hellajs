import { setupBrowser, teardownBrowser, getPerformanceMetrics } from './shared/setup.mjs';
import { BrowserBenchmark, calculateStats } from './shared/performance.mjs';
import { TEST_DATA, HTML_TEMPLATES } from './shared/fixtures.mjs';

const browsers = ['chromium'];
const results = {};

global.suite('DOM - Lifecycle (Browser)', async (suite) => {
  for (const browserName of browsers) {
    suite.add(`Lifecycle - onUpdate Performance [${browserName}]`, async () => {
      const { browser, page } = await setupBrowser(browserName);
      
      try {
        await page.setContent(HTML_TEMPLATES.withHellaJS);
        
        const benchmark = new BrowserBenchmark(page, 'onUpdate Performance');
        const result = await benchmark.run(() => {
          const { signal, mount } = window.HellaJS;
          
          let updateCount = 0;
          const count = signal(0);
          
          const Component = () => ({
            type: 'div',
            props: {
              onUpdate: () => {
                updateCount++;
              }
            },
            children: [
              {
                type: 'p',
                children: [() => `Count: ${count()}`]
              }
            ]
          });
          
          document.getElementById('app').innerHTML = '';
          mount(Component, '#app');
          
          // Trigger multiple updates
          for (let i = 1; i <= 100; i++) {
            count(i);
          }
        }, { 
          iterations: 100,
          measureMemory: true 
        });

        results[`${browserName}-onupdate`] = result;
        return result.hz;
      } finally {
        await teardownBrowser(browser);
      }
    });

    suite.add(`Lifecycle - onDestroy Cleanup [${browserName}]`, async () => {
      const { browser, page } = await setupBrowser(browserName);
      
      try {
        await page.setContent(HTML_TEMPLATES.withHellaJS);
        
        const benchmark = new BrowserBenchmark(page, 'onDestroy Cleanup');
        const result = await benchmark.run(() => {
          const { signal, mount } = window.HellaJS;
          
          let destroyCount = 0;
          const show = signal(true);
          
          const DestroyableComponent = () => ({
            type: 'div',
            props: {
              onDestroy: () => {
                destroyCount++;
              }
            },
            children: [
              'Component that will be destroyed'
            ]
          });
          
          const App = () => ({
            type: 'div',
            children: [
              show() ? DestroyableComponent() : null
            ].filter(Boolean)
          });
          
          document.getElementById('app').innerHTML = '';
          mount(App, '#app');
          
          // Toggle visibility multiple times to trigger destruction
          for (let i = 0; i < 50; i++) {
            show(false);
            show(true);
          }
          show(false); // Final destroy
        }, { 
          iterations: 100,
          measureMemory: true 
        });

        results[`${browserName}-ondestroy`] = result;
        return result.hz;
      } finally {
        await teardownBrowser(browser);
      }
    });

    suite.add(`Lifecycle - Effect Cleanup [${browserName}]`, async () => {
      const { browser, page } = await setupBrowser(browserName);
      
      try {
        await page.setContent(HTML_TEMPLATES.withHellaJS);
        
        const benchmark = new BrowserBenchmark(page, 'Effect Cleanup');
        const result = await benchmark.run(() => {
          const { signal, effect, mount } = window.HellaJS;
          
          const count = signal(0);
          const multiplier = signal(2);
          let effectRunCount = 0;
          
          const Component = () => {
            // Create effects that will need cleanup
            effect(() => {
              const result = count() * multiplier();
              effectRunCount++;
            });
            
            return {
              type: 'div',
              children: [
                {
                  type: 'p',
                  children: [() => `Count: ${count()}, Multiplier: ${multiplier()}`]
                }
              ]
            };
          };
          
          document.getElementById('app').innerHTML = '';
          mount(Component, '#app');
          
          // Trigger effect updates
          for (let i = 1; i <= 50; i++) {
            count(i);
            if (i % 10 === 0) {
              multiplier(multiplier() + 1);
            }
          }
          
          // Clear the component to trigger cleanup
          document.getElementById('app').innerHTML = '';
        }, { 
          iterations: 100,
          measureMemory: true 
        });

        results[`${browserName}-effect-cleanup`] = result;
        return result.hz;
      } finally {
        await teardownBrowser(browser);
      }
    });

    suite.add(`Lifecycle - Memory Leak Detection [${browserName}]`, async () => {
      const { browser, page } = await setupBrowser(browserName);
      
      try {
        await page.setContent(HTML_TEMPLATES.withHellaJS);
        
        const benchmark = new BrowserBenchmark(page, 'Memory Leak Detection');
        const result = await benchmark.run(() => {
          const { signal, effect, mount } = window.HellaJS;
          
          // Create and destroy many components to test for leaks
          for (let cycle = 0; cycle < 10; cycle++) {
            const data = signal(`Data ${cycle}`);
            
            const LeakTestComponent = () => {
              // Create effects that should be cleaned up
              effect(() => {
                const value = data();
                // Simulate some work
                return value.length * Math.random();
              });
              
              return {
                type: 'div',
                props: {
                  onUpdate: () => {
                    // Simulate update work
                  },
                  onDestroy: () => {
                    // Simulate cleanup work
                  }
                },
                children: [
                  {
                    type: 'span',
                    children: [data]
                  }
                ]
              };
            };
            
            // Mount component
            mount(LeakTestComponent, '#app');
            
            // Update data multiple times
            for (let i = 0; i < 20; i++) {
              data(`Updated Data ${cycle}-${i}`);
            }
            
            // Clear component
            document.getElementById('app').innerHTML = '';
          }
          
          // Force garbage collection if available
          if (window.gc) {
            window.gc();
          }
        }, { 
          iterations: 10,
          measureMemory: true,
          timeout: 60000
        });

        results[`${browserName}-memory-leaks`] = result;
        return result.hz;
      } finally {
        await teardownBrowser(browser);
      }
    });

    suite.add(`Lifecycle - Event Handler Cleanup [${browserName}]`, async () => {
      const { browser, page } = await setupBrowser(browserName);
      
      try {
        await page.setContent(HTML_TEMPLATES.withHellaJS);
        
        const benchmark = new BrowserBenchmark(page, 'Event Handler Cleanup');
        const result = await benchmark.run(() => {
          const { signal, mount } = window.HellaJS;
          
          const show = signal(true);
          let clickCount = 0;
          
          const ButtonComponent = () => ({
            type: 'button',
            props: {
              onClick: () => {
                clickCount++;
              },
              onDestroy: () => {
                // Should clean up event handlers
              }
            },
            children: ['Click me']
          });
          
          const App = () => ({
            type: 'div',
            children: [
              show() ? ButtonComponent() : null
            ].filter(Boolean)
          });
          
          // Mount and destroy components with event handlers
          for (let i = 0; i < 100; i++) {
            document.getElementById('app').innerHTML = '';
            mount(App, '#app');
            
            show(true);
            
            // Simulate some clicks if button exists
            const button = document.querySelector('button');
            if (button) {
              button.click();
            }
            
            show(false);
          }
        }, { 
          iterations: 50,
          measureMemory: true 
        });

        results[`${browserName}-event-cleanup`] = result;
        return result.hz;
      } finally {
        await teardownBrowser(browser);
      }
    });

    suite.add(`Lifecycle - MutationObserver Performance [${browserName}]`, async () => {
      const { browser, page } = await setupBrowser(browserName);
      
      try {
        await page.setContent(HTML_TEMPLATES.withHellaJS);
        
        const benchmark = new BrowserBenchmark(page, 'MutationObserver Performance');
        const result = await benchmark.run(() => {
          const { signal, mount, forEach } = window.HellaJS;
          
          const items = signal([]);
          
          const DynamicList = () => ({
            type: 'div',
            props: {
              onDestroy: () => {
                // Components being observed for cleanup
              }
            },
            children: [
              {
                type: 'ul',
                children: [
                  forEach(items, (item) => ({
                    type: 'li',
                    props: { 
                      key: item.id,
                      onDestroy: () => {
                        // Each item should be observed for cleanup
                      }
                    },
                    children: [item.text]
                  }))
                ]
              }
            ]
          });
          
          document.getElementById('app').innerHTML = '';
          mount(DynamicList, '#app');
          
          // Rapidly add and remove items to stress MutationObserver
          for (let cycle = 0; cycle < 20; cycle++) {
            // Add items
            const newItems = Array.from({ length: 25 }, (_, i) => ({
              id: cycle * 25 + i + 1,
              text: `Item ${cycle}-${i + 1}`
            }));
            items(newItems);
            
            // Remove items
            items([]);
          }
        }, { 
          iterations: 20,
          measureMemory: true 
        });

        results[`${browserName}-mutation-observer`] = result;
        return result.hz;
      } finally {
        await teardownBrowser(browser);
      }
    });
  }
  
  suite.on('complete', () => {
    console.log('\n--- Lifecycle Benchmark Results ---');
    const stats = calculateStats(Object.values(results));
    if (stats) {
      console.log(`Average Hz: ${stats.avgHz.toFixed(2)}`);
      console.log(`Memory Growth: ${(stats.memoryGrowth / 1024).toFixed(2)} KB`);
      
      // Check for potential memory leaks
      const memoryLeakResults = Object.entries(results)
        .filter(([key]) => key.includes('memory-leaks'))
        .map(([_, result]) => result.memory?.growth || 0);
        
      if (memoryLeakResults.length > 0) {
        const avgMemoryGrowth = memoryLeakResults.reduce((a, b) => a + b, 0) / memoryLeakResults.length;
        console.log(`Average Memory Growth (Leak Test): ${(avgMemoryGrowth / 1024).toFixed(2)} KB`);
        
        if (avgMemoryGrowth > 1024 * 1024) { // > 1MB growth
          console.warn('⚠️  Potential memory leak detected!');
        } else {
          console.log('✅ No significant memory leaks detected');
        }
      }
    }
  });
});