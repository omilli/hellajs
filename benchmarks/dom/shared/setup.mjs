import { chromium, firefox, webkit } from 'playwright';

export const BROWSERS = {
  chromium: chromium,
  firefox: firefox,
  webkit: webkit
};

export const DEFAULT_VIEWPORT = { width: 1280, height: 720 };

export async function setupBrowser(browserName = 'chromium') {
  const Browser = BROWSERS[browserName];
  const browser = await Browser.launch({ headless: true });
  const context = await browser.newContext({ 
    viewport: DEFAULT_VIEWPORT,
    // Enable memory profiling and performance tracking
    ignoreHTTPSErrors: true
  });
  
  const page = await context.newPage();
  
  // Set up performance monitoring
  await page.addInitScript(() => {
    window.perfMetrics = {
      marks: new Map(),
      measures: [],
      memory: []
    };
    
    window.startMark = (name) => {
      performance.mark(`${name}-start`);
      window.perfMetrics.marks.set(name, performance.now());
    };
    
    window.endMark = (name) => {
      const endTime = performance.now();
      const startTime = window.perfMetrics.marks.get(name);
      if (startTime) {
        const duration = endTime - startTime;
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
        window.perfMetrics.measures.push({ name, duration });
        return duration;
      }
      return 0;
    };
    
    window.measureMemory = () => {
      if (performance.memory) {
        const memory = {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit,
          timestamp: performance.now()
        };
        window.perfMetrics.memory.push(memory);
        return memory;
      }
      return null;
    };
  });
  
  return { browser, context, page };
}

export async function teardownBrowser(browser) {
  if (browser) {
    await browser.close();
  }
}

export async function getPerformanceMetrics(page) {
  return await page.evaluate(() => ({
    marks: Array.from(window.perfMetrics.marks.entries()),
    measures: window.perfMetrics.measures,
    memory: window.perfMetrics.memory
  }));
}

export async function clearPerformanceMetrics(page) {
  await page.evaluate(() => {
    window.perfMetrics.marks.clear();
    window.perfMetrics.measures = [];
    window.perfMetrics.memory = [];
    performance.clearMarks();
    performance.clearMeasures();
  });
}