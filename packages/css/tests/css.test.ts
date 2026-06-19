import { describe, expect, test, beforeEach } from "bun:test";
import { css, cssVars, cssReset, cssVarsReset, cssRemove } from "@hellajs/css/bundle";
import { mount } from "@hellajs/dom/bundle"

beforeEach(() => {
  resetTestState();
  cssReset();
  cssVarsReset();
});

describe("css", () => {
  test("global by default returns empty string", () => {
    const result = css({ body: { margin: '0' } });
    expect(result).toBe('');
  });

  test("name option returns the name and scopes to class", () => {
    const result = css({ color: 'red' }, { name: 'card' });
    expect(result).toBe('card');
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('.card{color:red}');
  });

  test("complex nested styles with name", () => {
    css({
      '&:hover': { color: 'red' },
      '@media (max-width: 768px)': { fontSize: '12px' }
    }, { name: 'btn' });
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('.btn:hover{color:red}');
    expect(content).toContain('@media (max-width: 768px){');
    expect(content).toContain('font-size:12px');
  });

  test("media query with nested selectors", () => {
    css({
      '@media (prefers-color-scheme: dark)': {
        ':root': {
          '--theme-bg': 'black',
          '--theme-color': 'white'
        }
      }
    });
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('@media (prefers-color-scheme: dark){:root{--theme-bg:black;--theme-color:white}}');
  });

  test("@keyframes generates correct animation", () => {
    css({
      '@keyframes spin': {
        from: { transform: 'rotate(0deg)' },
        to: { transform: 'rotate(360deg)' },
      },
    });
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('@keyframes spin');
    expect(content).toContain('from{transform:rotate(0deg)}');
    expect(content).toContain('to{transform:rotate(360deg)}');
  });

  test("@keyframes with percentage stops", () => {
    css({
      '@keyframes fadeIn': {
        '0%': { opacity: '0' },
        '50%': { opacity: '0.5' },
        '100%': { opacity: '1' },
      },
    });
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('@keyframes fadeIn');
    expect(content).toContain('0%{opacity:0}');
    expect(content).toContain('100%{opacity:1}');
  });

  test("@font-face generates correct rule", () => {
    css({
      '@font-face': {
        fontFamily: '"Inter"',
        src: 'url("/fonts/inter.woff2") format("woff2")',
        fontWeight: '400',
        fontStyle: 'normal',
      },
    });
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('@font-face');
    expect(content).toContain('font-family:"Inter"');
    expect(content).toContain('font-weight:400');
  });

  test("@container generates correct rule", () => {
    css({
      '@container (min-width: 400px)': {
        '.card': {
          fontSize: '1.25rem',
        },
      },
    });
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('@container (min-width: 400px)');
    expect(content).toContain('.card{font-size:1.25rem}');
  });

  test("@supports generates correct rule", () => {
    css({
      '@supports (display: grid)': {
        '.container': { display: 'grid' },
      },
    });
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('@supports (display: grid){.container{display:grid}}');
  });

  test("@layer generates correct rule", () => {
    css({
      '@layer base': {
        'h1': { fontSize: '2rem' },
        'p': { lineHeight: '1.5' },
      },
    });
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('@layer base{h1{font-size:2rem}p{line-height:1.5}}');
  });

  test("null/undefined values ignored", () => {
    css({
      color: 'blue',
      fontSize: undefined,
      margin: '0'
    }, { name: 'test' });
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('color:blue');
    expect(content).not.toContain('font-size');
  });

  test("null values in nested selectors ignored", () => {
    css({
      color: 'red',
      '&:hover': { color: 'blue', fontSize: null as unknown as undefined },
    }, { name: 'test' });
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('color:red');
    expect(content).toContain(':hover{color:blue}');
    expect(content).not.toContain('font-size');
  });

  test("cache reuse with same name", () => {
    const styles = { color: 'red' };
    const options = { name: 'cached' };

    const result1 = css(styles, options);
    const result2 = css(styles, options);

    expect(result1).toBe(result2);
    expect(result1).toBe('cached');
  });

  test("removes styles", () => {
    const styles = { color: 'blue' };
    css(styles, { name: 'test' });
    cssRemove(styles, { name: 'test' });

    const styleEl = document.getElementById('hella-css');
    expect(styleEl?.textContent).not.toContain('color:blue');
  });

  test("cssRemove preserves styles until all references gone", () => {
    const styles = { color: 'purple' };

    css(styles, { name: 'test' });
    css(styles, { name: 'test' });
    css(styles, { name: 'test' });

    cssRemove(styles, { name: 'test' });
    expect(document.getElementById('hella-css')?.textContent).toContain('color:purple');

    cssRemove(styles, { name: 'test' });
    expect(document.getElementById('hella-css')?.textContent).toContain('color:purple');

    cssRemove(styles, { name: 'test' });
    expect(document.getElementById('hella-css')?.textContent).not.toContain('color:purple');

    css(styles, { name: 'test' });
    expect(document.getElementById('hella-css')?.textContent).toContain('color:purple');
  });

  test("cssRemove is a no-op for unknown styles", () => {
    cssRemove({ color: 'neveradded' });
    const el = document.getElementById('hella-css');
    expect(el === null || el.textContent === '').toBe(true);
  });

  test("cssReset clears CSS rules", () => {
    css({ color: 'red', fontSize: '16px' }, { name: 'test' });

    let styleEl = document.getElementById('hella-css');
    expect(styleEl?.textContent).toContain('color:red');
    expect(styleEl?.textContent).toContain('font-size:16px');

    cssReset();

    styleEl = document.getElementById('hella-css');
    expect(styleEl?.textContent).toBe('');
  });

  test("number values in CSS properties", () => {
    css({ zIndex: 10, opacity: 0.5, lineHeight: 1.5 }, { name: 'test' });
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('z-index:10');
    expect(content).toContain('opacity:0.5');
    expect(content).toContain('line-height:1.5');
  });

  test("multiple & in selector are all replaced", () => {
    css({
      color: 'black',
      '&&:hover': { color: 'red' }
    }, { name: 'test' });
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('.test.test:hover{color:red}');
  });

  test("cssRemove with global styles", () => {
    const styles = { body: { margin: '0' } };
    css(styles);
    expect(document.getElementById('hella-css')?.textContent).toContain('margin:0');

    cssRemove(styles);
    expect(document.getElementById('hella-css')?.textContent).toBe('');
  });

  test("array values join with commas", () => {
    css({
      fontFamily: ['Helvetica', 'Arial', 'sans-serif'],
      transition: ['color 0.2s', 'background 0.3s']
    }, { name: 'test' });
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('font-family:Helvetica, Arial, sans-serif');
    expect(content).toContain('transition:color 0.2s, background 0.3s');
  });

  test("multiple global styles accumulate", () => {
    css({ body: { margin: '0' } });
    css({ '*': { boxSizing: 'border-box' } });
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('body{margin:0}');
    expect(content).toContain('*{box-sizing:border-box}');
  });

  test("style element reuse when already in DOM", () => {
    const beforeCount = document.querySelectorAll('#hella-css').length;

    css({ color: 'green' }, { name: 'test' });
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('color:green');

    expect(document.querySelectorAll('#hella-css').length).toBe(beforeCount + 1);
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
    }, { name: 'themed' });

    mount({
      tag: 'div',
      props: { class: className },
      children: ['Hello World']
    });

    expect(document.body.innerHTML).toContain(`<div class="themed">Hello World</div>`);

    batch(() => {
      colorSignal("blue");
      sizeSignal("20px");
    });

    expect(document.body.innerHTML).toContain(`<div class="themed">Hello World</div>`);
    await flush();

    const varsEl = document.getElementById("hella-vars");
    expect(varsEl!.textContent).toBe(":root{--colors-primary: blue;--font-size: 20px;}");
  });

  test("content property auto-quotes string values", () => {
    css({
      content: 'Hello World',
      '&::before': {
        content: 'Before text'
      },
      '&::after': {
        content: '"Already quoted"'
      }
    }, { name: 'test' });
    const styleEl = document.getElementById('hella-css');
    expect(styleEl?.textContent).toContain('content:"Hello World"');
    expect(styleEl?.textContent).toContain('content:"Before text"');
    expect(styleEl?.textContent).toContain('content:"Already quoted"');
  });

  test("global with selector keys", () => {
    css({
      '.card': { padding: '1rem' },
      '.card-title': { fontSize: '1.25rem' },
    });
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('.card{padding:1rem}');
    expect(content).toContain('.card-title{font-size:1.25rem}');
  });

  test("applies rules immediately", () => {
    css({ color: 'red' }, { name: 'a' });
    css({ color: 'blue' }, { name: 'b' });
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('.a{color:red}');
    expect(content).toContain('.b{color:blue}');
  });

  test("cssRemove removes from sheet immediately", () => {
    css({ color: 'red' }, { name: 'test' });
    expect(document.getElementById('hella-css')?.textContent).toContain('color:red');

    cssRemove({ color: 'red' }, { name: 'test' });
    expect(document.getElementById('hella-css')?.textContent).not.toContain('color:red');
  });

  test("cssReset clears the sheet synchronously", () => {
    css({ color: 'red' }, { name: 'test' });
    cssReset();
    expect(document.getElementById('hella-css')?.textContent).toBe('');
  });

  test("multiple named rules appear as independent rules", () => {
    css({ color: 'red' }, { name: 'card' });
    css({ fontSize: '16px' }, { name: 'heading' });
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('.card{color:red}');
    expect(content).toContain('.heading{font-size:16px}');
  });
});
