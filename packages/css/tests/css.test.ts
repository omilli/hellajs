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
    expect(content).toContain('@media (max-width: 768px)');
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
});