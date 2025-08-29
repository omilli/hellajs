import { setupBrowser, teardownBrowser, getPerformanceMetrics } from './shared/setup.mjs';
import { BrowserBenchmark, calculateStats } from './shared/performance.mjs';
import { TEST_DATA, HTML_TEMPLATES } from './shared/fixtures.mjs';

const browsers = ['chromium'];
const results = {};

global.suite('DOM - Reactive (Browser)', async (suite) => {
  for (const browserName of browsers) {
    suite.add(`Reactive - Signal Dependency Tracking [${browserName}]`, async () => {
      const { browser, page } = await setupBrowser(browserName);
      
      try {
        await page.setContent(HTML_TEMPLATES.withHellaJS);
        
        const benchmark = new BrowserBenchmark(page, 'Signal Dependency Tracking');
        const result = await benchmark.run(() => {
          const { signal, computed, mount } = window.HellaJS;
          
          // Create a chain of dependencies
          const base = signal(1);
          const doubled = computed(() => base() * 2);
          const tripled = computed(() => base() * 3);
          const combined = computed(() => doubled() + tripled());
          
          const Component = () => ({
            type: 'div',
            children: [
              {
                type: 'p',
                children: [() => `Base: ${base()}`]
              },
              {
                type: 'p',
                children: [() => `Doubled: ${doubled()}`]
              },
              {
                type: 'p',
                children: [() => `Tripled: ${tripled()}`]
              },
              {
                type: 'p',
                children: [() => `Combined: ${combined()}`]
              }
            ]
          });
          
          document.getElementById('app').innerHTML = '';
          mount(Component, '#app');
          
          // Trigger dependency updates
          for (let i = 2; i <= 100; i++) {
            base(i);
          }
        }, { 
          iterations: 100,
          measureMemory: true 
        });

        results[`${browserName}-dependency-tracking`] = result;
        return result.hz;
      } finally {
        await teardownBrowser(browser);
      }
    });

    suite.add(`Reactive - Effect Creation Performance [${browserName}]`, async () => {
      const { browser, page } = await setupBrowser(browserName);
      
      try {
        await page.setContent(HTML_TEMPLATES.withHellaJS);
        
        const benchmark = new BrowserBenchmark(page, 'Effect Creation Performance');
        const result = await benchmark.run(() => {
          const { signal, effect, mount } = window.HellaJS;
          
          const data = signal('initial');
          const effects = [];
          
          // Create many effects
          for (let i = 0; i < 100; i++) {
            const cleanup = effect(() => {
              const value = data();
              return value.length + i;
            });
            effects.push(cleanup);
          }
          
          const Component = () => ({
            type: 'div',
            children: [
              {
                type: 'p',
                children: [data]
              }
            ]
          });
          
          document.getElementById('app').innerHTML = '';
          mount(Component, '#app');
          
          // Trigger effect updates
          for (let i = 1; i <= 50; i++) {
            data(`update-${i}`);
          }
          
          // Cleanup effects
          effects.forEach(cleanup => {
            if (typeof cleanup === 'function') {
              cleanup();
            }
          });
        }, { 
          iterations: 50,
          measureMemory: true 
        });

        results[`${browserName}-effect-creation`] = result;
        return result.hz;
      } finally {
        await teardownBrowser(browser);
      }
    });

    suite.add(`Reactive - Batch Update Performance [${browserName}]`, async () => {
      const { browser, page } = await setupBrowser(browserName);
      
      try {
        await page.setContent(HTML_TEMPLATES.withHellaJS);
        
        const benchmark = new BrowserBenchmark(page, 'Batch Update Performance');
        const result = await benchmark.run(() => {
          const { signal, batch, mount } = window.HellaJS;
          
          const signals = Array.from({ length: 20 }, () => signal(0));
          
          const Component = () => ({
            type: 'div',
            children: signals.map((sig, i) => ({
              type: 'p',
              children: [() => `Signal ${i}: ${sig()}`]
            }))
          });
          
          document.getElementById('app').innerHTML = '';
          mount(Component, '#app');
          
          // Test batched updates vs individual updates
          for (let cycle = 0; cycle < 50; cycle++) {
            if (cycle % 2 === 0) {
              // Batched updates
              batch(() => {
                signals.forEach((sig, i) => {
                  sig(cycle * 20 + i);
                });
              });
            } else {
              // Individual updates
              signals.forEach((sig, i) => {
                sig(cycle * 20 + i);
              });
            }
          }
        }, { 
          iterations: 100,
          measureMemory: true 
        });

        results[`${browserName}-batch-updates`] = result;
        return result.hz;
      } finally {
        await teardownBrowser(browser);
      }
    });

    suite.add(`Reactive - Property Binding Updates [${browserName}]`, async () => {
      const { browser, page } = await setupBrowser(browserName);
      
      try {
        await page.setContent(HTML_TEMPLATES.withHellaJS);
        
        const benchmark = new BrowserBenchmark(page, 'Property Binding Updates');
        const result = await benchmark.run(() => {
          const { signal, mount } = window.HellaJS;
          
          const className = signal('initial');
          const id = signal('test-1');
          const disabled = signal(false);
          const style = signal('color: red');
          const dataValue = signal('initial-data');
          
          const Component = () => ({
            type: 'div',
            props: {
              class: className,
              id: id,
              disabled: disabled,
              style: style,
              'data-value': dataValue
            },
            children: [
              {
                type: 'button',
                props: {
                  class: () => `btn ${className()}`,
                  disabled: disabled,
                  'aria-label': () => `Button ${id()}`
                },
                children: ['Dynamic Button']
              }
            ]
          });
          
          document.getElementById('app').innerHTML = '';
          mount(Component, '#app');
          
          // Update all reactive properties
          for (let i = 1; i <= 100; i++) {
            className(`class-${i}`);
            id(`test-${i}`);
            disabled(i % 2 === 0);
            style(`color: ${i % 2 === 0 ? 'blue' : 'red'}; font-size: ${12 + (i % 10)}px`);
            dataValue(`data-${i}`);
          }
        }, { 
          iterations: 100,
          measureMemory: true 
        });

        results[`${browserName}-property-binding`] = result;
        return result.hz;
      } finally {
        await teardownBrowser(browser);
      }
    });

    suite.add(`Reactive - Text Content Updates [${browserName}]`, async () => {
      const { browser, page } = await setupBrowser(browserName);
      
      try {
        await page.setContent(HTML_TEMPLATES.withHellaJS);
        
        const benchmark = new BrowserBenchmark(page, 'Text Content Updates');
        const result = await benchmark.run(() => {
          const { signal, computed, mount } = window.HellaJS;
          
          const count = signal(0);
          const name = signal('User');
          const time = signal(new Date().toISOString());
          
          const formattedTime = computed(() => {
            return new Date(time()).toLocaleTimeString();
          });
          
          const Component = () => ({
            type: 'div',
            children: [
              {
                type: 'h1',
                children: [() => `Hello, ${name()}!`]
              },
              {
                type: 'p',
                children: [() => `Count: ${count()}`]
              },
              {
                type: 'p',
                children: [() => `Time: ${formattedTime()}`]
              },
              {
                type: 'div',
                children: [
                  () => `Status: ${count() > 50 ? 'High' : count() > 25 ? 'Medium' : 'Low'}`
                ]
              }
            ]
          });
          
          document.getElementById('app').innerHTML = '';
          mount(Component, '#app');
          
          // Rapid text updates
          for (let i = 1; i <= 100; i++) {
            count(i);
            if (i % 10 === 0) {
              name(`User${i}`);
            }
            if (i % 20 === 0) {
              time(new Date(Date.now() + i * 1000).toISOString());
            }
          }
        }, { 
          iterations: 100,
          measureMemory: true 
        });

        results[`${browserName}-text-updates`] = result;
        return result.hz;
      } finally {
        await teardownBrowser(browser);
      }
    });

    suite.add(`Reactive - Complex Reactive Tree [${browserName}]`, async () => {
      const { browser, page } = await setupBrowser(browserName);
      
      try {
        await page.setContent(HTML_TEMPLATES.withHellaJS);
        
        const benchmark = new BrowserBenchmark(page, 'Complex Reactive Tree');
        const result = await benchmark.run(() => {
          const { signal, computed, mount } = window.HellaJS;
          
          // Create a complex reactive state tree
          const user = signal({ id: 1, name: 'John', active: true });
          const theme = signal('light');
          const settings = signal({ notifications: true, autoSave: false });
          
          const isAdmin = computed(() => user().id === 1);
          const userDisplayName = computed(() => 
            user().active ? user().name : `${user().name} (inactive)`
          );
          const themeClass = computed(() => `theme-${theme()}`);
          
          const Component = () => ({
            type: 'div',
            props: {
              class: themeClass,
              'data-user': () => user().id
            },
            children: [
              {
                type: 'header',
                props: {
                  class: () => isAdmin() ? 'header admin' : 'header'
                },
                children: [
                  {
                    type: 'h1',
                    children: [userDisplayName]
                  },
                  {
                    type: 'nav',
                    children: [
                      {
                        type: 'button',
                        props: {
                          class: () => settings().notifications ? 'active' : '',
                          disabled: () => !user().active
                        },
                        children: ['Notifications']
                      },
                      {
                        type: 'button',
                        props: {
                          class: () => settings().autoSave ? 'active' : '',
                          disabled: () => !isAdmin()
                        },
                        children: ['Auto Save']
                      }
                    ]
                  }
                ]
              },
              {
                type: 'main',
                children: [
                  {
                    type: 'p',
                    children: [() => `Theme: ${theme()}`]
                  },
                  {
                    type: 'p',
                    children: [() => `Admin: ${isAdmin() ? 'Yes' : 'No'}`]
                  }
                ]
              }
            ]
          });
          
          document.getElementById('app').innerHTML = '';
          mount(Component, '#app');
          
          // Complex state updates
          for (let i = 1; i <= 50; i++) {
            user({
              id: i % 5 + 1,
              name: `User${i}`,
              active: i % 3 !== 0
            });
            
            theme(i % 2 === 0 ? 'dark' : 'light');
            
            settings({
              notifications: i % 2 === 0,
              autoSave: i % 4 === 0
            });
          }
        }, { 
          iterations: 50,
          measureMemory: true 
        });

        results[`${browserName}-complex-reactive`] = result;
        return result.hz;
      } finally {
        await teardownBrowser(browser);
      }
    });

    suite.add(`Reactive - Update Propagation Efficiency [${browserName}]`, async () => {
      const { browser, page } = await setupBrowser(browserName);
      
      try {
        await page.setContent(HTML_TEMPLATES.withHellaJS);
        
        const benchmark = new BrowserBenchmark(page, 'Update Propagation Efficiency');
        const result = await benchmark.run(() => {
          const { signal, computed, mount } = window.HellaJS;
          
          // Create a diamond dependency graph
          const root = signal(1);
          const left = computed(() => root() * 2);
          const right = computed(() => root() * 3);
          const bottom = computed(() => left() + right());
          
          // Create additional branches
          const leftSquared = computed(() => left() * left());
          const rightSquared = computed(() => right() * right());
          const combined = computed(() => leftSquared() + rightSquared() + bottom());
          
          const Component = () => ({
            type: 'div',
            children: [
              {
                type: 'div',
                props: { class: 'metrics' },
                children: [
                  {
                    type: 'p',
                    children: [() => `Root: ${root()}`]
                  },
                  {
                    type: 'p',
                    children: [() => `Left: ${left()}`]
                  },
                  {
                    type: 'p',
                    children: [() => `Right: ${right()}`]
                  },
                  {
                    type: 'p',
                    children: [() => `Bottom: ${bottom()}`]
                  },
                  {
                    type: 'p',
                    children: [() => `Left²: ${leftSquared()}`]
                  },
                  {
                    type: 'p',
                    children: [() => `Right²: ${rightSquared()}`]
                  },
                  {
                    type: 'p',
                    children: [() => `Combined: ${combined()}`]
                  }
                ]
              }
            ]
          });
          
          document.getElementById('app').innerHTML = '';
          mount(Component, '#app');
          
          // Single root update should efficiently propagate
          for (let i = 2; i <= 100; i++) {
            root(i);
          }
        }, { 
          iterations: 100,
          measureMemory: true 
        });

        results[`${browserName}-propagation-efficiency`] = result;
        return result.hz;
      } finally {
        await teardownBrowser(browser);
      }
    });
  }
  
  suite.on('complete', () => {
    console.log('\n--- Reactive Benchmark Results ---');
    const stats = calculateStats(Object.values(results));
    if (stats) {
      console.log(`Average Hz: ${stats.avgHz.toFixed(2)}`);
      console.log(`Memory Growth: ${(stats.memoryGrowth / 1024).toFixed(2)} KB`);
      
      // Analyze reactive performance patterns
      const dependencyTrackingResult = Object.entries(results)
        .find(([key]) => key.includes('dependency-tracking'));
      const propagationResult = Object.entries(results)
        .find(([key]) => key.includes('propagation-efficiency'));
        
      if (dependencyTrackingResult && propagationResult) {
        const [, depResult] = dependencyTrackingResult;
        const [, propResult] = propagationResult;
        
        console.log(`Dependency Tracking: ${depResult.hz.toFixed(2)} Hz`);
        console.log(`Propagation Efficiency: ${propResult.hz.toFixed(2)} Hz`);
        
        const efficiency = propResult.hz / depResult.hz;
        if (efficiency > 0.8) {
          console.log('✅ Good reactive propagation efficiency');
        } else if (efficiency > 0.6) {
          console.log('⚠️  Moderate reactive propagation efficiency');
        } else {
          console.log('❌ Poor reactive propagation efficiency');
        }
      }
    }
  });
});