import { describe, expect, test, beforeEach } from "bun:test";
import { css, cssVars, cssReset, cssVarsReset, cssRemove } from "@hellajs/css/bundle";
import { mount } from "@hellajs/dom/mount";

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
    await flush();
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('#container .custom{color:blue}');
  });

  test("scoped styles with attribute selector", async () => {
    const result = css({ fontSize: '14px' }, { scoped: '[data-theme="dark"]' });
    expect(result).toMatch(/^c\w+$/);
    await flush();
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('[data-theme="dark"] .');
    expect(content).toContain('font-size:14px');
  });

  test("scoped styles with pseudo selector", async () => {
    const result = css({ padding: '10px' }, { scoped: 'section:nth-child(2)' });
    expect(result).toMatch(/^c\w+$/);
    await flush();
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('section:nth-child(2) .');
    expect(content).toContain('padding:10px');
  });

  test("scoped styles with complex descendant selector", async () => {
    const result = css({ margin: '5px' }, { scoped: 'nav ul li' });
    expect(result).toMatch(/^c\w+$/);
    await flush();
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('nav ul li .');
    expect(content).toContain('margin:5px');
  });

  test("scoped styles with child combinator", async () => {
    const result = css({ display: 'block' }, { scoped: '.sidebar > .menu' });
    expect(result).toMatch(/^c\w+$/);
    await flush();
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('.sidebar > .menu .');
    expect(content).toContain('display:block');
  });

  test("backward compatibility - plain class name", async () => {
    const result = css({ color: 'red' }, { scoped: 'container' });
    expect(result).toMatch(/^c\w+$/);
    await flush();
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
    await flush();
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
    await flush();
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('@media (prefers-color-scheme: dark){:root{--theme-bg:black;--theme-color:white}}');
  });

  test("@keyframes generates correct animation", async () => {
    css({
      '@keyframes spin': {
        from: { transform: 'rotate(0deg)' },
        to: { transform: 'rotate(360deg)' },
      },
    }, { global: true });
    await flush();
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('@keyframes spin');
    expect(content).toContain('from{transform:rotate(0deg)}');
    expect(content).toContain('to{transform:rotate(360deg)}');
  });

  test("@keyframes with percentage stops", async () => {
    css({
      '@keyframes fadeIn': {
        '0%': { opacity: '0' },
        '50%': { opacity: '0.5' },
        '100%': { opacity: '1' },
      },
    }, { global: true });
    await flush();
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('@keyframes fadeIn');
    expect(content).toContain('0%{opacity:0}');
    expect(content).toContain('100%{opacity:1}');
  });

  test("@font-face generates correct rule", async () => {
    css({
      '@font-face': {
        fontFamily: '"Inter"',
        src: 'url("/fonts/inter.woff2") format("woff2")',
        fontWeight: '400',
        fontStyle: 'normal',
      },
    }, { global: true });
    await flush();
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('@font-face');
    expect(content).toContain('font-family:"Inter"');
    expect(content).toContain('font-weight:400');
  });

  test("@container generates correct rule", async () => {
    css({
      '@container (min-width: 400px)': {
        '.card': {
          fontSize: '1.25rem',
        },
      },
    }, { global: true });
    await flush();
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('@container (min-width: 400px)');
    expect(content).toContain('.card{font-size:1.25rem}');
  });

  test("@supports generates correct rule", async () => {
    css({
      '@supports (display: grid)': {
        '.container': { display: 'grid' },
      },
    }, { global: true });
    await flush();
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('@supports (display: grid){.container{display:grid}}');
  });

  test("@layer generates correct rule", async () => {
    css({
      '@layer base': {
        'h1': { fontSize: '2rem' },
        'p': { lineHeight: '1.5' },
      },
    }, { global: true });
    await flush();
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('@layer base{h1{font-size:2rem}p{line-height:1.5}}');
  });

  test("null/undefined values ignored", async () => {
    css({
      color: 'blue',
      fontSize: undefined,
      margin: '0'
    });
    await flush();
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('color:blue');
    expect(content).not.toContain('font-size');
  });

  test("null values in nested selectors ignored", async () => {
    css({
      color: 'red',
      '&:hover': { color: 'blue', fontSize: null as unknown as undefined },
    });
    await flush();
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('color:red');
    expect(content).toContain(':hover{color:blue}');
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

    await flush();

    const styleEl = document.getElementById('hella-css');
    expect(styleEl?.textContent).not.toContain('color:blue');
  });

  test("cssRemove preserves styles until all references gone", async () => {
    const styles = { color: 'purple' };

    css(styles);
    css(styles);
    css(styles);

    cssRemove(styles);
    await flush();
    expect(document.getElementById('hella-css')?.textContent).toContain('color:purple');

    cssRemove(styles);
    await flush();
    expect(document.getElementById('hella-css')?.textContent).toContain('color:purple');

    cssRemove(styles);
    await flush();
    expect(document.getElementById('hella-css')?.textContent).not.toContain('color:purple');

    css(styles);
    await flush();
    expect(document.getElementById('hella-css')?.textContent).toContain('color:purple');
  });

  test("cssRemove is a no-op for unknown styles", async () => {
    cssRemove({ color: 'neveradded' });
    await flush();
    expect(document.getElementById('hella-css')?.textContent).toBe('');
  });

  test("custom name option without scoped", async () => {
    const className = css({ color: 'teal' }, { name: 'my-btn' });
    expect(className).toBe('my-btn');
    await flush();
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('.my-btn{color:teal}');
  });

  test("cssReset restarts class counter", async () => {
    css({ color: 'red' });
    css({ color: 'blue' });
    await flush();

    cssReset();

    const first = css({ color: 'green' });
    expect(first).toBe('c1');
  });

  test("number values in CSS properties", async () => {
    css({ zIndex: 10, opacity: 0.5, lineHeight: 1.5 });
    await flush();
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('z-index:10');
    expect(content).toContain('opacity:0.5');
    expect(content).toContain('line-height:1.5');
  });

  test("multiple & in selector are all replaced", async () => {
    css({
      color: 'black',
      '&&:hover': { color: 'red' }
    });
    await flush();
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('.c1.c1:hover{color:red}');
  });

  test("cssRemove with scoped option", async () => {
    const styles = { '.btn': { color: 'red' } };
    css(styles, { scoped: '.container' });
    await flush();
    expect(document.getElementById('hella-css')?.textContent).toContain('color:red');

    cssRemove(styles, { scoped: '.container' });
    await flush();
    expect(document.getElementById('hella-css')?.textContent).toBe('');
  });

  test("cssRemove with global option", async () => {
    const styles = { body: { margin: '0' } };
    css(styles, { global: true });
    await flush();
    expect(document.getElementById('hella-css')?.textContent).toContain('margin:0');

    cssRemove(styles, { global: true });
    await flush();
    expect(document.getElementById('hella-css')?.textContent).toBe('');
  });

  test("array values join with commas", async () => {
    css({
      fontFamily: ['Helvetica', 'Arial', 'sans-serif'],
      transition: ['color 0.2s', 'background 0.3s']
    });
    await flush();
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('font-family:Helvetica, Arial, sans-serif');
    expect(content).toContain('transition:color 0.2s, background 0.3s');
  });

  test("multiple global styles accumulate", async () => {
    css({ body: { margin: '0' } }, { global: true });
    css({ '*': { boxSizing: 'border-box' } }, { global: true });
    await flush();
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('body{margin:0}');
    expect(content).toContain('*{box-sizing:border-box}');
  });

  test("style element reuse when already in DOM", async () => {
    const beforeCount = document.querySelectorAll('#hella-css').length;

    css({ color: 'green' });
    await flush();
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('color:green');

    expect(document.querySelectorAll('#hella-css').length).toBe(beforeCount);
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
    await flush();

    const varsEl = document.getElementById("hella-vars");
    expect(varsEl!.textContent).toBe(":root{--colors-primary: blue;--font-size: 20px;}");
  });

  test("cssReset clears CSS rules", async () => {
    css({ color: 'red', fontSize: '16px' });
    await flush();

    let styleEl = document.getElementById('hella-css');
    expect(styleEl?.textContent).toContain('color:red');
    expect(styleEl?.textContent).toContain('font-size:16px');

    cssReset();
    await flush();

    styleEl = document.getElementById('hella-css');
    expect(styleEl?.textContent).toBe('');
  });

  test("content property auto-quotes string values", async () => {
    css({
      content: 'Hello World',
      '&::before': {
        content: 'Before text'
      },
      '&::after': {
        content: '"Already quoted"'
      }
    });
    await flush();

    const styleEl = document.getElementById('hella-css');
    expect(styleEl?.textContent).toContain('content:"Hello World"');
    expect(styleEl?.textContent).toContain('content:"Before text"');
    expect(styleEl?.textContent).toContain('content:"Already quoted"');
  });
});
