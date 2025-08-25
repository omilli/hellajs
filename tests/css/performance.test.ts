import { describe, expect, test, afterEach, beforeEach } from 'bun:test';
import { css, cssReset, cssVars, cssVarsReset } from "../../packages/css";
import { signal, effect, batch } from "../../packages/core";
import { tick } from '../utils/tick';

afterEach(() => {
  cssReset();
  cssVarsReset();
});

describe("CSS Performance", () => {
  describe("DOM Write Optimization", () => {
    test("should minimize DOM mutations during rapid CSS changes", async () => {
      const color = signal("red");
      const size = signal(16);
      
      let domMutationCount = 0;
      const observer = new MutationObserver(() => domMutationCount++);
      
      let className: string = "";
      const dispose = effect(() => {
        className = css({
          color: color(),
          fontSize: `${size()}px`
        });
      });
      await tick();
      
      // Start observing after initial setup
      const styleEl = document.head.querySelector('style[hella-css]');
      if (styleEl) observer.observe(styleEl, { childList: true, characterData: true, subtree: true });
      
      const initialCount = domMutationCount;
      
      // Rapid changes without batching
      color("blue");
      await tick();
      color("green");
      await tick();
      size(18);
      await tick();
      
      const unbatchedMutations = domMutationCount - initialCount;
      
      // Reset counter for batched test
      domMutationCount = 0;
      const resetCount = domMutationCount;
      
      // Same changes with batching
      batch(() => {
        color("purple");
        size(20);
      });
      await tick();
      
      const batchedMutations = domMutationCount - resetCount;
      
      observer.disconnect();
      dispose();
      
      // Batched operations should result in fewer DOM mutations
      expect(batchedMutations).toBeLessThan(unbatchedMutations);
      expect(className).toBeDefined();
    });

    test("should efficiently handle CSS variable updates", async () => {
      const primaryColor = signal("#007acc");
      const secondaryColor = signal("#6c757d");
      
      let variableUpdateCount = 0;
      const observer = new MutationObserver(() => variableUpdateCount++);
      
      let vars: any = null;
      const dispose = effect(() => {
        vars = cssVars({
          primary: primaryColor(),
          secondary: secondaryColor(),
          static: "#ffffff" // This shouldn't cause updates when unchanged
        });
      });
      await tick();
      
      // Start observing after initial setup
      const styleEl = document.head.querySelector('style[hella-vars]');
      if (styleEl) observer.observe(styleEl, { childList: true, characterData: true, subtree: true });
      
      const initialCount = variableUpdateCount;
      
      // Change only primary color
      primaryColor("#ff6b6b");
      await tick();
      
      // Change same value again (should not trigger update)
      primaryColor("#ff6b6b");
      await tick();
      
      // Change secondary color
      secondaryColor("#28a745");
      await tick();
      
      observer.disconnect();
      dispose();
      
      const totalUpdates = variableUpdateCount - initialCount;
      
      // Should only update for actual value changes, not redundant sets
      expect(totalUpdates).toBeLessThanOrEqual(2); // Primary change + secondary change
      expect(vars.primary).toBe("var(--primary)");
    });

    test("should reuse class names for identical styles", async () => {
      const sharedStyle = { color: "red", padding: "10px" };
      
      const class1 = css(sharedStyle);
      const class2 = css(sharedStyle);
      const class3 = css(sharedStyle);
      
      await tick();
      
      // All should return the same class name
      expect(class1).toBe(class2);
      expect(class2).toBe(class3);
      
      // Should only have one CSS rule in DOM for shared styles
      const styleEl = document.head.querySelector('style[hella-css]');
      expect(styleEl).toBeTruthy();
      const cssText = styleEl!.textContent!;
      
      // Count occurrences of the color rule
      const colorRuleMatches = cssText.match(/color:red/g);
      expect(colorRuleMatches).toBeTruthy();
      expect(colorRuleMatches!.length).toBe(1); // Only one instance despite 3 calls
    });

    test("should efficiently batch Map operations during reactive updates", async () => {
      const theme = signal("light");
      
      let mapCreationCount = 0;
      const originalMap = Map;
      // @ts-ignore - Mock Map constructor to count instantiations
      global.Map = class extends originalMap {
        constructor(...args: any[]) {
          super(...args);
          mapCreationCount++;
        }
      } as any;
      
      let className: string = "";
      const dispose = effect(() => {
        className = css({
          backgroundColor: theme() === "light" ? "#fff" : "#000",
          color: theme() === "light" ? "#000" : "#fff"
        });
      });
      await tick();
      
      const initialMapCount = mapCreationCount;
      
      // Multiple rapid theme changes
      theme("dark");
      await tick();
      theme("light");
      await tick();
      theme("dark");
      await tick();
      
      global.Map = originalMap; // Restore original Map
      dispose();
      
      const mapsCreatedDuringUpdates = mapCreationCount - initialMapCount;
      
      // Should minimize Map instance creation during updates
      expect(mapsCreatedDuringUpdates).toBeLessThan(10); // Reasonable upper bound
      expect(className).toBeDefined();
    });

    test("should avoid redundant textContent updates when content hasn't changed", async () => {
      const color = signal("red");
      
      let textContentSetCount = 0;
      const styleEl = document.createElement('style');
      
      // Mock textContent setter to count calls
      Object.defineProperty(styleEl, 'textContent', {
        get() { return this._textContent || ''; },
        set(value) {
          textContentSetCount++;
          this._textContent = value;
        }
      });
      
      document.head.appendChild(styleEl);
      
      let className: string = "";
      const dispose = effect(() => {
        className = css({
          color: color(),
          fontSize: "16px"
        });
      });
      await tick();
      
      const initialSetCount = textContentSetCount;
      
      // Setting same color should not trigger textContent update
      color("red");
      await tick();
      
      // Different color should trigger update
      color("blue");
      await tick();
      
      // Same color again should not trigger update
      color("blue");
      await tick();
      
      styleEl.remove();
      dispose();
      
      const updatesAfterInitial = textContentSetCount - initialSetCount;
      
      // Should only update when content actually changes
      expect(updatesAfterInitial).toBe(1); // Only for red -> blue change
      expect(className).toBeDefined();
    });
  });

  describe("Memory and Performance", () => {
    test("should clean up unused styles to prevent memory leaks", async () => {
      const styles = new Set<string>();
      
      // Create many temporary styles
      for (let i = 0; i < 100; i++) {
        const className = css({ color: `hsl(${i * 3.6}, 50%, 50%)` });
        styles.add(className);
        
        // Remove immediately to test cleanup
        css.remove({ color: `hsl(${i * 3.6}, 50%, 50%)` });
      }
      
      await tick();
      
      const styleEl = document.head.querySelector('style[hella-css]');
      const finalCssText = styleEl?.textContent || '';
      
      // Most styles should be cleaned up
      expect(finalCssText.length).toBeLessThan(1000); // Much smaller than if all styles remained
      expect(styles.size).toBe(100);
    });

    test("should handle high-frequency reactive updates efficiently", async () => {
      const opacity = signal(1.0);
      let updateCount = 0;
      
      const startTime = performance.now();
      
      const dispose = effect(() => {
        updateCount++;
        css({
          opacity: opacity(),
          transition: "opacity 0.1s ease"
        });
      });
      await tick();
      
      // Simulate rapid opacity changes (e.g., animation frames)
      const values = Array.from({ length: 50 }, (_, i) => i / 50);
      
      for (const value of values) {
        opacity(value);
        await tick();
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      dispose();
      
      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(1000); // Less than 1 second
      expect(updateCount).toBe(values.length + 1); // Initial + each value
      expect(opacity()).toBe(0.98); // Final value
    });

    test("should efficiently handle complex nested CSS objects", async () => {
      const isActive = signal(false);
      const scale = signal(1.0);
      
      const startTime = performance.now();
      
      let className: string = "";
      const dispose = effect(() => {
        className = css({
          transform: `scale(${scale()})`,
          opacity: isActive() ? 1 : 0.7,
          transition: "all 0.3s ease",
          
          // Complex nested selectors
          "&:hover": {
            transform: `scale(${scale() * 1.1})`,
            boxShadow: isActive() 
              ? "0 8px 25px rgba(0,0,0,0.15)" 
              : "0 2px 10px rgba(0,0,0,0.1)"
          },
          
          "&::before": {
            content: '""',
            position: "absolute",
            inset: isActive() ? "-2px" : "0",
            background: `linear-gradient(45deg, 
              hsl(${scale() * 180}, 70%, 60%), 
              hsl(${scale() * 360}, 70%, 70%))`
          },
          
          // Media queries
          "@media (max-width: 768px)": {
            transform: `scale(${scale() * 0.8})`,
            fontSize: isActive() ? "16px" : "14px"
          },
          
          "@media (prefers-reduced-motion: reduce)": {
            transition: "none",
            transform: "none"
          }
        });
      });
      await tick();
      
      // Test performance with changes
      batch(() => {
        isActive(true);
        scale(1.2);
      });
      await tick();
      
      batch(() => {
        isActive(false);
        scale(0.9);
      });
      await tick();
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      dispose();
      
      // Complex CSS should still process efficiently
      expect(totalTime).toBeLessThan(500); // Less than 500ms
      expect(className).toBeDefined();
      
      // Verify the complex CSS is in DOM
      const styleEl = document.head.querySelector('style[hella-css]');
      expect(styleEl?.textContent).toContain('linear-gradient');
      expect(styleEl?.textContent).toContain('@media');
      expect(styleEl?.textContent).toContain(':hover');
    });
  });
});