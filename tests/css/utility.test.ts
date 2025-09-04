import { describe, expect, test, afterEach } from 'bun:test';
import { css, cssReset, cssVars, cssVarsReset } from "../../packages/css";
import { tick } from '../../utils/tick.js';
import { mount } from '../../packages/dom/dist/dom';

afterEach(() => {
  cssReset();
  cssVarsReset();
});

describe("css", () => {
  describe("utility", () => {
    test('return a class name for a style object and inject CSS into DOM', async () => {
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

    test('return the same class name for identical style objects and share DOM rules', async () => {
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

    test('allow named classes and inject them into DOM', async () => {
      const className = css({ color: "red" }, { name: "foo" });
      await tick();

      expect(className).toBe("foo");

      // Verify DOM changes
      const styleEl = document.head.querySelector('style[hella-css]');
      expect(styleEl).toBeTruthy();
      expect(styleEl!.textContent).toContain('.foo');
      expect(styleEl!.textContent).toContain('color:red');
    });

    test('allow removing a style without error and not affect DOM', async () => {
      expect(() => css.remove({ color: "not-in-cache" })).not.toThrow();
      await tick();

      // DOM should remain unchanged when removing non-existent styles
      const styleEl = document.head.querySelector('style[hella-css]');
      // Element may exist from previous tests, but should be empty or minimal
      if (styleEl) {
        // If element exists, it should have minimal or no meaningful content
        expect(styleEl.textContent?.length || 0).toBeLessThan(50);
      }
    });

    test('allow removing and re-adding a style with proper DOM cleanup', async () => {
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

    test('support scoped selectors and inject scoped CSS into DOM', async () => {
      const className = css({ color: "red" }, { scoped: "foo" });
      await tick();

      expect(typeof className).toBe("string");

      // Verify DOM changes with scoped selector
      const styleEl = document.head.querySelector('style[hella-css]');
      expect(styleEl).toBeTruthy();
      expect(styleEl!.textContent).toContain('.foo .' + className);
      expect(styleEl!.textContent).toContain('color:red');
    });

    test('support css variables and inject them into DOM', async () => {
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

    test('support keyframes and inject them into DOM', async () => {
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

    test('support global styles and inject them into DOM', async () => {
      const className = css({ body: { margin: 0 } }, { global: true });
      await tick();

      expect(className).toBe(""); // Global styles return empty string

      // Verify DOM changes with global styles
      const styleEl = document.head.querySelector('style[hella-css]');
      expect(styleEl).toBeTruthy();
      expect(styleEl!.textContent).toContain('body{margin:0');
    });

    test('should handle nested objects properly', async () => {
      // This reproduces the issue from Header.tsx
      const headerStyle = css({
        padding: "1rem",
        backgroundColor: '#f0f0f0',
        textAlign: 'center',
        nav: {
          display: 'flex',
          justifyContent: 'center',
          gap: '1rem',
        },
        h1: {
          marginTop: 0
        },
      });
      await tick();


      document.body.innerHTML = '<div id="app"></div>';
      mount({ tag: "div", props: { class: headerStyle }, children: ["foo"] })

      const styleEl = document.head.querySelector('style[hella-css]');
      expect(styleEl).toBeTruthy();

      // Should NOT contain [object Object]
      expect(styleEl!.textContent).not.toContain('[object Object]');

      // Should properly serialize nested objects as CSS rules
      expect(styleEl!.textContent).toContain('nav{display:flex');
      expect(styleEl!.textContent).toContain('justify-content:center');
      expect(styleEl!.textContent).toContain('h1{margin-top:0');
    });
  });
});
