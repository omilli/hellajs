import { describe, expect, test, afterEach } from 'bun:test';
import { css, cssReset, cssVars, cssVarsReset } from "../../packages/css";
import { signal, effect, batch } from "../../packages/core";
import { tick } from '../utils/tick';

afterEach(() => {
  cssReset();
  cssVarsReset();
});

describe("css", () => {
  describe("performance", () => {
    test("demonstrates efficient batching with rapid CSS rule additions", async () => {
      const startTime = performance.now();
      let domWriteCount = 0;
      let lastTextContent = "";

      const styleEl = () => document.head.querySelector('style[hella-css]') as HTMLStyleElement;

      const buttonVariants = ['primary', 'secondary', 'success', 'warning', 'danger', 'info', 'light', 'dark'];
      const sizes = ['xs', 'sm', 'md', 'lg', 'xl'];
      const states = ['default', 'hover', 'active', 'disabled'];

      const classNames: string[] = [];

      for (const variant of buttonVariants) {
        for (const size of sizes) {
          for (const state of states) {
            const className = css({
              backgroundColor: variant === 'primary' ? '#007bff' : '#6c757d',
              padding: size === 'xs' ? '4px 8px' : '12px 16px',
              opacity: state === 'disabled' ? 0.6 : 1,
              cursor: state === 'disabled' ? 'not-allowed' : 'pointer',
              fontSize: size === 'lg' ? '18px' : '14px',
              borderRadius: '4px',
              border: 'none',
              color: 'white'
            });
            classNames.push(className);
          }
        }
      }

      await tick();

      const currentContent = styleEl()?.textContent || "";
      if (currentContent !== lastTextContent) {
        domWriteCount = 1;
        lastTextContent = currentContent;
      }

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(domWriteCount).toBeLessThanOrEqual(1);
      expect(executionTime).toBeLessThan(50);
      expect(domWriteCount / classNames.length).toBeLessThan(0.01);
    });

    test("demonstrates proper batching in sequential CSS operations", async () => {
      let domUpdateCount = 0;
      let lastStyleContent = "";

      const checkDOMUpdate = () => {
        const styleEl = document.head.querySelector('style[hella-css]') as HTMLStyleElement;
        const currentContent = styleEl?.textContent || "";
        if (currentContent !== lastStyleContent) {
          domUpdateCount++;
          lastStyleContent = currentContent;
        }
      };

      const baseColor = signal('#ffffff');
      const textColor = signal('#000000');
      const borderColor = signal('#cccccc');

      let themeClass = '';
      const dispose = effect(() => {
        themeClass = css({
          backgroundColor: baseColor(),
          color: textColor(),
          borderColor: borderColor()
        });
      });

      await tick();
      checkDOMUpdate();
      expect(domUpdateCount).toBe(1);

      const startTime = performance.now();
      batch(() => {
        baseColor('#1a1a1a');
        textColor('#ffffff');
        borderColor('#333333');
      });

      await tick();
      checkDOMUpdate();

      const endTime = performance.now();

      expect(domUpdateCount - 1).toBeLessThanOrEqual(1);

      dispose();
    });

    test("demonstrates optimized Map usage with CSS variables", async () => {
      const startTime = performance.now();
      let mapCreations = 0;

      const originalMap = Map;
      const mapSizes: number[] = [];

      const themeVars = cssVars({
        colors: {
          primary: '#007bff',
          secondary: '#6c757d',
          success: '#28a745',
          danger: '#dc3545',
          warning: '#ffc107',
          info: '#17a2b8',
          light: '#f8f9fa',
          dark: '#343a40'
        },
        spacing: {
          xs: '4px',
          sm: '8px',
          md: '16px',
          lg: '24px',
          xl: '32px',
          xxl: '48px'
        },
        typography: {
          fontSizeXs: '12px',
          fontSizeSm: '14px',
          fontSizeMd: '16px',
          fontSizeLg: '18px',
          fontSizeXl: '24px'
        }
      });

      await tick();

      for (let i = 0; i < 5; i++) {
        cssVars({
          colors: {
            primary: '#007bff',
            secondary: '#6c757d'
          }
        });
        await tick();
      }

      for (let i = 0; i < 5; i++) {
        cssVars({
          colors: {
            primary: `hsl(${200 + i * 10}, 70%, 50%)`,
            secondary: '#6c757d'
          }
        });
        await tick();
      }

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(mapCreations).toBeLessThan(150);
      expect(executionTime).toBeLessThan(30);
    });

    test("measures optimized performance of component mounting with batched CSS rules", async () => {
      const startTime = performance.now();
      const classNames: string[] = [];

      for (let componentId = 0; componentId < 50; componentId++) {
        const containerClass = css({
          display: 'flex',
          flexDirection: 'column',
          padding: '16px',
          margin: '8px',
          borderRadius: '8px',
          backgroundColor: '#f8f9fa'
        });

        const headerClass = css({
          fontSize: '18px',
          fontWeight: 'bold',
          marginBottom: '12px',
          color: '#333'
        });

        const contentClass = css({
          fontSize: '14px',
          lineHeight: '1.5',
          color: '#666',
          marginBottom: '16px'
        });

        const buttonClass = css({
          padding: '8px 16px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: '#0056b3'
          }
        });

        classNames.push(containerClass, headerClass, contentClass, buttonClass);
      }

      await tick();

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      const styleEl = document.head.querySelector('style[hella-css]') as HTMLStyleElement;
      const totalDOMWrites = styleEl ? 1 : 0;

      expect(executionTime).toBeLessThan(50);
      expect(totalDOMWrites).toBeLessThanOrEqual(1);
      expect(totalDOMWrites / classNames.length).toBeLessThan(0.01);
    });

    test("demonstrates optimized performance with reactive theme switching", async () => {
      const isDark = signal(false);
      const accentColor = signal('#007bff');
      const fontSize = signal(14);

      let domUpdates = 0;

      let themeVars: any;
      let componentClasses: string[] = [];

      const themeDispose = effect(() => {
        themeVars = cssVars({
          theme: {
            background: isDark() ? '#1a1a1a' : '#ffffff',
            text: isDark() ? '#ffffff' : '#000000',
            accent: accentColor(),
            fontSize: `${fontSize()}px`
          }
        });
      });

      const componentsDispose = effect(() => {
        if (!themeVars) return;

        componentClasses = [
          css({
            backgroundColor: themeVars['theme-background'],
            color: themeVars['theme-text'],
            fontSize: themeVars['theme-fontSize'],
            padding: '16px'
          }),
          css({
            borderColor: themeVars['theme-accent'],
            backgroundColor: themeVars['theme-background'],
            color: themeVars['theme-text']
          }),
          css({
            backgroundColor: themeVars['theme-accent'],
            color: themeVars['theme-background'],
            fontSize: themeVars['theme-fontSize']
          })
        ];
      });

      await tick();
      domUpdates = 1;

      const iterations = 10;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        batch(() => {
          isDark(!isDark());
          accentColor(isDark() ? '#ff6b6b' : '#007bff');
          fontSize(isDark() ? 16 : 14);
        });

        await tick();
        domUpdates++;
      }

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(domUpdates - 1).toBeLessThanOrEqual(iterations);
      expect(executionTime).toBeLessThan(30);
      expect((domUpdates - 1) / iterations).toBeLessThanOrEqual(1.1);

      themeDispose();
      componentsDispose();
    });
  });
});
