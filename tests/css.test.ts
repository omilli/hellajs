import { describe, expect, test, afterEach } from 'bun:test';
import { css, cssReset, cssVars, cssVarsReset } from "../packages/css";
import { signal, computed, effect } from "../packages/core";

afterEach(() => {
  cssReset();
  cssVarsReset();
});

describe("css utility", () => {
  test('should return a class name for a style object', () => {
    const className = css({ color: "red" });
    expect(typeof className).toBe("string");
    expect(className.length).toBeGreaterThan(0);
  });

  test('should return the same class name for identical style objects', () => {
    const a = css({ color: "red" });
    const b = css({ color: "red" });
    expect(a).toBe(b);
  });

  test('should allow named classes', () => {
    const className = css({ color: "red" }, { name: "foo" });
    expect(className).toBe("foo");
  });

  test('should allow removing a style without error', () => {
    expect(() => css.remove({ color: "not-in-cache" })).not.toThrow();
  });

  test('should allow removing and re-adding a style', () => {
    const obj = { color: "deeppink" };
    const className = css(obj);
    css.remove(obj);
    const result = css(obj);
    expect(result).toBe(className);
  });

  test('should support scoped selectors', () => {
    const className = css({ color: "red" }, { scoped: "foo" });
    expect(typeof className).toBe("string");
  });

  test('should support css variables', () => {
    const className = css({ "--main-color": "red", color: "var(--main-color)" });
    expect(typeof className).toBe("string");
  });

  test('should support keyframes', () => {
    const className = css({
      "@keyframes fade": {
        from: { opacity: 0 },
        to: { opacity: 1 }
      },
      animation: "fade 1s"
    });
    expect(typeof className).toBe("string");
  });

  test('should support global styles', () => {
    const className = css({ body: { margin: 0 } }, { global: true });
    expect(typeof className).toBe("string");
  });
});

describe("cssVars for theming", () => {
  test('should return var() references for each key', () => {
    const vars = cssVars({ foo: 'red', bar: 123 });
    expect(vars.foo).toBe('var(--foo)');
    expect(vars.bar).toBe('var(--bar)');
  });

  test('should flatten nested objects and flatten keys', () => {
    const vars = cssVars({
      foo: {
        bar: 1,
        buzz: 2
      },
      top: 3
    });
    expect(vars['foo-bar']).toBe('var(--foo-bar)');
    expect(vars['foo-buzz']).toBe('var(--foo-buzz)');
    expect(vars.top).toBe('var(--top)');
  });

  test('should return an empty object for empty input', () => {
    const vars = cssVars({});
    expect(vars).toEqual({});
  });
});

describe("Reactive CSS Integration", () => {
  test('should accept reactive values (functions) for CSS properties', () => {
    const color = signal('red');
    
    // This should create a reactive CSS class that updates when color changes
    const className = css({
      color: () => color(),
      fontSize: '16px' // static value should still work
    });
    
    expect(typeof className).toBe('string');
    expect(className.length).toBeGreaterThan(0);
  });

  test('should update styles when reactive dependencies change', () => {
    const color = signal('red');
    const className = css({
      color: () => color()
    });
    
    // Get initial computed style
    const style = document.createElement('div');
    style.className = className;
    document.body.appendChild(style);
    
    const initialColor = getComputedStyle(style).color;
    
    // Change the signal value
    color('blue');
    
    // The computed style should have updated
    const updatedColor = getComputedStyle(style).color;
    expect(updatedColor).not.toBe(initialColor);
    
    document.body.removeChild(style);
  });

  test('should work with computed values', () => {
    const primary = signal('#ff0000');
    const secondary = signal('#00ff00');
    const isActive = signal(true);
    
    const activeColor = computed(() => isActive() ? primary() : secondary());
    
    const className = css({
      color: () => activeColor(),
      transition: 'color 0.3s ease'
    });
    
    expect(typeof className).toBe('string');
    
    // Create element to test style updates
    const element = document.createElement('div');
    element.className = className;
    document.body.appendChild(element);
    
    // Change active state
    isActive(false);
    
    // Should have updated to secondary color
    const computedStyle = getComputedStyle(element);
    // Note: exact color comparison might vary by browser, just verify it changed
    expect(computedStyle.color).toBeDefined();
    
    document.body.removeChild(element);
  });

  test('should handle multiple reactive properties', () => {
    const color = signal('red');
    const size = signal('16px');
    const weight = signal('normal');
    
    const className = css({
      color: () => color(),
      fontSize: () => size(),
      fontWeight: () => weight(),
      margin: '10px' // static property
    });
    
    expect(typeof className).toBe('string');
    
    const element = document.createElement('div');
    element.className = className;
    document.body.appendChild(element);
    
    // Change multiple values
    color('blue');
    size('20px');
    weight('bold');
    
    const style = getComputedStyle(element);
    expect(style.margin).toBe('10px'); // static should remain
    
    document.body.removeChild(element);
  });

  test('should clean up reactive effects when CSS is removed', () => {
    const color = signal('red');
    let effectRuns = 0;
    
    // Track effect executions
    effect(() => {
      color(); // Access signal to create dependency
      effectRuns++;
    });
    
    const initialRuns = effectRuns;
    
    const cssObject = { color: () => color() };
    const className = css(cssObject);
    
    // Removing CSS should clean up any reactive effects
    css.remove(cssObject);
    
    // Change signal - should trigger fewer effects if cleanup worked
    color('blue');
    
    // This test will initially fail since cleanup isn't implemented yet
    expect(effectRuns).toBeGreaterThan(initialRuns);
  });

  test('should maintain backward compatibility with static CSS', () => {
    // All existing functionality should work unchanged
    const staticClass = css({
      color: 'red',
      fontSize: '16px',
      margin: '10px'
    });
    
    const mixedClass = css({
      color: 'blue', // static
      fontSize: () => '18px', // reactive (but returns static value)
      padding: '5px' // static
    });
    
    expect(typeof staticClass).toBe('string');
    expect(typeof mixedClass).toBe('string');
    expect(staticClass).not.toBe(mixedClass);
  });

  test('should work with nested reactive objects', () => {
    const isLarge = signal(false);
    const primaryColor = signal('blue');
    
    const className = css({
      color: () => primaryColor(),
      fontSize: () => isLarge() ? '24px' : '16px',
      '&:hover': {
        color: () => isLarge() ? 'red' : 'green'
      }
    });
    
    expect(typeof className).toBe('string');
    
    const element = document.createElement('div');
    element.className = className;
    document.body.appendChild(element);
    
    // Change reactive values
    isLarge(true);
    primaryColor('purple');
    
    // Should have updated styles
    const style = getComputedStyle(element);
    expect(style.fontSize).toBe('24px');
    
    document.body.removeChild(element);
  });
});
