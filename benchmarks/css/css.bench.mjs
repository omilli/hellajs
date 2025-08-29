import { writeFileSync, unlinkSync } from "fs";
import { chromium } from "playwright";
import { Suite } from "benchmark";

const html = `
<!DOCTYPE html>
<html>
<head>
</head>
<body>
  <div id="app"></div>
  <script src="packages/core/dist/core.browser.js"></script>
  <script src="packages/css/dist/css.browser.js"></script>
  <script src="packages/dom/dist/dom.browser.js"></script>
  <script>
    // Helper function for waiting multiple animation frames
    window.waitForFrames = (frameCount = 2) => {
      return new Promise(resolve => {
        let count = 0;
        const waitFrame = () => {
          requestAnimationFrame(() => {
            count++;
            if (count >= frameCount) resolve();
            else waitFrame();
          });
        };
        waitFrame();
      });
    };

    // Performance measurement helpers
    window.benchmarks = {
      // Basic CSS creation
      cssBasic: () => {
        const className = hellajs.css.css({
          color: "blue",
          fontSize: "16px",
          padding: "10px"
        });
        
        hellajs.dom.mount({
          tag: "div",
          props: { class: className },
          children: ["Basic CSS test"]
        }, "#app");
      },

      // CSS with reactive content
      cssReactive: () => {
        const color = hellajs.core.signal("#3b82f6");
        const size = hellajs.core.signal("16px");
        
        hellajs.core.effect(() => {
          const className = hellajs.css.css({
            color: color(),
            fontSize: size(),
            padding: "10px",
            transition: "all 0.3s ease"
          });
          
          hellajs.dom.mount({
            tag: "div",
            props: { class: className },
            children: ["Reactive CSS test"]
          }, "#app");
        });
        
        // Trigger updates
        color("#ef4444");
        size("18px");
      },

      // CSS with nested selectors
      cssNested: () => {
        const className = hellajs.css.css({
          padding: "1rem",
          backgroundColor: "#f8f9fa",
          border: "1px solid #dee2e6",
          borderRadius: "0.5rem",
          
          "&:hover": {
            backgroundColor: "#e9ecef",
            transform: "translateY(-2px)",
            boxShadow: "0 4px 8px rgba(0,0,0,0.1)"
          },
          
          "h2": {
            marginTop: 0,
            color: "#495057",
            fontSize: "1.25rem"
          },
          
          "p": {
            color: "#6c757d",
            lineHeight: "1.6"
          }
        });
        
        hellajs.dom.mount({
          tag: "div",
          props: { class: className },
          children: [
            {
              tag: "h2",
              props: {},
              children: ["Nested CSS"]
            },
            {
              tag: "p",
              props: {},
              children: ["This tests nested selectors and pseudo-classes."]
            }
          ]
        }, "#app");
      },

      // CSS with media queries
      cssResponsive: () => {
        const className = hellajs.css.css({
          fontSize: "14px",
          padding: "0.5rem",
          backgroundColor: "#ffffff",
          
          "@media (min-width: 768px)": {
            fontSize: "16px",
            padding: "1rem"
          },
          
          "@media (min-width: 1024px)": {
            fontSize: "18px",
            padding: "1.5rem"
          },
          
          "@media (prefers-color-scheme: dark)": {
            backgroundColor: "#1a1a1a",
            color: "#ffffff"
          }
        });
        
        hellajs.dom.mount({
          tag: "div",
          props: { class: className },
          children: ["Responsive CSS test"]
        }, "#app");
      },

      // CSS with animations
      cssAnimations: () => {
        const className = hellajs.css.css({
          "@keyframes fadeInBounce": {
            "0%": {
              opacity: 0,
              transform: "translateY(-20px)"
            },
            "50%": {
              opacity: 0.8,
              transform: "translateY(5px)"
            },
            "100%": {
              opacity: 1,
              transform: "translateY(0)"
            }
          },
          
          animation: "fadeInBounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
          padding: "1rem",
          backgroundColor: "#e3f2fd",
          borderLeft: "4px solid #2196f3",
          margin: "0.5rem 0"
        });
        
        hellajs.dom.mount({
          tag: "div",
          props: { class: className },
          children: ["Animated CSS test"]
        }, "#app");
      },

      // Global CSS styles
      cssGlobal: () => {
        hellajs.css.css({
          "body": {
            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
            lineHeight: "1.6",
            margin: 0,
            backgroundColor: "#f5f5f5"
          },
          
          "*": {
            boxSizing: "border-box"
          },
          
          "h1, h2, h3": {
            color: "#333",
            marginBottom: "0.5rem"
          }
        }, { global: true });
      },

      // Scoped CSS
      cssScoped: () => {
        const className = hellajs.css.css({
          color: "#007bff",
          fontSize: "14px",
          fontWeight: "bold",
          padding: "0.5rem",
          backgroundColor: "#f8f9ff",
          border: "1px solid #b3d7ff"
        }, { scoped: "parent-scope" });
        
        hellajs.dom.mount({
          tag: "div",
          props: { 
            class: "parent-scope",
            style: "padding: 1rem; border: 2px solid #ddd; margin: 1rem 0;"
          },
          children: [
            {
              tag: "div",
              props: { class: className },
              children: ["Scoped CSS test"]
            }
          ]
        }, "#app");
      },

      // CSS Variables basic
      cssVarsBasic: () => {
        const theme = hellajs.css.cssVars({
          colors: {
            primary: "#3b82f6",
            secondary: "#64748b",
            success: "#10b981",
            warning: "#f59e0b",
            danger: "#ef4444"
          },
          spacing: {
            xs: "0.25rem",
            sm: "0.5rem",
            md: "1rem",
            lg: "1.5rem",
            xl: "2rem"
          },
          typography: {
            fontFamily: "'Inter', sans-serif",
            fontSize: {
              sm: "0.875rem",
              base: "1rem",
              lg: "1.125rem",
              xl: "1.25rem"
            }
          }
        });
        
        const className = hellajs.css.css({
          backgroundColor: theme["colors-primary"],
          color: "white",
          padding: \`\${theme["spacing-md"]} \${theme["spacing-lg"]}\`,
          fontFamily: theme["typography-fontFamily"],
          fontSize: theme["typography-fontSize-lg"],
          border: "none",
          borderRadius: theme["spacing-sm"],
          cursor: "pointer",
          transition: "all 0.2s ease",
          
          "&:hover": {
            backgroundColor: theme["colors-secondary"]
          }
        });
        
        hellajs.dom.mount({
          tag: "button",
          props: { class: className },
          children: ["CSS Variables test"]
        }, "#app");
      },

      // CSS Variables reactive
      cssVarsReactive: () => {
        const isDark = hellajs.core.signal(false);
        const accentColor = hellajs.core.signal("#3b82f6");
        
        hellajs.core.effect(() => {
          const theme = hellajs.css.cssVars({
            theme: {
              background: isDark() ? "#1a1a1a" : "#ffffff",
              foreground: isDark() ? "#f5f5f5" : "#1a1a1a",
              accent: accentColor(),
              border: isDark() ? "#404040" : "#e5e5e5",
              shadow: isDark() ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
            }
          });
        });
        
        const cardClass = hellajs.css.css({
          backgroundColor: "var(--theme-background)",
          color: "var(--theme-foreground)",
          border: "1px solid var(--theme-border)",
          borderRadius: "0.5rem",
          padding: "1rem",
          margin: "0.5rem 0",
          boxShadow: \`0 2px 4px var(--theme-shadow)\`,
          transition: "all 0.3s ease"
        });
        
        hellajs.dom.mount({
          tag: "div",
          props: { class: cardClass },
          children: [
            {
              tag: "h3",
              props: { style: "margin: 0 0 0.5rem 0; color: var(--theme-accent);" },
              children: ["Reactive CSS Variables"]
            },
            {
              tag: "p", 
              props: { style: "margin: 0;" },
              children: ["This card uses reactive CSS variables that update automatically."]
            }
          ]
        }, "#app");
        
        // Trigger updates
        setTimeout(() => {
          isDark(true);
          accentColor("#ef4444");
        }, 100);
      },

      // CSS with custom class names
      cssCustomNames: () => {
        const buttonClass = hellajs.css.css({
          backgroundColor: "#4f46e5",
          color: "white",
          padding: "0.75rem 1.5rem",
          border: "none",
          borderRadius: "0.375rem",
          fontSize: "0.875rem",
          fontWeight: "600",
          cursor: "pointer",
          transition: "background-color 0.2s ease",
          
          "&:hover": {
            backgroundColor: "#4338ca"
          },
          
          "&:active": {
            backgroundColor: "#3730a3"
          }
        }, { name: "custom-button" });
        
        hellajs.dom.mount({
          tag: "button",
          props: { class: buttonClass },
          children: ["Custom Named CSS"]
        }, "#app");
      },

      // CSS performance stress test
      cssStressTest: () => {
        const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"];
        const items = [];
        
        for (let i = 0; i < 50; i++) {
          const className = hellajs.css.css({
            backgroundColor: colors[i % colors.length],
            color: "white",
            padding: "0.25rem 0.5rem",
            margin: "2px",
            borderRadius: "0.25rem",
            fontSize: "0.75rem",
            display: "inline-block",
            transition: "transform 0.1s ease",
            
            "&:hover": {
              transform: "scale(1.05)"
            }
          });
          
          items.push({
            tag: "span",
            props: { class: className },
            children: [\`Item \${i + 1}\`]
          });
        }
        
        hellajs.dom.mount({
          tag: "div",
          props: {},
          children: items
        }, "#app");
      },

      // CSS cleanup test
      cssCleanup: () => {
        const styles = [];
        const items = [];
        
        // Create multiple styles
        for (let i = 0; i < 10; i++) {
          const style = {
            color: \`hsl(\${i * 36}, 70%, 50%)\`,
            padding: \`\${i + 5}px\`,
            margin: "2px",
            display: "inline-block"
          };
          
          const className = hellajs.css.css(style);
          styles.push({ style, className });
          
          items.push({
            tag: "div",
            props: { class: className },
            children: [\`Style \${i}\`]
          });
        }
        
        hellajs.dom.mount({
          tag: "div",
          props: {},
          children: items
        }, "#app");
        
        // Clean up half of them
        setTimeout(() => {
          for (let i = 0; i < 5; i++) {
            hellajs.css.css.remove(styles[i].style);
          }
        }, 50);
      },

      // Combined CSS and reactive stress test
      cssCombinedStress: () => {
        const count = hellajs.core.signal(0);
        const theme = hellajs.core.signal("light");
        
        hellajs.core.effect(() => {
          const vars = hellajs.css.cssVars({
            counter: {
              bg: theme() === "dark" ? "#2d3748" : "#f7fafc",
              text: theme() === "dark" ? "#e2e8f0" : "#2d3748",
              accent: theme() === "dark" ? "#63b3ed" : "#3182ce"
            }
          });
        });
        
        hellajs.core.effect(() => {
          const containerClass = hellajs.css.css({
            backgroundColor: "var(--counter-bg)",
            color: "var(--counter-text)",
            padding: "1rem",
            borderRadius: "0.5rem",
            border: "2px solid var(--counter-accent)",
            margin: "1rem 0",
            textAlign: "center",
            fontSize: "1.125rem",
            fontWeight: "600",
            transition: "all 0.3s ease"
          });
          
          const countClass = hellajs.css.css({
            fontSize: "2rem",
            color: "var(--counter-accent)",
            fontWeight: "bold",
            margin: "0.5rem 0"
          });
          
          // Clear previous container if exists
          const existingContainer = document.querySelector('.combined-test');
          if (existingContainer) {
            existingContainer.remove();
          }
          
          hellajs.dom.mount({
            tag: "div",
            props: { class: \`\${containerClass} combined-test\` },
            children: [
              {
                tag: "div",
                props: {},
                children: ["Combined CSS + Reactive Test"]
              },
              {
                tag: "div",
                props: { class: countClass },
                children: [\`Count: \${count()}\`]
              },
              {
                tag: "div",
                props: {},
                children: [\`Theme: \${theme()}\`]
              }
            ]
          }, "#app");
        });
        
        // Trigger updates
        for (let i = 1; i <= 5; i++) {
          setTimeout(() => {
            count(i);
            if (i === 3) theme("dark");
          }, i * 20);
        }
      }
    };
  </script>
</body>
</html>
`;

const fileName = "tmp.css-test.html";

writeFileSync(fileName, html);

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-web-security', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();
  await page.goto(`file://${process.cwd()}/${fileName}`);

  const suite = new Suite("CSS Operations");

  // Basic CSS Tests
  suite.add("css - basic styles", {
    defer: true,
    fn: async (deferred) => {
      await page.evaluate(() => benchmarks.cssBasic());
      await page.evaluate(() => waitForFrames(2));
      deferred.resolve();
    },
  });

  suite.add("css - reactive content", {
    defer: true,
    fn: async (deferred) => {
      await page.evaluate(() => benchmarks.cssReactive());
      await page.evaluate(() => waitForFrames(4));
      deferred.resolve();
    },
  });

  suite.add("css - nested selectors", {
    defer: true,
    fn: async (deferred) => {
      await page.evaluate(() => benchmarks.cssNested());
      await page.evaluate(() => waitForFrames(2));
      deferred.resolve();
    },
  });

  suite.add("css - responsive styles", {
    defer: true,
    fn: async (deferred) => {
      await page.evaluate(() => benchmarks.cssResponsive());
      await page.evaluate(() => waitForFrames(2));
      deferred.resolve();
    },
  });

  suite.add("css - animations", {
    defer: true,
    fn: async (deferred) => {
      await page.evaluate(() => benchmarks.cssAnimations());
      await page.evaluate(() => waitForFrames(3));
      deferred.resolve();
    },
  });

  suite.add("css - global styles", {
    defer: true,
    fn: async (deferred) => {
      await page.evaluate(() => benchmarks.cssGlobal());
      await page.evaluate(() => waitForFrames(2));
      deferred.resolve();
    },
  });

  suite.add("css - scoped styles", {
    defer: true,
    fn: async (deferred) => {
      await page.evaluate(() => benchmarks.cssScoped());
      await page.evaluate(() => waitForFrames(2));
      deferred.resolve();
    },
  });

  // CSS Variables Tests
  suite.add("cssVars - basic variables", {
    defer: true,
    fn: async (deferred) => {
      await page.evaluate(() => benchmarks.cssVarsBasic());
      await page.evaluate(() => waitForFrames(2));
      deferred.resolve();
    },
  });

  suite.add("cssVars - reactive variables", {
    defer: true,
    fn: async (deferred) => {
      await page.evaluate(() => benchmarks.cssVarsReactive());
      await page.evaluate(() => waitForFrames(4));
      deferred.resolve();
    },
  });

  // Advanced CSS Tests
  suite.add("css - custom class names", {
    defer: true,
    fn: async (deferred) => {
      await page.evaluate(() => benchmarks.cssCustomNames());
      await page.evaluate(() => waitForFrames(2));
      deferred.resolve();
    },
  });

  suite.add("css - performance stress test", {
    defer: true,
    fn: async (deferred) => {
      await page.evaluate(() => benchmarks.cssStressTest());
      await page.evaluate(() => waitForFrames(3));
      deferred.resolve();
    },
  });

  suite.add("css - cleanup test", {
    defer: true,
    fn: async (deferred) => {
      await page.evaluate(() => benchmarks.cssCleanup());
      await page.evaluate(() => waitForFrames(3));
      deferred.resolve();
    },
  });

  // Combined Tests
  suite.add("css + reactive combined", {
    defer: true,
    fn: async (deferred) => {
      await page.evaluate(() => benchmarks.cssCombinedStress());
      await page.evaluate(() => waitForFrames(8));
      deferred.resolve();
    },
  });

  suite
    .on("cycle", (event) => console.log(String(event.target)))
    .on("complete", async function () {
      await browser.close();
      unlinkSync(fileName);
    })
    .run({ async: true });
})();