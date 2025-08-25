import { describe, expect, test, afterEach } from 'bun:test';
import { css, cssReset, cssVars, cssVarsReset } from "../../packages/css";
import { signal, effect, batch } from "../../packages/core";
import { tick } from '../utils/tick';

afterEach(() => {
  cssReset();
  cssVarsReset();
});

describe("CSS Performance Validation", () => {
  test('should handle rapid style updates efficiently', async () => {
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
    
    expect(className).toBeDefined();
    
    // Verify initial DOM state
    let styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('color:red');
    
    // Rapid changes should work without errors
    const startTime = performance.now();
    for (let i = 0; i < 10; i++) {
      color(`hsl(${i * 36}, 70%, 50%)`);
      await tick();
    }
    const endTime = performance.now();
    
    // Should complete quickly (less than 100ms for 10 updates)
    expect(endTime - startTime).toBeLessThan(100);
    
    // Final state should be correct
    styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('hsl(324, 70%, 50%)'); // Last color
    
    dispose();
  });
  
  test('should handle CSS variables updates efficiently', async () => {
    const primary = signal("#ff0000");
    let vars: any;
    
    const dispose = effect(() => {
      vars = cssVars({
        primary: primary(),
        secondary: "#00ff00"
      });
    });
    await tick();
    
    expect(vars.primary).toBe("var(--primary)");
    
    // Verify initial state
    let styleEl = document.head.querySelector('style[hella-vars]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('--primary: #ff0000;');
    
    // Rapid variable changes
    const colors = ['#ff0001', '#ff0002', '#ff0003', '#ff0004', '#ff0005'];
    const startTime = performance.now();
    
    for (const color of colors) {
      primary(color);
      await tick();
    }
    
    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(50);
    
    // Final state should be correct
    styleEl = document.head.querySelector('style[hella-vars]');
    expect(styleEl!.textContent).toContain('--primary: #ff0005;');
    
    dispose();
  });
  
  test('should batch multiple signal changes efficiently', async () => {
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
    
    expect(className).toBeDefined();
    
    // Batch multiple changes
    const startTime = performance.now();
    batch(() => {
      color("blue");
      size(18);
      weight(600);
    });
    await tick();
    const endTime = performance.now();
    
    // Batched update should be very fast
    expect(endTime - startTime).toBeLessThan(20);
    
    // Verify all changes applied
    const styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('color:blue');
    expect(styleEl!.textContent).toContain('font-size:18px');
    expect(styleEl!.textContent).toContain('font-weight:600');
    
    dispose();
  });
  
  test('should handle many CSS rules without performance degradation', async () => {
    const colors = Array.from({ length: 20 }, () => signal("red"));
    const classNames: string[] = [];
    const disposers: Array<() => void> = [];
    
    const startTime = performance.now();
    
    // Create 20 different CSS rules
    colors.forEach((color, i) => {
      const dispose = effect(() => {
        classNames[i] = css({
          color: color(),
          padding: `${i + 1}px`,
          margin: "2px",
          display: "block"
        });
      });
      disposers.push(dispose);
    });
    
    await tick();
    const setupTime = performance.now() - startTime;
    
    // Setup should be reasonable (less than 100ms for 20 rules)
    expect(setupTime).toBeLessThan(100);
    expect(classNames).toHaveLength(20);
    
    // Update all colors simultaneously
    const updateStartTime = performance.now();
    colors.forEach((color, i) => {
      color(`hsl(${i * 18}, 70%, 50%)`);
    });
    await tick();
    const updateTime = performance.now() - updateStartTime;
    
    // Updates should be fast (less than 50ms for 20 simultaneous updates)
    expect(updateTime).toBeLessThan(50);
    
    // Verify stylesheet exists and has content
    const styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent!.length).toBeGreaterThan(100);
    
    // Clean up
    disposers.forEach(dispose => dispose());
  });
  
  test('should optimize when signals don\'t change values', async () => {
    const color = signal("red");
    let updateCount = 0;
    let className: string;
    
    const dispose = effect(() => {
      updateCount++;
      className = css({
        color: color(),
        padding: "10px"
      });
    });
    await tick();
    
    expect(updateCount).toBe(1);
    
    // Setting the same value should not trigger update
    color("red");
    await tick();
    expect(updateCount).toBe(1); // No change
    
    // Actually changing should trigger update
    color("blue");
    await tick();
    expect(updateCount).toBe(2);
    
    // Setting same value again should not trigger update
    color("blue");
    await tick();
    expect(updateCount).toBe(2); // No change
    
    dispose();
  });
});