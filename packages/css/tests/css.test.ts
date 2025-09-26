import { describe, expect, test, beforeEach } from 'bun:test';
import { signal, batch, computed } from '@hellajs/core';
import { css, cssVars, cssReset, cssVarsReset, cssRemove } from '../';
import { mount } from '@hellajs/dom';
import { tick } from '../../../utils/tick';

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  cssReset();
  cssVarsReset();

});

describe("css", () => {
  test("basic class generation", () => {
    const className = css({ color: 'red' });
    expect(className).toMatch(/^c\w+$/);
  });

  test("scoped styles", () => {
    const result = css({ color: 'green' }, { scoped: 'container', name: 'custom' });
    expect(result).toBe('custom');
  });

  test("scoped styles with ID selector", async () => {
    const result = css({ color: 'blue' }, { scoped: '#container', name: 'custom' });
    expect(result).toBe('custom');
    await tick();
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('#container .custom{color:blue}');
  });

  test("scoped styles with attribute selector", async () => {
    const result = css({ fontSize: '14px' }, { scoped: '[data-theme="dark"]' });
    expect(result).toMatch(/^c\w+$/);
    await tick();
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('[data-theme="dark"] .');
    expect(content).toContain('font-size:14px');
  });

  test("scoped styles with pseudo selector", async () => {
    const result = css({ padding: '10px' }, { scoped: 'section:nth-child(2)' });
    expect(result).toMatch(/^c\w+$/);
    await tick();
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('section:nth-child(2) .');
    expect(content).toContain('padding:10px');
  });

  test("scoped styles with complex descendant selector", async () => {
    const result = css({ margin: '5px' }, { scoped: 'nav ul li' });
    expect(result).toMatch(/^c\w+$/);
    await tick();
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('nav ul li .');
    expect(content).toContain('margin:5px');
  });

  test("scoped styles with child combinator", async () => {
    const result = css({ display: 'block' }, { scoped: '.sidebar > .menu' });
    expect(result).toMatch(/^c\w+$/);
    await tick();
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('.sidebar > .menu .');
    expect(content).toContain('display:block');
  });

  test("backward compatibility - plain class name", async () => {
    const result = css({ color: 'red' }, { scoped: 'container' });
    expect(result).toMatch(/^c\w+$/);
    await tick();
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('container .');
    expect(content).toContain('color:red');
  });

  test("global styles", () => {
    const result = css({ body: { margin: '0' } }, { global: true });
    expect(result).toBe('');
  });

  test("complex nested styles", async () => {
    css({
      '&:hover': { color: 'red' },
      '@media (max-width: 768px)': { fontSize: '12px' }
    });
    await tick();
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain(':hover{color:red}');
    expect(content).toContain('@media (max-width: 768px){');
    expect(content).toContain('font-size:12px');
  });

  test("media query with nested selectors", async () => {
    css({
      '@media (prefers-color-scheme: dark)': {
        ':root': {
          '--theme-bg': 'black',
          '--theme-color': 'white'
        }
      }
    });
    await tick();
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('@media (prefers-color-scheme: dark){:root{--theme-bg:black;--theme-color:white}}');
  });

  test("null/undefined values ignored", async () => {
    css({
      color: 'blue',
      fontSize: null as any,
      margin: '0'
    });
    await tick();
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('color:blue');
    expect(content).not.toContain('font-size');
  });

  test("cache reuse", () => {
    const styles = { color: 'red' };
    const options = { name: 'cached' };

    const className1 = css(styles, options);
    const className2 = css(styles, options);

    expect(className1).toBe(className2);
    expect(className1).toBe('cached');
  });

  test("removes styles", async () => {
    const styles = { color: 'blue' };
    css(styles);
    cssRemove(styles);

    await tick();

    const styleEl = document.getElementById('hella-css');
    expect(styleEl?.textContent).not.toContain('color:blue');

  });

  test("reactive integration", async () => {
    const colorSignal = signal("red");
    const sizeSignal = signal("16px");

    const vars = cssVars({
      colors: { primary: colorSignal },
      font: { size: sizeSignal }
    });

    const className = css({
      color: vars.colors.primary,
      fontSize: vars.font.size
    });

    mount({
      tag: 'div',
      props: { class: className },
      children: ['Hello World']
    });

    expect(document.body.innerHTML).toContain(`<div class="c1">Hello World</div>`);

    batch(() => {
      colorSignal("blue");
      sizeSignal("20px");
    });

    expect(document.body.innerHTML).toContain(`<div class="c1">Hello World</div>`);
    await tick();

    const varsEl = document.getElementById("hella-vars");
    expect(varsEl!.textContent).toBe(":root{--colors-primary: blue;--font-size: 20px;}");
  });

  test("cssReset clears CSS rules", async () => {
    css({ color: 'red', fontSize: '16px' });
    await tick();

    let styleEl = document.getElementById('hella-css');
    expect(styleEl?.textContent).toContain('color:red');
    expect(styleEl?.textContent).toContain('font-size:16px');

    cssReset();
    await tick();

    styleEl = document.getElementById('hella-css');
    expect(styleEl?.textContent).toBe('');
  });

  test("content property auto-quotes string values", async () => {
    css({
      content: 'Hello World',      // No quotes provided
      '&::before': {
        content: 'Before text'     // No quotes provided
      },
      '&::after': {
        content: '"Already quoted"' // Already has quotes
      }
    });
    await tick();

    const styleEl = document.getElementById('hella-css');
    expect(styleEl?.textContent).toContain('content:"Hello World"');    // Auto-quoted
    expect(styleEl?.textContent).toContain('content:"Before text"');    // Auto-quoted
    expect(styleEl?.textContent).toContain('content:"Already quoted"'); // Preserved
  });
});

describe("cssVars", () => {
  test("caching works", () => {
    const vars1 = { colors: { primary: 'red' } };
    const vars2 = { colors: { primary: 'red' } };

    const result1 = cssVars(vars1);
    const result2 = cssVars(vars2);

    expect(result1).toEqual(result2);
    expect(result1.colors.primary).toBe('var(--colors-primary)');
  });

  test("deep nesting", () => {
    const result = cssVars({ theme: { colors: { primary: { light: '#ff6b6b' } } } });
    const keys = 'theme.colors.primary.light'.split('.');
    let current = result;
    for (const key of keys) {
      current = current[key];
    }
    expect(current).toBe('var(--theme-colors-primary-light)');
  });

  test("cssVarsReset clears CSS variables", async () => {
    cssVars({ colors: { primary: 'purple', secondary: 'green' } });
    await tick();

    let varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toContain('--colors-primary: purple');
    expect(varsEl?.textContent).toContain('--colors-secondary: green');

    cssVarsReset();
    await tick();

    varsEl = document.getElementById("hella-vars");
    expect(varsEl?.textContent).toBe('');
  });

  test("static vars work without effects", () => {
    const vars = cssVars({
      colors: { primary: 'red', secondary: 'blue' },
      spacing: { small: '4px', large: '16px' }
    });

    expect(vars.colors.primary).toBe('var(--colors-primary)');
    expect(vars.colors.secondary).toBe('var(--colors-secondary)');
    expect(vars.spacing.small).toBe('var(--spacing-small)');
    expect(vars.spacing.large).toBe('var(--spacing-large)');
  });

  test("reactive vars track signal dependencies", async () => {
    const primaryColor = signal('red');
    const secondaryColor = signal('blue');

    const vars = cssVars({
      colors: {
        primary: primaryColor,
        secondary: secondaryColor
      }
    });

    await tick();
    let varsEl = document.getElementById("hella-vars");
    expect(varsEl!.textContent).toBe(":root{--colors-primary: red;--colors-secondary: blue;}");

    // Change signals
    batch(() => {
      primaryColor('green');
      secondaryColor('yellow');
    });

    await tick();
    varsEl = document.getElementById("hella-vars");
    expect(varsEl!.textContent).toBe(":root{--colors-primary: green;--colors-secondary: yellow;}");
  });

  test("mixed static and reactive vars", async () => {
    const dynamicColor = signal('purple');

    const vars = cssVars({
      colors: {
        primary: dynamicColor,    // reactive
        secondary: 'orange',      // static
        accent: 'pink'           // static
      },
      spacing: '8px'            // static
    });

    await tick();
    let varsEl = document.getElementById("hella-vars");
    expect(varsEl!.textContent).toContain('--colors-primary: purple');
    expect(varsEl!.textContent).toContain('--colors-secondary: orange');
    expect(varsEl!.textContent).toContain('--spacing: 8px');

    dynamicColor('teal');
    await tick();

    varsEl = document.getElementById("hella-vars");
    expect(varsEl!.textContent).toContain('--colors-primary: teal');
    expect(varsEl!.textContent).toContain('--colors-secondary: orange'); // unchanged
  });

  test("nested reactive dependencies", async () => {
    const theme = signal('dark');
    const size = signal('large');

    const getThemeColor = () => theme() === 'dark' ? '#333' : '#fff';
    const getSize = () => size() === 'large' ? '20px' : '14px';

    const vars = cssVars({
      theme: {
        background: getThemeColor,
        text: () => theme() === 'dark' ? '#fff' : '#000'
      },
      typography: {
        size: getSize
      }
    });

    await tick();
    let varsEl = document.getElementById("hella-vars");
    expect(varsEl!.textContent).toContain('--theme-background: #333');
    expect(varsEl!.textContent).toContain('--theme-text: #fff');
    expect(varsEl!.textContent).toContain('--typography-size: 20px');

    batch(() => {
      theme('light');
      size('small');
    });

    await tick();
    varsEl = document.getElementById("hella-vars");
    expect(varsEl!.textContent).toContain('--theme-background: #fff');
    expect(varsEl!.textContent).toContain('--theme-text: #000');
    expect(varsEl!.textContent).toContain('--typography-size: 14px');
  });

  test("cssVarsReset clears reactive effects", async () => {
    const color = signal('red');
    cssVars({ primary: color });

    await tick();
    expect(document.getElementById("hella-vars")?.textContent).toContain('red');

    cssVarsReset();

    // Signal changes should no longer affect CSS after reset
    color('blue');
    await tick();
    expect(document.getElementById("hella-vars")?.textContent).toBe('');
  });

  test("computed signal integration", async () => {
    const baseColor = signal('ff0000');
    const opacity = signal(0.8);

    const rgba = computed(() => {
      const hex = baseColor();
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity()})`;
    });

    const vars = cssVars({
      colors: {
        primary: rgba
      }
    });

    await tick();
    let varsEl = document.getElementById("hella-vars");
    expect(varsEl!.textContent).toBe(":root{--colors-primary: rgba(255, 0, 0, 0.8);}");

    opacity(0.5);
    await tick();

    varsEl = document.getElementById("hella-vars");
    expect(varsEl!.textContent).toBe(":root{--colors-primary: rgba(255, 0, 0, 0.5);}");
  });

  test("multiple cssVars calls accumulate instead of overwriting", async () => {
    // First set of variables
    const vars1 = cssVars({
      theme: {
        primary: "#ff0000",
        secondary: "#00ff00"
      }
    });

    await tick();
    let varsEl = document.getElementById("hella-vars");
    expect(varsEl!.textContent).toContain("--theme-primary: #ff0000");
    expect(varsEl!.textContent).toContain("--theme-secondary: #00ff00");

    // Second set of variables should accumulate, not overwrite
    const vars2 = cssVars({
      spacing: {
        small: "8px",
        large: "16px"
      }
    });

    await tick();
    varsEl = document.getElementById("hella-vars");

    // Both sets should be present
    expect(varsEl!.textContent).toContain("--theme-primary: #ff0000");
    expect(varsEl!.textContent).toContain("--theme-secondary: #00ff00");
    expect(varsEl!.textContent).toContain("--spacing-small: 8px");
    expect(varsEl!.textContent).toContain("--spacing-large: 16px");

    // Verify both variable references work
    expect(vars1.theme.primary).toBe("var(--theme-primary)");
    expect(vars2.spacing.small).toBe("var(--spacing-small)");
  });

  test("multiple reactive cssVars update independently", async () => {
    const color1 = signal("red");
    const color2 = signal("blue");

    // Create two separate reactive cssVars
    cssVars({
      theme: { primary: color1 }
    });

    cssVars({
      theme: { secondary: color2 }
    });

    await tick();
    let varsEl = document.getElementById("hella-vars");
    expect(varsEl!.textContent).toContain("--theme-primary: red");
    expect(varsEl!.textContent).toContain("--theme-secondary: blue");

    // Change only first signal
    color1("green");
    await tick();

    varsEl = document.getElementById("hella-vars");
    expect(varsEl!.textContent).toContain("--theme-primary: green");
    expect(varsEl!.textContent).toContain("--theme-secondary: blue"); // unchanged

    // Change only second signal
    color2("yellow");
    await tick();

    varsEl = document.getElementById("hella-vars");
    expect(varsEl!.textContent).toContain("--theme-primary: green"); // unchanged
    expect(varsEl!.textContent).toContain("--theme-secondary: yellow");

    // Change both signals
    batch(() => {
      color1("purple");
      color2("orange");
    });
    await tick();

    varsEl = document.getElementById("hella-vars");
    expect(varsEl!.textContent).toContain("--theme-primary: purple");
    expect(varsEl!.textContent).toContain("--theme-secondary: orange");
  });

  test("scoped cssVars with class selector", async () => {
    const vars = cssVars({
      theme: {
        primary: "#ff0000",
        secondary: "#00ff00"
      }
    }, { scoped: ".my-component" });

    await tick();
    let varsEl = document.getElementById("hella-vars");
    expect(varsEl!.textContent).toContain(".my-component{--theme-primary: #ff0000;--theme-secondary: #00ff00;}");

    // Verify variable references work
    expect(vars.theme.primary).toBe("var(--theme-primary)");
    expect(vars.theme.secondary).toBe("var(--theme-secondary)");
  });

  test("scoped cssVars with ID selector", async () => {
    const vars = cssVars({
      layout: {
        padding: "20px",
        margin: "10px"
      }
    }, { scoped: "#main-content" });

    await tick();
    let varsEl = document.getElementById("hella-vars");
    expect(varsEl!.textContent).toContain("#main-content{--layout-padding: 20px;--layout-margin: 10px;}");

    expect(vars.layout.padding).toBe("var(--layout-padding)");
    expect(vars.layout.margin).toBe("var(--layout-margin)");
  });

  test("prefixed cssVars", async () => {
    const vars = cssVars({
      colors: {
        primary: "blue",
        accent: "orange"
      }
    }, { prefix: "comp" });

    await tick();
    let varsEl = document.getElementById("hella-vars");
    expect(varsEl!.textContent).toContain(":root{--comp-colors-primary: blue;--comp-colors-accent: orange;}");

    // Verify prefixed variable references
    expect(vars.colors.primary).toBe("var(--comp-colors-primary)");
    expect(vars.colors.accent).toBe("var(--comp-colors-accent)");
  });

  test("scoped and prefixed cssVars combined", async () => {
    const vars = cssVars({
      typography: {
        size: "16px",
        weight: "bold"
      }
    }, { scoped: ".card", prefix: "ui" });

    await tick();
    let varsEl = document.getElementById("hella-vars");
    expect(varsEl!.textContent).toContain(".card{--ui-typography-size: 16px;--ui-typography-weight: bold;}");

    expect(vars.typography.size).toBe("var(--ui-typography-size)");
    expect(vars.typography.weight).toBe("var(--ui-typography-weight)");
  });

  test("multiple scoped cssVars accumulate", async () => {
    cssVars({
      theme: { primary: "red" }
    }, { scoped: ".header" });

    cssVars({
      theme: { secondary: "blue" }
    }, { scoped: ".footer" });

    cssVars({
      layout: { padding: "10px" }
    }, { scoped: ".header" });

    await tick();
    let varsEl = document.getElementById("hella-vars");
    const content = varsEl!.textContent;
    
    // Should have both scopes
    expect(content).toContain(".header{");
    expect(content).toContain(".footer{");
    
    // Header should have both theme.primary and layout.padding
    expect(content).toContain("--theme-primary: red");
    expect(content).toContain("--layout-padding: 10px");
    
    // Footer should have theme.secondary
    expect(content).toContain("--theme-secondary: blue");
  });

  test("reactive scoped cssVars", async () => {
    const color = signal("green");
    const size = signal("18px");

    cssVars({
      theme: { color: color },
      font: { size: size }
    }, { scoped: ".dynamic", prefix: "dyn" });

    await tick();
    let varsEl = document.getElementById("hella-vars");
    expect(varsEl!.textContent).toContain(".dynamic{--dyn-theme-color: green;--dyn-font-size: 18px;}");

    // Update signals
    batch(() => {
      color("purple");
      size("22px");
    });

    await tick();
    varsEl = document.getElementById("hella-vars");
    expect(varsEl!.textContent).toContain(".dynamic{--dyn-theme-color: purple;--dyn-font-size: 22px;}");
  });

  test("cssVarsReset clears all scoped variables", async () => {
    cssVars({ theme: { primary: "red" } }, { scoped: ".comp1" });
    cssVars({ theme: { secondary: "blue" } }, { scoped: ".comp2" });
    cssVars({ layout: { margin: "10px" } }); // default scope

    await tick();
    let varsEl = document.getElementById("hella-vars");
    expect(varsEl!.textContent).toContain(".comp1");
    expect(varsEl!.textContent).toContain(".comp2");
    expect(varsEl!.textContent).toContain(":root");

    cssVarsReset();
    await tick();

    varsEl = document.getElementById("hella-vars");
    expect(varsEl!.textContent).toBe('');
  });

  test("options caching works correctly", () => {
    const vars1 = { theme: { primary: "red" } };
    const options1 = { scoped: ".test", prefix: "ui" };
    
    const result1 = cssVars(vars1, options1);
    const result2 = cssVars(vars1, options1);
    const result3 = cssVars(vars1, { scoped: ".test", prefix: "ui" });

    // Same vars and options should return same references
    expect(result1).toBe(result2);
    expect(result1).toBe(result3);
    expect(result1.theme.primary).toBe("var(--ui-theme-primary)");
  });
});
