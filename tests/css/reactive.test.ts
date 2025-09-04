import { describe, expect, test, afterEach } from 'bun:test';
import { css, cssReset, cssVars, cssVarsReset } from "../../packages/css";
import { signal, computed, effect, batch } from "../../packages/core";
import { tick } from '../../utils/tick.js';

afterEach(() => {
  cssReset();
  cssVarsReset();
});

describe("css", () => {
  describe("reactive", () => {
    test("update styles automatically when signal changes and update DOM", async () => {
      const color = signal("red");
      const size = signal(16);

      let appliedStyles: any = null;
      const dispose = effect(() => {
        appliedStyles = css({
          color: color(),
          fontSize: `${size()}px`,
          fontWeight: "bold"
        });
      });
      await tick();

      expect(appliedStyles).toBeDefined();
      expect(typeof appliedStyles).toBe("string");

      let styleEl = document.head.querySelector('style[hella-css]');
      expect(styleEl).toBeTruthy();
      expect(styleEl!.textContent).toContain('color:red');
      expect(styleEl!.textContent).toContain('font-size:16px');

      color("blue");
      await tick();

      styleEl = document.head.querySelector('style[hella-css]');
      expect(styleEl).toBeTruthy();
      expect(styleEl!.textContent).toContain('color:blue');
      expect(styleEl!.textContent).toContain('font-size:16px');

      dispose();
    });

    test("handle computed signals in CSS values and update DOM reactively", async () => {
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

      let styleEl = document.head.querySelector('style[hella-css]');
      expect(styleEl).toBeTruthy();
      expect(styleEl!.textContent).toContain('font-size:17px');

      baseSize(16);
      await tick();
      expect(fontSize()).toBe(19);

      styleEl = document.head.querySelector('style[hella-css]');
      expect(styleEl).toBeTruthy();
      expect(styleEl!.textContent).toContain('font-size:19px');

      multiplier(1.5);
      await tick();
      expect(fontSize()).toBe(24);

      styleEl = document.head.querySelector('style[hella-css]');
      expect(styleEl).toBeTruthy();
      expect(styleEl!.textContent).toContain('font-size:24px');

      dispose();
    });

    test("support reactive pseudo-selectors and media queries in DOM", async () => {
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

      styleEl = document.head.querySelector('style[hella-css]');
      expect(styleEl).toBeTruthy();
      expect(styleEl!.textContent).toContain(':hover{');
      expect(styleEl!.textContent).toContain('color:red');
      expect(styleEl!.textContent).toContain('transform:scale(1.1)');
      expect(styleEl!.textContent).toContain('font-size:12px');
      expect(styleEl!.textContent).toContain('padding:8px');

      dispose();
    });

    test("update CSS variables reactively for theming in DOM", async () => {
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

      expect(themeVars["theme-bg"]).toBe("var(--theme-bg)");
      expect(themeVars["theme-text"]).toBe("var(--theme-text)");

      let styleEl = document.head.querySelector('style[hella-vars]');
      expect(styleEl).toBeTruthy();
      expect(styleEl!.textContent).toContain('--theme-bg: #ffffff;');
      expect(styleEl!.textContent).toContain('--theme-text: #000000;');
      expect(styleEl!.textContent).toContain('--theme-accent: #007acc;');

      isDark(true);
      await tick();

      styleEl = document.head.querySelector('style[hella-vars]');
      expect(styleEl).toBeTruthy();
      expect(styleEl!.textContent).toContain('--theme-bg: #1a1a1a;');
      expect(styleEl!.textContent).toContain('--theme-text: #ffffff;');
      expect(styleEl!.textContent).toContain('--theme-border: #333;');

      accentColor("#ff6b6b");
      await tick();

      styleEl = document.head.querySelector('style[hella-vars]');
      expect(styleEl).toBeTruthy();
      expect(styleEl!.textContent).toContain('--theme-accent: #ff6b6b;');

      dispose();
    });

    test("handle nested theme object changes and update DOM", async () => {
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

      expect(themeVars["colors-primary"]).toBe("var(--colors-primary)");
      expect(themeVars["spacing-medium"]).toBe("var(--spacing-medium)");
      expect(themeVars["typography-size"]).toBe("var(--typography-size)");

      let styleEl = document.head.querySelector('style[hella-vars]');
      expect(styleEl).toBeTruthy();
      expect(styleEl!.textContent).toContain('--colors-primary: #007acc;');
      expect(styleEl!.textContent).toContain('--colors-secondary: #ddd;');
      expect(styleEl!.textContent).toContain('--typography-size: 14px;');
      expect(styleEl!.textContent).toContain('--spacing-medium: 16px;');

      isDarkMode(true);
      primaryColor("#ff4757");
      await tick();

      styleEl = document.head.querySelector('style[hella-vars]');
      expect(styleEl).toBeTruthy();
      expect(styleEl!.textContent).toContain('--colors-primary: #ff4757;');
      expect(styleEl!.textContent).toContain('--colors-secondary: #555;');
      expect(styleEl!.textContent).toContain('--colors-surface: #2a2a2a;');
      expect(styleEl!.textContent).toContain('--typography-size: 16px;');
      expect(styleEl!.textContent).toContain('--typography-weight: 400;');

      dispose();
    });

    test("use reactive theme vars in CSS styles with DOM updates", async () => {
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

      let varsStyleEl = document.head.querySelector('style[hella-vars]');
      let cssStyleEl = document.head.querySelector('style[hella-css]');
      expect(varsStyleEl).toBeTruthy();
      expect(cssStyleEl).toBeTruthy();
      expect(varsStyleEl!.textContent).toContain('--button-bg: #ffffff;');
      expect(varsStyleEl!.textContent).toContain('--button-text: #2d3748;');
      expect(cssStyleEl!.textContent).toContain('background-color:var(--button-bg)');

      theme("dark");
      await tick();

      varsStyleEl = document.head.querySelector('style[hella-vars]');
      expect(varsStyleEl).toBeTruthy();
      expect(varsStyleEl!.textContent).toContain('--button-bg: #2d3748;');
      expect(varsStyleEl!.textContent).toContain('--button-text: #ffffff;');
      expect(varsStyleEl!.textContent).toContain('--button-border: #4a5568;');

      disposeVars();
      disposeStyles();
    });

    test("conditionally apply CSS classes based on signal state with DOM updates", async () => {
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

      expect(statusClass).toBeDefined();
      let styleEl = document.head.querySelector('style[hella-css]');
      expect(styleEl).toBeTruthy();
      expect(styleEl!.textContent).toContain('color:inherit');
      expect(styleEl!.textContent).toContain('background-color:transparent');

      isLoading(true);
      await tick();
      expect(statusClass).toBeDefined();

      styleEl = document.head.querySelector('style[hella-css]');
      expect(styleEl).toBeTruthy();
      expect(styleEl!.textContent).toContain('opacity:0.6');
      expect(styleEl!.textContent).toContain('cursor:wait');
      expect(styleEl!.textContent).toContain('@keyframes spin');

      isLoading(false);
      hasError(true);
      await tick();
      expect(statusClass).toBeDefined();

      styleEl = document.head.querySelector('style[hella-css]');
      expect(styleEl).toBeTruthy();
      expect(styleEl!.textContent).toContain('color:#e53e3e');
      expect(styleEl!.textContent).toContain('background-color:#fed7d7');

      hasError(false);
      isSuccess(true);
      await tick();
      expect(statusClass).toBeDefined();

      styleEl = document.head.querySelector('style[hella-css]');
      expect(styleEl).toBeTruthy();
      expect(styleEl!.textContent).toContain('color:#38a169');
      expect(styleEl!.textContent).toContain('background-color:#c6f6d5');

      dispose();
    });

    test("handle multiple conditional style variants with DOM verification", async () => {
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

      let styleEl = document.head.querySelector('style[hella-css]');
      expect(styleEl).toBeTruthy();
      expect(styleEl!.textContent).toContain('background-color:#f7fafc');
      expect(styleEl!.textContent).toContain('font-size:16px');
      expect(styleEl!.textContent).toContain('cursor:pointer');
      expect(styleEl!.textContent).toContain('opacity:1');

      variant("primary");
      size("large");
      await tick();
      expect(buttonClass).toBeDefined();

      styleEl = document.head.querySelector('style[hella-css]');
      expect(styleEl).toBeTruthy();
      expect(styleEl!.textContent).toContain('background-color:#4299e1');
      expect(styleEl!.textContent).toContain('color:#ffffff');
      expect(styleEl!.textContent).toContain('font-size:18px');
      expect(styleEl!.textContent).toContain('padding:12px 24px');

      disabled(true);
      await tick();
      expect(buttonClass).toBeDefined();

      styleEl = document.head.querySelector('style[hella-css]');
      expect(styleEl).toBeTruthy();
      expect(styleEl!.textContent).toContain('cursor:not-allowed');
      expect(styleEl!.textContent).toContain('opacity:0.6');

      variant("danger");
      disabled(false);
      await tick();
      expect(buttonClass).toBeDefined();

      styleEl = document.head.querySelector('style[hella-css]');
      expect(styleEl).toBeTruthy();
      expect(styleEl!.textContent).toContain('background-color:#e53e3e');
      expect(styleEl!.textContent).toContain('opacity:1');
      expect(styleEl!.textContent).toContain('cursor:pointer');

      dispose();
    });

    test("batch multiple signal changes into single DOM update", async () => {
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

      let styleEl = document.head.querySelector('style[hella-css]');
      expect(styleEl).toBeTruthy();
      expect(styleEl!.textContent).toContain('color:red');
      expect(styleEl!.textContent).toContain('font-size:14px');
      expect(styleEl!.textContent).toContain('font-weight:400');

      batch(() => {
        color("blue");
        size(16);
        weight(600);
      });
      await tick();

      expect(updateCount).toBe(2);
      expect(className).toBeDefined();

      styleEl = document.head.querySelector('style[hella-css]');
      expect(styleEl).toBeTruthy();
      expect(styleEl!.textContent).toContain('color:blue');
      expect(styleEl!.textContent).toContain('font-size:16px');
      expect(styleEl!.textContent).toContain('font-weight:600');

      dispose();
    });

    test("handle rapid signal changes efficiently and update DOM", async () => {
      const opacity = signal(1);
      let className: string = "";

      const dispose = effect(() => {
        className = css({
          opacity: opacity(),
          transition: "opacity 0.3s ease"
        });
      });
      await tick();

      let styleEl = document.head.querySelector('style[hella-css]');
      expect(styleEl).toBeTruthy();
      expect(styleEl!.textContent).toContain('opacity:1');
      expect(styleEl!.textContent).toContain('transition:opacity 0.3s ease');

      const values = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0];

      batch(() => {
        values.forEach(value => opacity(value));
      });
      await tick();

      expect(opacity()).toBe(0);
      expect(className).toBeDefined();

      styleEl = document.head.querySelector('style[hella-css]');
      expect(styleEl).toBeTruthy();
      expect(styleEl!.textContent).toContain('opacity:0');

      dispose();
    });

    test("optimize when signals don't actually change values and avoid unnecessary DOM updates", async () => {
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

      let styleEl = document.head.querySelector('style[hella-css]');
      expect(styleEl).toBeTruthy();
      const initialContent = styleEl!.textContent;
      expect(initialContent).toContain('color:red');

      color("red");
      await tick();
      expect(updateCount).toBe(1);

      styleEl = document.head.querySelector('style[hella-css]');
      expect(styleEl!.textContent).toBe(initialContent);

      color("blue");
      await tick();
      expect(updateCount).toBe(2);

      styleEl = document.head.querySelector('style[hella-css]');
      expect(styleEl).toBeTruthy();
      expect(styleEl!.textContent).toContain('color:blue');
      const updatedContent = styleEl!.textContent;

      color("blue");
      await tick();
      expect(updateCount).toBe(2);

      styleEl = document.head.querySelector('style[hella-css]');
      expect(styleEl!.textContent).toBe(updatedContent);

      dispose();
    });

    test("properly clean up reactive styles when effects are disposed", async () => {
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

      let styleEl = document.head.querySelector('style[hella-css]');
      expect(styleEl).toBeTruthy();
      expect(styleEl!.textContent).toContain('color:red');
      expect(styleEl!.textContent).toContain('background-color:white');

      color("blue");
      await tick();
      expect(className).toBeDefined();

      styleEl = document.head.querySelector('style[hella-css]');
      expect(styleEl).toBeTruthy();
      expect(styleEl!.textContent).toContain('color:blue');

      dispose();
      await tick();

      expect(className).toBeDefined();
      styleEl = document.head.querySelector('style[hella-css]');
      expect(styleEl).toBeTruthy();
    });

    test("handle cleanup when switching between different reactive styles in DOM", async () => {
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

      let styleEl = document.head.querySelector('style[hella-css]');
      expect(styleEl).toBeTruthy();
      expect(styleEl!.textContent).toContain('background-color:#ffffff');
      expect(styleEl!.textContent).toContain('color:#000000');

      mode("dark");
      await tick();
      expect(generatedClasses.length).toBe(2);

      styleEl = document.head.querySelector('style[hella-css]');
      expect(styleEl).toBeTruthy();
      expect(styleEl!.textContent).toContain('background-color:#1a1a1a');
      expect(styleEl!.textContent).toContain('color:#ffffff');
      expect(styleEl!.textContent).toContain('border:1px solid #333333');

      mode("light");
      await tick();
      expect(generatedClasses.length).toBe(3);

      styleEl = document.head.querySelector('style[hella-css]');
      expect(styleEl).toBeTruthy();
      expect(styleEl!.textContent).toContain('background-color:#ffffff');

      mode("dark");
      await tick();
      expect(generatedClasses.length).toBe(4);

      styleEl = document.head.querySelector('style[hella-css]');
      expect(styleEl).toBeTruthy();
      expect(styleEl!.textContent).toContain('background-color:#1a1a1a');

      dispose();
    });

    test("clean up reactive CSS variables properly in DOM", async () => {
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

      let styleEl = document.head.querySelector('style[hella-vars]');
      expect(styleEl).toBeTruthy();
      expect(styleEl!.textContent).toContain('--primary: #007acc;');
      expect(styleEl!.textContent).toContain('--secondary: #6c757d;');
      expect(styleEl!.textContent).toContain('--background: #f8f9fa;');

      primaryColor("#ff6b6b");
      secondaryColor("#28a745");
      await tick();

      styleEl = document.head.querySelector('style[hella-vars]');
      expect(styleEl).toBeTruthy();
      expect(styleEl!.textContent).toContain('--primary: #ff6b6b;');
      expect(styleEl!.textContent).toContain('--secondary: #28a745;');

      dispose();
      await tick();

      styleEl = document.head.querySelector('style[hella-vars]');
      expect(styleEl).toBeTruthy();
    });

    test("handle nested effects with reactive styles and DOM updates", async () => {
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

        return innerDispose;
      });
      await tick();

      expect(outerClass).toBeDefined();
      expect(innerClass).toBeDefined();

      let styleEl = document.head.querySelector('style[hella-css]');
      expect(styleEl).toBeTruthy();
      expect(styleEl!.textContent).toContain('background-color:#f8f9fa');
      expect(styleEl!.textContent).toContain('color:#6c757d');
      expect(styleEl!.textContent).toContain('font-weight:400');
      expect(styleEl!.textContent).toContain('transform:scale(1)');

      isActive(true);
      theme("dark");
      await tick();

      styleEl = document.head.querySelector('style[hella-css]');
      expect(styleEl).toBeTruthy();
      expect(styleEl!.textContent).toContain('background-color:#2d3748');
      expect(styleEl!.textContent).toContain('color:#007acc');
      expect(styleEl!.textContent).toContain('font-weight:600');
      expect(styleEl!.textContent).toContain('transform:scale(1.05)');

      outerDispose();
    });

    test("handle undefined and null signal values gracefully in DOM", async () => {
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

      let styleEl = document.head.querySelector('style[hella-css]');
      expect(styleEl).toBeTruthy();
      expect(styleEl!.textContent).toContain('color:black');
      expect(styleEl!.textContent).toContain('font-size:16px');

      color("red");
      size(18);
      await tick();
      expect(className).toBeDefined();

      styleEl = document.head.querySelector('style[hella-css]');
      expect(styleEl).toBeTruthy();
      expect(styleEl!.textContent).toContain('color:red');
      expect(styleEl!.textContent).toContain('font-size:18px');

      color(null);
      size(undefined);
      await tick();
      expect(className).toBeDefined();

      styleEl = document.head.querySelector('style[hella-css]');
      expect(styleEl).toBeTruthy();
      expect(styleEl!.textContent).toContain('color:black');
      expect(styleEl!.textContent).toContain('font-size:16px');

      dispose();
    });

    test("handle complex CSS values with signals and update DOM", async () => {
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

      styleEl = document.head.querySelector('style[hella-css]');
      expect(styleEl).toBeTruthy();
      expect(styleEl!.textContent).toContain('linear-gradient(90deg, #ff9ff3, #54a0ff)');

      dispose();
    });

    test("works with CSS-in-JS advanced features reactively in DOM", async () => {
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

          "& .item": {
            marginInlineStart: isRTL() ? "auto" : "0",
            marginInlineEnd: isRTL() ? "0" : "auto"
          },

          "@media (max-width: 768px)": {
            gap: `${spacing() / 2}px`,
            padding: `${spacing() / 2}px`
          },

          "&:hover .item": {
            transform: `translateX(${isRTL() ? "-" : ""}${spacing() / 4}px)`
          }
        });
      });
      await tick();

      expect(className).toBeDefined();

      let styleEl = document.head.querySelector('style[hella-css]');
      expect(styleEl).toBeTruthy();
      expect(styleEl!.textContent).toContain('display:flex');
      expect(styleEl!.textContent).toContain('gap:16px');
      expect(styleEl!.textContent).toContain('direction:ltr');
      expect(styleEl!.textContent).toContain('padding:16px 8px 16px 32px');
      expect(styleEl!.textContent).toContain('.item{margin-inline-start:0;margin-inline-end:auto}');
      expect(styleEl!.textContent).toContain('@media (max-width: 768px)');
      expect(styleEl!.textContent).toContain('gap:8px');
      expect(styleEl!.textContent).toContain(':hover .item{');
      expect(styleEl!.textContent).toContain('transform:translateX(4px)');

      isRTL(true);
      spacing(24);
      await tick();

      styleEl = document.head.querySelector('style[hella-css]');
      expect(styleEl).toBeTruthy();
      expect(styleEl!.textContent).toContain('gap:24px');
      expect(styleEl!.textContent).toContain('direction:rtl');
      expect(styleEl!.textContent).toContain('padding:24px 48px 24px 12px');
      expect(styleEl!.textContent).toContain('.item{margin-inline-start:auto;margin-inline-end:0}');
      expect(styleEl!.textContent).toContain('gap:12px');
      expect(styleEl!.textContent).toContain(':hover .item{');
      expect(styleEl!.textContent).toContain('transform:translateX(-6px)');

      dispose();
    });
  });
});
