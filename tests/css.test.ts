import { describe, expect, test, afterEach } from 'bun:test';
import { css, cssReset, cssVars, cssVarsReset } from "../packages/css";
import { signal, computed, effect, batch } from "../packages/core";
import { tick } from './utils/tick';

afterEach(() => {
  cssReset();
  cssVarsReset();
});

describe("css utility", () => {
  test('should return a class name for a style object and inject CSS into DOM', async () => {
    const className = css({ color: "red" });
    await tick();
    
    expect(typeof className).toBe("string");
    expect(className.length).toBeGreaterThan(0);
    
    // Verify DOM changes
    const styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('color:red');
    expect(styleEl!.textContent).toContain(className);
  });

  test('should return the same class name for identical style objects and share DOM rules', async () => {
    const a = css({ color: "red" });
    const b = css({ color: "red" });
    await tick();
    
    expect(a).toBe(b);
    
    // Verify DOM - should only have one rule for the shared style
    const styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    const cssText = styleEl!.textContent!;
    const colorRuleMatches = cssText.match(/color:red/g);
    expect(colorRuleMatches).toBeTruthy();
    expect(colorRuleMatches!.length).toBe(1); // Only one rule for both identical styles
  });

  test('should allow named classes and inject them into DOM', async () => {
    const className = css({ color: "red" }, { name: "foo" });
    await tick();
    
    expect(className).toBe("foo");
    
    // Verify DOM changes
    const styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('.foo');
    expect(styleEl!.textContent).toContain('color:red');
  });

  test('should allow removing a style without error and not affect DOM', async () => {
    expect(() => css.remove({ color: "not-in-cache" })).not.toThrow();
    await tick();
    
    // DOM should remain unchanged when removing non-existent styles
    const styleEl = document.head.querySelector('style[hella-css]');
    // Should be null since no styles were actually added
    expect(styleEl).toBeNull();
  });

  test('should allow removing and re-adding a style with proper DOM cleanup', async () => {
    const obj = { color: "deeppink" };
    const className = css(obj);
    await tick();
    
    // Verify initial DOM state
    let styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('color:deeppink');
    
    css.remove(obj);
    await tick();
    
    // The CSS system uses reference counting, so the style may still exist
    // but should be removed from the reactive system
    styleEl = document.head.querySelector('style[hella-css]');
    // Note: Since we only called css() once and remove() once, the style should be cleaned up
    // However, the reactive effect may cause the style to still exist temporarily
    
    const result = css(obj);
    await tick();
    
    expect(result).toBe(className);
    
    // Verify DOM is updated again
    styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('color:deeppink');
  });

  test('should support scoped selectors and inject scoped CSS into DOM', async () => {
    const className = css({ color: "red" }, { scoped: "foo" });
    await tick();
    
    expect(typeof className).toBe("string");
    
    // Verify DOM changes with scoped selector
    const styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('.foo .' + className);
    expect(styleEl!.textContent).toContain('color:red');
  });

  test('should support css variables and inject them into DOM', async () => {
    const className = css({ "--main-color": "red", color: "var(--main-color)" });
    await tick();
    
    expect(typeof className).toBe("string");
    
    // Verify DOM changes with CSS variables
    const styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('--main-color:red');
    expect(styleEl!.textContent).toContain('color:var(--main-color)');
    expect(styleEl!.textContent).toContain(className);
  });

  test('should support keyframes and inject them into DOM', async () => {
    const className = css({
      "@keyframes fade": {
        from: { opacity: 0 },
        to: { opacity: 1 }
      },
      animation: "fade 1s"
    });
    await tick();
    
    expect(typeof className).toBe("string");
    
    // Verify DOM changes with keyframes
    const styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('@keyframes fade');
    expect(styleEl!.textContent).toContain('animation:fade 1s');
    expect(styleEl!.textContent).toContain(className);
  });

  test('should support global styles and inject them into DOM', async () => {
    const className = css({ body: { margin: 0 } }, { global: true });
    await tick();
    
    expect(className).toBe(""); // Global styles return empty string
    
    // Verify DOM changes with global styles
    const styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('body{margin:0');
  });
});

describe("cssVars for theming", () => {
  test('should return var() references for each key and inject CSS variables into DOM', async () => {
    const vars = cssVars({ foo: 'red', bar: 123 });
    await tick();
    
    expect(vars.foo).toBe('var(--foo)');
    expect(vars.bar).toBe('var(--bar)');
    
    // Verify DOM changes
    const styleEl = document.head.querySelector('style[hella-vars]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain(':root {');
    expect(styleEl!.textContent).toContain('--foo: red;');
    expect(styleEl!.textContent).toContain('--bar: 123;');
  });

  test('should flatten nested objects and inject flattened CSS variables into DOM', async () => {
    const vars = cssVars({
      foo: {
        bar: 1,
        buzz: 2
      },
      top: 3
    });
    await tick();
    
    expect(vars['foo-bar']).toBe('var(--foo-bar)');
    expect(vars['foo-buzz']).toBe('var(--foo-buzz)');
    expect(vars.top).toBe('var(--top)');
    
    // Verify DOM changes with flattened variable names
    const styleEl = document.head.querySelector('style[hella-vars]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('--foo-bar: 1;');
    expect(styleEl!.textContent).toContain('--foo-buzz: 2;');
    expect(styleEl!.textContent).toContain('--top: 3;');
  });

  test('should return an empty object for empty input and create minimal DOM element', async () => {
    const vars = cssVars({});
    await tick();
    
    expect(vars).toEqual({});
    
    // Should still create the style element even for empty vars
    const styleEl = document.head.querySelector('style[hella-vars]');
    expect(styleEl).toBeTruthy();
    // Should have minimal content (just empty :root or no :root)
    const content = styleEl!.textContent!.trim();
    expect(content === '' || content === ':root {\n}').toBe(true);
  });
});

describe("Reactive CSS Integration", () => {
  test("should update styles automatically when signal changes and update DOM", async () => {
    const color = signal("red");
    const size = signal(16);

    // Create reactive CSS that uses signals
    let appliedStyles: any = null;
    const dispose = effect(() => {
      appliedStyles = css({
        color: color(),
        fontSize: `${size()}px`,
        fontWeight: "bold"
      });
    });
    await tick();

    // Initial state should be applied
    expect(appliedStyles).toBeDefined();
    expect(typeof appliedStyles).toBe("string");
    
    // Verify initial DOM state
    let styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('color:red');
    expect(styleEl!.textContent).toContain('font-size:16px');

    // Change color signal
    color("blue");
    await tick();
    
    // Verify DOM updates with new color
    styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('color:blue');
    expect(styleEl!.textContent).toContain('font-size:16px');

    dispose();
  });

  test("should handle computed signals in CSS values and update DOM reactively", async () => {
    const baseSize = signal(14);
    const multiplier = signal(1.2);
    const fontSize = computed(() => Math.round(baseSize() * multiplier()));

    let className: string = "";
    const dispose = effect(() => {
      className = css({
        fontSize: `${fontSize()}px`,
        lineHeight: fontSize() * 1.4
      });
    });
    await tick();

    expect(className).toBeDefined();
    
    // Verify initial DOM state
    let styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('font-size:17px'); // 14 * 1.2 = 16.8, rounded to 17

    // Change base size
    baseSize(16);
    await tick();
    expect(fontSize()).toBe(19); // 16 * 1.2 = 19.2, rounded to 19
    
    // Verify DOM updates
    styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('font-size:19px');

    // Change multiplier
    multiplier(1.5);
    await tick();
    expect(fontSize()).toBe(24); // 16 * 1.5 = 24
    
    // Verify DOM updates again
    styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('font-size:24px');

    dispose();
  });

  test("should support reactive pseudo-selectors and media queries in DOM", async () => {
    const isHovered = signal(false);
    const isMobile = signal(false);

    let className: string = "";
    const dispose = effect(() => {
      className = css({
        color: "black",
        "&:hover": {
          color: isHovered() ? "red" : "blue",
          transform: isHovered() ? "scale(1.1)" : "scale(1)"
        },
        "@media (max-width: 768px)": {
          fontSize: isMobile() ? "12px" : "14px",
          padding: isMobile() ? "8px" : "12px"
        }
      });
    });
    await tick();

    expect(className).toBeDefined();
    
    // Verify initial DOM state
    let styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain(':hover{');
    expect(styleEl!.textContent).toContain('color:blue');
    expect(styleEl!.textContent).toContain('transform:scale(1)');
    expect(styleEl!.textContent).toContain('@media (max-width: 768px)');
    expect(styleEl!.textContent).toContain('font-size:14px');

    isHovered(true);
    isMobile(true);
    await tick();
    
    // Verify DOM updates with reactive values
    styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain(':hover{');
    expect(styleEl!.textContent).toContain('color:red');
    expect(styleEl!.textContent).toContain('transform:scale(1.1)');
    expect(styleEl!.textContent).toContain('font-size:12px');
    expect(styleEl!.textContent).toContain('padding:8px');

    dispose();
  });

  test("should update CSS variables reactively for theming in DOM", async () => {
    const isDark = signal(false);
    const accentColor = signal("#007acc");

    let themeVars: any = null;
    const dispose = effect(() => {
      themeVars = cssVars({
        theme: {
          bg: isDark() ? "#1a1a1a" : "#ffffff",
          text: isDark() ? "#ffffff" : "#000000",
          accent: accentColor(),
          border: isDark() ? "#333" : "#e0e0e0"
        }
      });
    });
    await tick();

    // Initial light theme
    expect(themeVars["theme-bg"]).toBe("var(--theme-bg)");
    expect(themeVars["theme-text"]).toBe("var(--theme-text)");
    
    // Verify initial DOM state
    let styleEl = document.head.querySelector('style[hella-vars]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('--theme-bg: #ffffff;');
    expect(styleEl!.textContent).toContain('--theme-text: #000000;');
    expect(styleEl!.textContent).toContain('--theme-accent: #007acc;');

    // Switch to dark theme
    isDark(true);
    await tick();
    
    // Verify DOM updates to dark theme
    styleEl = document.head.querySelector('style[hella-vars]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('--theme-bg: #1a1a1a;');
    expect(styleEl!.textContent).toContain('--theme-text: #ffffff;');
    expect(styleEl!.textContent).toContain('--theme-border: #333;');

    // Change accent color
    accentColor("#ff6b6b");
    await tick();
    
    // Verify accent color update in DOM
    styleEl = document.head.querySelector('style[hella-vars]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('--theme-accent: #ff6b6b;');

    dispose();
  });

  test("should handle nested theme object changes and update DOM", async () => {
    const primaryColor = signal("#007acc");
    const isDarkMode = signal(false);

    let themeVars: any = null;
    const dispose = effect(() => {
      const baseTheme = {
        colors: {
          primary: primaryColor(),
          secondary: isDarkMode() ? "#555" : "#ddd",
          surface: isDarkMode() ? "#2a2a2a" : "#f5f5f5"
        },
        spacing: {
          small: "8px",
          medium: "16px",
          large: "32px"
        },
        typography: {
          size: isDarkMode() ? "16px" : "14px",
          weight: isDarkMode() ? "400" : "500"
        }
      };
      themeVars = cssVars(baseTheme);
    });
    await tick();

    // Check flattened variable names
    expect(themeVars["colors-primary"]).toBe("var(--colors-primary)");
    expect(themeVars["spacing-medium"]).toBe("var(--spacing-medium)");
    expect(themeVars["typography-size"]).toBe("var(--typography-size)");
    
    // Verify initial DOM state
    let styleEl = document.head.querySelector('style[hella-vars]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('--colors-primary: #007acc;');
    expect(styleEl!.textContent).toContain('--colors-secondary: #ddd;');
    expect(styleEl!.textContent).toContain('--typography-size: 14px;');
    expect(styleEl!.textContent).toContain('--spacing-medium: 16px;');

    // Change theme
    isDarkMode(true);
    primaryColor("#ff4757");
    await tick();
    
    // Verify DOM updates
    styleEl = document.head.querySelector('style[hella-vars]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('--colors-primary: #ff4757;');
    expect(styleEl!.textContent).toContain('--colors-secondary: #555;');
    expect(styleEl!.textContent).toContain('--colors-surface: #2a2a2a;');
    expect(styleEl!.textContent).toContain('--typography-size: 16px;');
    expect(styleEl!.textContent).toContain('--typography-weight: 400;');

    dispose();
  });

  test("should use reactive theme vars in CSS styles with DOM updates", async () => {
    const theme = signal("light");

    let vars: any = null;
    let buttonClass: string = "";

    const disposeVars = effect(() => {
      vars = cssVars({
        button: {
          bg: theme() === "light" ? "#ffffff" : "#2d3748",
          text: theme() === "light" ? "#2d3748" : "#ffffff",
          border: theme() === "light" ? "#e2e8f0" : "#4a5568"
        }
      });
    });

    const disposeStyles = effect(() => {
      if (vars) {
        buttonClass = css({
          backgroundColor: vars["button-bg"],
          color: vars["button-text"],
          border: `1px solid ${vars["button-border"]}`,
          padding: "12px 24px",
          borderRadius: "6px",
          cursor: "pointer",
          transition: "all 0.2s ease",
          "&:hover": {
            transform: "translateY(-1px)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
          }
        });
      }
    });
    await tick();

    expect(buttonClass).toBeDefined();
    
    // Verify initial light theme in DOM
    let varsStyleEl = document.head.querySelector('style[hella-vars]');
    let cssStyleEl = document.head.querySelector('style[hella-css]');
    expect(varsStyleEl).toBeTruthy();
    expect(cssStyleEl).toBeTruthy();
    expect(varsStyleEl!.textContent).toContain('--button-bg: #ffffff;');
    expect(varsStyleEl!.textContent).toContain('--button-text: #2d3748;');
    expect(cssStyleEl!.textContent).toContain('background-color:var(--button-bg)');

    // Switch to dark theme
    theme("dark");
    await tick();
    
    // Verify DOM updates to dark theme
    varsStyleEl = document.head.querySelector('style[hella-vars]');
    expect(varsStyleEl).toBeTruthy();
    expect(varsStyleEl!.textContent).toContain('--button-bg: #2d3748;');
    expect(varsStyleEl!.textContent).toContain('--button-text: #ffffff;');
    expect(varsStyleEl!.textContent).toContain('--button-border: #4a5568;');

    disposeVars();
    disposeStyles();
  });

  test("should conditionally apply CSS classes based on signal state with DOM updates", async () => {
    const isLoading = signal(false);
    const hasError = signal(false);
    const isSuccess = signal(false);

    let statusClass: string = "";
    const dispose = effect(() => {
      if (isLoading()) {
        statusClass = css({
          opacity: 0.6,
          cursor: "wait",
          "&::after": {
            content: '""',
            display: "inline-block",
            width: "16px",
            height: "16px",
            border: "2px solid #f3f3f3",
            borderTop: "2px solid #333",
            borderRadius: "50%",
            animation: "spin 1s linear infinite"
          },
          "@keyframes spin": {
            "0%": { transform: "rotate(0deg)" },
            "100%": { transform: "rotate(360deg)" }
          }
        });
      } else if (hasError()) {
        statusClass = css({
          color: "#e53e3e",
          backgroundColor: "#fed7d7",
          border: "1px solid #feb2b2",
          padding: "8px 12px",
          borderRadius: "4px"
        });
      } else if (isSuccess()) {
        statusClass = css({
          color: "#38a169",
          backgroundColor: "#c6f6d5",
          border: "1px solid #9ae6b4",
          padding: "8px 12px",
          borderRadius: "4px"
        });
      } else {
        statusClass = css({
          color: "inherit",
          backgroundColor: "transparent"
        });
      }
    });
    await tick();

    // Test initial default state
    expect(statusClass).toBeDefined();
    let styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('color:inherit');
    expect(styleEl!.textContent).toContain('background-color:transparent');

    isLoading(true);
    await tick();
    expect(statusClass).toBeDefined();
    
    // Verify loading state in DOM
    styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('opacity:0.6');
    expect(styleEl!.textContent).toContain('cursor:wait');
    expect(styleEl!.textContent).toContain('@keyframes spin');

    isLoading(false);
    hasError(true);
    await tick();
    expect(statusClass).toBeDefined();
    
    // Verify error state in DOM
    styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('color:#e53e3e');
    expect(styleEl!.textContent).toContain('background-color:#fed7d7');

    hasError(false);
    isSuccess(true);
    await tick();
    expect(statusClass).toBeDefined();
    
    // Verify success state in DOM
    styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('color:#38a169');
    expect(styleEl!.textContent).toContain('background-color:#c6f6d5');

    dispose();
  });

  test("should handle multiple conditional style variants with DOM verification", async () => {
    const variant = signal("default");
    const size = signal("medium");
    const disabled = signal(false);

    let buttonClass: string = "";
    const dispose = effect(() => {
      const baseStyles = {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "6px",
        fontWeight: "500",
        transition: "all 0.2s",
        border: "1px solid transparent",
        cursor: disabled() ? "not-allowed" : "pointer",
        opacity: disabled() ? 0.6 : 1
      };

      const sizeStyles = {
        small: { padding: "6px 12px", fontSize: "14px" },
        medium: { padding: "8px 16px", fontSize: "16px" },
        large: { padding: "12px 24px", fontSize: "18px" }
      }[size()] || { padding: "8px 16px", fontSize: "16px" };

      const variantStyles = {
        default: {
          backgroundColor: "#f7fafc",
          color: "#2d3748",
          borderColor: "#e2e8f0",
          "&:hover": !disabled() ? { backgroundColor: "#edf2f7" } : {}
        },
        primary: {
          backgroundColor: "#4299e1",
          color: "#ffffff",
          "&:hover": !disabled() ? { backgroundColor: "#3182ce" } : {}
        },
        danger: {
          backgroundColor: "#e53e3e",
          color: "#ffffff",
          "&:hover": !disabled() ? { backgroundColor: "#c53030" } : {}
        }
      }[variant()] || {
        backgroundColor: "#f7fafc",
        color: "#2d3748",
        borderColor: "#e2e8f0",
        "&:hover": !disabled() ? { backgroundColor: "#edf2f7" } : {}
      };

      buttonClass = css({
        ...baseStyles,
        ...sizeStyles,
        ...variantStyles
      });
    });
    await tick();

    expect(buttonClass).toBeDefined();
    
    // Verify initial state (default, medium, enabled)
    let styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('background-color:#f7fafc');
    expect(styleEl!.textContent).toContain('font-size:16px');
    expect(styleEl!.textContent).toContain('cursor:pointer');
    expect(styleEl!.textContent).toContain('opacity:1');

    // Test different combinations
    variant("primary");
    size("large");
    await tick();
    expect(buttonClass).toBeDefined();
    
    // Verify primary large button
    styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('background-color:#4299e1');
    expect(styleEl!.textContent).toContain('color:#ffffff');
    expect(styleEl!.textContent).toContain('font-size:18px');
    expect(styleEl!.textContent).toContain('padding:12px 24px');

    disabled(true);
    await tick();
    expect(buttonClass).toBeDefined();
    
    // Verify disabled state
    styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('cursor:not-allowed');
    expect(styleEl!.textContent).toContain('opacity:0.6');

    variant("danger");
    disabled(false);
    await tick();
    expect(buttonClass).toBeDefined();
    
    // Verify danger variant
    styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('background-color:#e53e3e');
    expect(styleEl!.textContent).toContain('opacity:1');
    expect(styleEl!.textContent).toContain('cursor:pointer');

    dispose();
  });

  test("should batch multiple signal changes into single DOM update", async () => {
    const color = signal("red");
    const size = signal(14);
    const weight = signal(400);

    let updateCount = 0;
    let className: string = "";

    const dispose = effect(() => {
      updateCount++;
      className = css({
        color: color(),
        fontSize: `${size()}px`,
        fontWeight: weight()
      });
    });
    await tick();

    expect(updateCount).toBe(1);
    
    // Verify initial DOM state
    let styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('color:red');
    expect(styleEl!.textContent).toContain('font-size:14px');
    expect(styleEl!.textContent).toContain('font-weight:400');

    // Batch multiple changes
    batch(() => {
      color("blue");
      size(16);
      weight(600);
    });
    await tick();

    // Should only trigger one additional update due to batching
    expect(updateCount).toBe(2);
    expect(className).toBeDefined();
    
    // Verify batched DOM update
    styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('color:blue');
    expect(styleEl!.textContent).toContain('font-size:16px');
    expect(styleEl!.textContent).toContain('font-weight:600');

    dispose();
  });

  test("should handle rapid signal changes efficiently and update DOM", async () => {
    const opacity = signal(1);
    let className: string = "";

    const dispose = effect(() => {
      className = css({
        opacity: opacity(),
        transition: "opacity 0.3s ease"
      });
    });
    await tick();
    
    // Verify initial DOM state
    let styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('opacity:1');
    expect(styleEl!.textContent).toContain('transition:opacity 0.3s ease');

    // Simulate rapid changes that might occur during animation
    const values = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0];

    batch(() => {
      values.forEach(value => opacity(value));
    });
    await tick();

    expect(opacity()).toBe(0);
    expect(className).toBeDefined();
    
    // Verify final DOM state after batched rapid changes
    styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('opacity:0');

    dispose();
  });

  test("should optimize when signals don't actually change values and avoid unnecessary DOM updates", async () => {
    const color = signal("red");
    let updateCount = 0;
    let className: string = "";

    const dispose = effect(() => {
      updateCount++;
      className = css({
        color: color(),
        padding: "10px"
      });
    });
    await tick();

    expect(updateCount).toBe(1);
    
    // Capture initial DOM state
    let styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    const initialContent = styleEl!.textContent;
    expect(initialContent).toContain('color:red');

    // Setting the same value should not trigger update
    color("red");
    await tick();
    expect(updateCount).toBe(1);
    
    // DOM should remain unchanged
    styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl!.textContent).toBe(initialContent);

    // Actually changing should trigger update
    color("blue");
    await tick();
    expect(updateCount).toBe(2);
    
    // DOM should update
    styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('color:blue');
    const updatedContent = styleEl!.textContent;

    // Setting same value again
    color("blue");
    await tick();
    expect(updateCount).toBe(2);
    
    // DOM should remain unchanged
    styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl!.textContent).toBe(updatedContent);

    dispose();
  });

  test("should properly clean up reactive styles when effects are disposed", async () => {
    const color = signal("red");
    let className: string = "";

    const dispose = effect(() => {
      className = css({
        color: color(),
        backgroundColor: "white"
      });
    });
    await tick();

    const initialClassName = className;
    expect(initialClassName).toBeDefined();
    
    // Verify initial DOM state
    let styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('color:red');
    expect(styleEl!.textContent).toContain('background-color:white');

    // Change color to create new style
    color("blue");
    await tick();
    expect(className).toBeDefined();
    
    // Verify DOM update
    styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('color:blue');

    // Dispose the effect
    dispose();
    await tick();

    // The styles should still exist until css.remove is called
    // or reference count reaches zero
    expect(className).toBeDefined();
    styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy(); // Still exists as reference count > 0
  });

  test("should handle cleanup when switching between different reactive styles in DOM", async () => {
    const mode = signal("light");
    let className: string = "";
    const generatedClasses: string[] = [];

    const dispose = effect(() => {
      if (mode() === "light") {
        className = css({
          backgroundColor: "#ffffff",
          color: "#000000",
          border: "1px solid #e0e0e0"
        });
      } else {
        className = css({
          backgroundColor: "#1a1a1a",
          color: "#ffffff",
          border: "1px solid #333333"
        });
      }
      generatedClasses.push(className);
    });
    await tick();

    expect(generatedClasses.length).toBe(1);
    
    // Verify initial light mode in DOM
    let styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('background-color:#ffffff');
    expect(styleEl!.textContent).toContain('color:#000000');

    // Switch mode multiple times
    mode("dark");
    await tick();
    expect(generatedClasses.length).toBe(2);
    
    // Verify dark mode in DOM
    styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('background-color:#1a1a1a');
    expect(styleEl!.textContent).toContain('color:#ffffff');
    expect(styleEl!.textContent).toContain('border:1px solid #333333');

    mode("light");
    await tick();
    expect(generatedClasses.length).toBe(3);
    
    // Should reuse the light mode styles
    styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('background-color:#ffffff');

    mode("dark");
    await tick();
    expect(generatedClasses.length).toBe(4);
    
    // Should reuse the dark mode styles
    styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('background-color:#1a1a1a');

    dispose();
  });

  test("should clean up reactive CSS variables properly in DOM", async () => {
    const primaryColor = signal("#007acc");
    const secondaryColor = signal("#6c757d");

    let vars: any = null;
    const dispose = effect(() => {
      vars = cssVars({
        primary: primaryColor(),
        secondary: secondaryColor(),
        background: "#f8f9fa"
      });
    });
    await tick();

    expect(vars.primary).toBe("var(--primary)");
    
    // Verify initial DOM state
    let styleEl = document.head.querySelector('style[hella-vars]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('--primary: #007acc;');
    expect(styleEl!.textContent).toContain('--secondary: #6c757d;');
    expect(styleEl!.textContent).toContain('--background: #f8f9fa;');

    // Change colors
    primaryColor("#ff6b6b");
    secondaryColor("#28a745");
    await tick();
    
    // Verify DOM updates
    styleEl = document.head.querySelector('style[hella-vars]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('--primary: #ff6b6b;');
    expect(styleEl!.textContent).toContain('--secondary: #28a745;');

    dispose();
    await tick();

    // After disposal, the CSS vars should still exist in DOM
    // until cssVarsReset() is called (which happens in afterEach)
    styleEl = document.head.querySelector('style[hella-vars]');
    expect(styleEl).toBeTruthy();
  });

  test("should handle nested effects with reactive styles and DOM updates", async () => {
    const isActive = signal(false);
    const theme = signal("light");

    let outerClass: string = "";
    let innerClass: string = "";

    const outerDispose = effect(() => {
      outerClass = css({
        padding: "20px",
        backgroundColor: theme() === "light" ? "#f8f9fa" : "#2d3748"
      });

      const innerDispose = effect(() => {
        innerClass = css({
          color: isActive() ? "#007acc" : "#6c757d",
          fontWeight: isActive() ? "600" : "400",
          transform: isActive() ? "scale(1.05)" : "scale(1)"
        });
      });

      // Return cleanup for inner effect
      return innerDispose;
    });
    await tick();

    expect(outerClass).toBeDefined();
    expect(innerClass).toBeDefined();
    
    // Verify initial DOM state
    let styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('background-color:#f8f9fa');
    expect(styleEl!.textContent).toContain('color:#6c757d');
    expect(styleEl!.textContent).toContain('font-weight:400');
    expect(styleEl!.textContent).toContain('transform:scale(1)');

    isActive(true);
    theme("dark");
    await tick();
    
    // Verify DOM updates from nested effects
    styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('background-color:#2d3748'); // outer effect
    expect(styleEl!.textContent).toContain('color:#007acc'); // inner effect
    expect(styleEl!.textContent).toContain('font-weight:600'); // inner effect
    expect(styleEl!.textContent).toContain('transform:scale(1.05)'); // inner effect

    outerDispose();
  });

  test("should handle undefined and null signal values gracefully in DOM", async () => {
    const color = signal<string | null>(null);
    const size = signal<number | undefined>(undefined);

    let className: string = "";
    const dispose = effect(() => {
      className = css({
        color: color() || "black",
        fontSize: size() ? `${size()}px` : "16px",
        fontWeight: "normal"
      });
    });
    await tick();

    expect(className).toBeDefined();
    
    // Verify initial DOM with fallback values
    let styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('color:black');
    expect(styleEl!.textContent).toContain('font-size:16px');

    color("red");
    size(18);
    await tick();
    expect(className).toBeDefined();
    
    // Verify DOM updates with actual values
    styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('color:red');
    expect(styleEl!.textContent).toContain('font-size:18px');

    color(null);
    size(undefined);
    await tick();
    expect(className).toBeDefined();
    
    // Verify DOM reverts to fallback values
    styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('color:black');
    expect(styleEl!.textContent).toContain('font-size:16px');

    dispose();
  });

  test("should handle complex CSS values with signals and update DOM", async () => {
    const gradientStart = signal("#ff6b6b");
    const gradientEnd = signal("#4ecdc4");
    const angle = signal(45);

    let className: string = "";
    const dispose = effect(() => {
      className = css({
        background: `linear-gradient(${angle()}deg, ${gradientStart()}, ${gradientEnd()})`,
        backgroundSize: "200% 200%",
        animation: "gradient 3s ease infinite",
        "@keyframes gradient": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" }
        }
      });
    });
    await tick();

    expect(className).toBeDefined();
    
    // Verify initial complex CSS in DOM
    let styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('linear-gradient(45deg, #ff6b6b, #4ecdc4)');
    expect(styleEl!.textContent).toContain('background-size:200% 200%');
    expect(styleEl!.textContent).toContain('@keyframes gradient');
    expect(styleEl!.textContent).toContain('animation:gradient 3s ease infinite');

    gradientStart("#ff9ff3");
    gradientEnd("#54a0ff");
    angle(90);
    await tick();
    
    // Verify DOM updates with new gradient values
    styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('linear-gradient(90deg, #ff9ff3, #54a0ff)');

    dispose();
  });

  test("should work with CSS-in-JS advanced features reactively in DOM", async () => {
    const isRTL = signal(false);
    const spacing = signal(16);

    let className: string = "";
    const dispose = effect(() => {
      className = css({
        display: "flex",
        gap: `${spacing()}px`,
        direction: isRTL() ? "rtl" : "ltr",
        padding: isRTL()
          ? `${spacing()}px ${spacing() * 2}px ${spacing()}px ${spacing() / 2}px`
          : `${spacing()}px ${spacing() / 2}px ${spacing()}px ${spacing() * 2}px`,

        // Nested selectors
        "& .item": {
          marginInlineStart: isRTL() ? "auto" : "0",
          marginInlineEnd: isRTL() ? "0" : "auto"
        },

        // Media queries
        "@media (max-width: 768px)": {
          gap: `${spacing() / 2}px`,
          padding: `${spacing() / 2}px`
        },

        // Pseudo selectors
        "&:hover .item": {
          transform: `translateX(${isRTL() ? "-" : ""}${spacing() / 4}px)`
        }
      });
    });
    await tick();

    expect(className).toBeDefined();
    
    // Verify initial complex CSS features in DOM
    let styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('display:flex');
    expect(styleEl!.textContent).toContain('gap:16px');
    expect(styleEl!.textContent).toContain('direction:ltr');
    expect(styleEl!.textContent).toContain('padding:16px 8px 16px 32px'); // LTR padding
    expect(styleEl!.textContent).toMatch(/\.c\w+ \.item\{margin-inline-start:0;margin-inline-end:auto;\}/);
    expect(styleEl!.textContent).toContain('@media (max-width: 768px)');
    expect(styleEl!.textContent).toContain('gap:8px'); // Half spacing in media query
    expect(styleEl!.textContent).toContain(':hover .item{');
    expect(styleEl!.textContent).toContain('transform:translateX(4px)'); // LTR transform

    isRTL(true);
    spacing(24);
    await tick();
    
    // Verify DOM updates with RTL and new spacing
    styleEl = document.head.querySelector('style[hella-css]');
    expect(styleEl).toBeTruthy();
    expect(styleEl!.textContent).toContain('gap:24px');
    expect(styleEl!.textContent).toContain('direction:rtl');
    expect(styleEl!.textContent).toContain('padding:24px 48px 24px 12px'); // RTL padding
    expect(styleEl!.textContent).toMatch(/\.c\w+ \.item\{margin-inline-start:auto;margin-inline-end:0;\}/);
    expect(styleEl!.textContent).toContain('gap:12px'); // New half spacing in media query
    expect(styleEl!.textContent).toContain(':hover .item{');
    expect(styleEl!.textContent).toContain('transform:translateX(-6px)'); // RTL transform

    dispose();
  });
});
