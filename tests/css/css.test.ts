import { describe, expect, test, beforeEach } from 'bun:test';
import { signal, batch } from '../../packages/core';
import { css, cssVars, cssReset, cssVarsReset, cssRemove } from '../../packages/css';
import { mount } from '../../packages/dom';
import { tick } from '../../utils/tick';

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
    const content = document.getElementById('hella-css')?.textContent || '';
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
    const content = document.getElementById('hella-css')?.textContent || '';
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
    expect(styleEl?.textContent || '').not.toContain('color:blue');

  });

  test("reactive integration", async () => {
    const colorSignal = signal("red");
    const sizeSignal = signal(16);

    const vars = () => cssVars({
      colors: { primary: colorSignal() },
    });

    const className = () => css({
      color: vars().colors.primary,
      fontSize: `${sizeSignal()}px`
    });

    mount({
      tag: 'div',
      props: { class: className },
      children: ['Hello World']
    });

    expect(document.body.innerHTML).toContain(`<div class="c1">Hello World</div>`);

    batch(() => {
      colorSignal("blue");
      sizeSignal(20);
    });

    expect(document.body.innerHTML).toContain(`<div class="c2">Hello World</div>`);
    await tick();

    const varsEl = document.getElementById("hella-vars");
    expect(varsEl!.textContent).toBe(":root{--colors-primary: blue;}");
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
    expect(styleEl?.textContent || '').toBe('');
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
    expect(varsEl?.textContent || '').toBe('');
  });
});