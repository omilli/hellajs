import { describe, expect, test, afterEach, beforeEach } from 'bun:test';
import { css, cssReset, cssVars, cssVarsReset } from "../../packages/css";
import { signal, effect, batch } from "../../packages/core";
import { tick } from '../utils/tick';

// Performance test utilities
let domMutationCount = 0;
let textContentAssignments = 0;
let originalTextContentSetter: any;

function setupDOMMutationTracking() {
  domMutationCount = 0;
  textContentAssignments = 0;
  
  // Track textContent assignments
  const originalDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'textContent');
  if (originalDescriptor && originalDescriptor.set) {
    originalTextContentSetter = originalDescriptor.set;
    Object.defineProperty(Element.prototype, 'textContent', {
      ...originalDescriptor,
      set: function(value: string | null) {
        if (this.hasAttribute && (this.hasAttribute('hella-css') || this.hasAttribute('hella-vars'))) {
          textContentAssignments++;
        }
        return originalTextContentSetter.call(this, value);
      }
    });
  }
  
  // Use MutationObserver to track DOM mutations
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' || mutation.type === 'characterData') {
        const target = mutation.target as Element;
        if (target.hasAttribute && (target.hasAttribute('hella-css') || target.hasAttribute('hella-vars'))) {
          domMutationCount++;
        }
      }
    });
  });
  
  observer.observe(document.head, { childList: true, subtree: true, characterData: true });
  
  return () => {
    observer.disconnect();
    if (originalDescriptor && originalTextContentSetter) {
      Object.defineProperty(Element.prototype, 'textContent', originalDescriptor);
    }
  };
}

beforeEach(() => {
  cssReset();
  cssVarsReset();
});

afterEach(() => {
  cssReset();
  cssVarsReset();
});

describe("CSS Performance Issues", () => {
  describe("Issue 1: Excessive DOM Mutations", () => {
    test('FAILING: should minimize DOM writes for frequent CSS rule changes', async () => {
      const cleanup = setupDOMMutationTracking();
      
      // Simulate frequent style changes
      const color = signal("red");
      let className: string;
      
      const dispose = effect(() => {
        className = css({
          color: color(),
          fontSize: "16px",
          padding: "10px"
        });
      });
      await tick();
      
      const initialMutations = textContentAssignments;
      
      // Change color 10 times rapidly
      for (let i = 0; i < 10; i++) {
        color(`hsl(${i * 36}, 70%, 50%)`);
        await tick();
      }
      
      const totalMutations = textContentAssignments - initialMutations;
      
      // EXPECTED: Should batch updates or use differential updates to minimize DOM writes
      // ACTUAL: Each change triggers complete textContent replacement
      expect(totalMutations).toBeLessThanOrEqual(5); // Should be much less than 10
      
      dispose();
      cleanup();
    });
    
    test('FAILING: should avoid complete stylesheet regeneration on single rule changes', async () => {
      const cleanup = setupDOMMutationTracking();
      
      // Create multiple CSS rules
      const color1 = signal("red");
      const color2 = signal("blue");
      const color3 = signal("green");
      
      let class1: string, class2: string, class3: string;
      
      const dispose1 = effect(() => {
        class1 = css({ color: color1(), padding: "5px" });
      });
      const dispose2 = effect(() => {
        class2 = css({ color: color2(), margin: "10px" });
      });
      const dispose3 = effect(() => {
        class3 = css({ color: color3(), border: "1px solid" });
      });
      await tick();
      
      const initialMutations = textContentAssignments;
      
      // Change only one color - should only update that rule
      color1("orange");
      await tick();
      
      const mutationsAfterSingleChange = textContentAssignments - initialMutations;
      
      // EXPECTED: Only the changed rule should be updated
      // ACTUAL: Entire stylesheet is regenerated from all rules
      const styleEl = document.head.querySelector('style[hella-css]');
      const contentLength = styleEl?.textContent?.length || 0;
      
      // If we're regenerating entire stylesheet, content will be very large
      // Efficient updates should only touch the changed part
      expect(mutationsAfterSingleChange).toBe(1);
      expect(contentLength).toBeLessThan(1000); // Shouldn't regenerate everything
      
      dispose1();
      dispose2();
      dispose3();
      cleanup();
    });
  });

  describe("Issue 2: Redundant String Operations", () => {
    test('FAILING: should cache processed CSS strings and avoid redundant regex operations', async () => {
      const color = signal("#ff0000");
      let processStartTime: number;
      let processEndTime: number;
      
      // First update - establish baseline
      let vars: any;
      const dispose = effect(() => {
        vars = cssVars({
          primary: color(),
          secondary: "#00ff00",
          background: "#ffffff"
        });
      });
      await tick();
      
      // Measure time for subsequent updates with same variables
      processStartTime = performance.now();
      color("#ff0001"); // Minimal change
      await tick();
      processEndTime = performance.now();
      const firstUpdateTime = processEndTime - processStartTime;
      
      // Change back - should be instant if cached properly
      processStartTime = performance.now();
      color("#ff0000"); // Back to original
      await tick();
      processEndTime = performance.now();
      const cachedUpdateTime = processEndTime - processStartTime;
      
      // EXPECTED: Cached update should be significantly faster
      // ACTUAL: Full regex parsing happens every time
      expect(cachedUpdateTime).toBeLessThan(firstUpdateTime * 0.5);
      
      dispose();
    });
    
    test('FAILING: should avoid regex parsing when CSS variables haven\'t changed', async () => {
      const color = signal("#ff0000");
      let regexCallCount = 0;
      
      // Mock String.replace to count regex operations
      const originalReplace = String.prototype.replace;
      String.prototype.replace = function(searchValue: any, replaceValue: any) {
        if (searchValue instanceof RegExp && searchValue.source.includes('root')) {
          regexCallCount++;
        }
        return originalReplace.call(this, searchValue, replaceValue);
      };
      
      let vars: any;
      const dispose = effect(() => {
        vars = cssVars({
          primary: color(),
          secondary: "#00ff00"
        });
      });
      await tick();
      
      const initialRegexCalls = regexCallCount;
      
      // Setting the same value should not trigger regex operations
      color("#ff0000");
      await tick();
      
      const regexCallsAfterNoChange = regexCallCount - initialRegexCalls;
      
      // EXPECTED: No regex operations when value hasn't changed
      // ACTUAL: Regex parsing happens regardless
      expect(regexCallsAfterNoChange).toBe(0);
      
      // Restore original replace
      String.prototype.replace = originalReplace;
      dispose();
    });
  });

  describe("Issue 3: Inefficient Map Operations", () => {
    test('FAILING: should reuse Map instances instead of creating new ones for reactivity', async () => {
      let mapCreationCount = 0;
      
      // Mock Map constructor to count instances
      const OriginalMap = Map;
      (global as any).Map = function(...args: any[]) {
        mapCreationCount++;
        return new OriginalMap(...args);
      };
      Object.setPrototypeOf(Map, OriginalMap);
      
      const color = signal("red");
      let className: string;
      
      const dispose = effect(() => {
        className = css({
          color: color(),
          padding: "10px"
        });
      });
      await tick();
      
      const initialMapCount = mapCreationCount;
      
      // Make 5 color changes
      for (let i = 0; i < 5; i++) {
        color(`hsl(${i * 72}, 70%, 50%)`);
        await tick();
      }
      
      const mapsCreatedAfterChanges = mapCreationCount - initialMapCount;
      
      // EXPECTED: Should reuse existing Map, maybe 1-2 new instances max
      // ACTUAL: New Map created for every single change
      expect(mapsCreatedAfterChanges).toBeLessThan(3);
      
      // Restore original Map
      global.Map = OriginalMap;
      dispose();
    });
  });

  describe("Issue 4: Missing Update Batching", () => {
    test('FAILING: should batch multiple rapid CSS updates into single DOM write', async () => {
      const cleanup = setupDOMMutationTracking();
      
      const color = signal("red");
      const size = signal(16);
      const weight = signal(400);
      
      let className: string;
      const dispose = effect(() => {
        className = css({
          color: color(),
          fontSize: `${size()}px`,
          fontWeight: weight()
        });
      });
      await tick();
      
      const initialMutations = textContentAssignments;
      
      // Make multiple rapid changes - these should be batched
      color("blue");
      size(18);
      weight(600);
      // Don't await tick here - changes should batch before DOM update
      
      await tick(); // Now process batched changes
      
      const mutationsAfterBatch = textContentAssignments - initialMutations;
      
      // EXPECTED: Single DOM update for batched changes
      // ACTUAL: Multiple DOM updates, one per change
      expect(mutationsAfterBatch).toBe(1);
      
      dispose();
      cleanup();
    });
    
    test('FAILING: should use requestAnimationFrame for batching DOM updates', async () => {
      let rafCallCount = 0;
      const originalRAF = requestAnimationFrame;
      
      // Mock requestAnimationFrame to count usage
      (global as any).requestAnimationFrame = (callback: FrameRequestCallback) => {
        rafCallCount++;
        return originalRAF(callback);
      };
      
      const color = signal("red");
      let className: string;
      
      const dispose = effect(() => {
        className = css({
          color: color(),
          padding: "10px"
        });
      });
      await tick();
      
      const initialRAFCalls = rafCallCount;
      
      // Make multiple changes
      for (let i = 0; i < 5; i++) {
        color(`hsl(${i * 72}, 70%, 50%)`);
      }
      await tick();
      
      const rafCallsAfterChanges = rafCallCount - initialRAFCalls;
      
      // EXPECTED: Should use RAF for batching updates
      // ACTUAL: No RAF batching implemented
      expect(rafCallsAfterChanges).toBeGreaterThan(0);
      
      // Restore original RAF
      global.requestAnimationFrame = originalRAF;
      dispose();
    });
  });

  describe("Issue 5: Synchronous DOM Access", () => {
    test('FAILING: should defer DOM operations until next microtask', async () => {
      let syncDomOperations = 0;
      
      // Track synchronous DOM operations
      const originalCreateElement = document.createElement;
      const originalAppendChild = Element.prototype.appendChild;
      
      document.createElement = function(...args: any[]) {
        syncDomOperations++;
        return originalCreateElement.apply(this, args as any);
      };
      
      Element.prototype.appendChild = function(...args: any[]) {
        if (this === document.head) {
          syncDomOperations++;
        }
        return originalAppendChild.apply(this, args as any);
      };
      
      // Create CSS synchronously
      const className = css({
        color: "red",
        fontSize: "16px"
      });
      
      // EXPECTED: DOM operations should be deferred
      // ACTUAL: DOM operations happen synchronously
      expect(syncDomOperations).toBe(0);
      
      await tick(); // Now DOM operations should happen
      expect(syncDomOperations).toBeGreaterThan(0);
      
      // Restore original methods
      document.createElement = originalCreateElement;
      Element.prototype.appendChild = originalAppendChild;
    });
  });

  describe("Performance Baseline", () => {
    test('should demonstrate current poor performance with many updates', async () => {
      const cleanup = setupDOMMutationTracking();
      
      const startTime = performance.now();
      
      // Create 50 different CSS rules with signals
      const colors = Array.from({ length: 50 }, () => signal("red"));
      const disposers: Array<() => void> = [];
      
      colors.forEach((color, i) => {
        const dispose = effect(() => {
          css({
            color: color(),
            padding: `${i}px`,
            margin: "5px"
          });
        });
        disposers.push(dispose);
      });
      
      await tick();
      
      const setupTime = performance.now() - startTime;
      const initialMutations = textContentAssignments;
      
      // Update all colors
      const updateStartTime = performance.now();
      colors.forEach((color, i) => {
        color(`hsl(${i * 7}, 70%, 50%)`);
      });
      await tick();
      
      const updateTime = performance.now() - updateStartTime;
      const totalMutations = textContentAssignments - initialMutations;
      
      // Record current poor performance as baseline
      console.log(`Baseline Performance:
        - Setup time: ${setupTime.toFixed(2)}ms
        - Update time: ${updateTime.toFixed(2)}ms
        - DOM mutations: ${totalMutations}
        - Expected optimal mutations: ~1-5`);
      
      // Clean up
      disposers.forEach(dispose => dispose());
      cleanup();
      
      // These represent the current poor performance - we expect them to fail initially
      expect(updateTime).toBeLessThan(50); // Should be much faster
      expect(totalMutations).toBeLessThan(10); // Should batch updates
    });
  });
});