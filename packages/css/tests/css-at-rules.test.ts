import { describe, expect, test, beforeEach } from "bun:test";
import { css, cssReset, cssVarsReset } from "@hellajs/css/bundle";

beforeEach(() => {
  resetTestState();
  cssReset();
  cssVarsReset();
});

describe("css at-rules", () => {
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

  test("scoped @media wraps direct properties under class selector", () => {
    css({
      '@media (max-width: 768px)': { fontSize: '12px', color: 'red' }
    }, { name: 'btn' });
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('@media (max-width: 768px){.btn{');
    expect(content).toContain('font-size:12px');
    expect(content).toContain('color:red');
    expect(content).not.toContain('{{');
  });

  test("scoped @media composes descendant selectors", () => {
    css({
      '@media (max-width: 768px)': {
        '.child': { color: 'blue' }
      }
    }, { name: 'btn' });
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('@media (max-width: 768px){');
    expect(content).toContain('.btn .child{color:blue}');
  });

  test("scoped @media composes & selector", () => {
    css({
      '@media (max-width: 768px)': {
        '&:hover': { color: 'red' }
      }
    }, { name: 'btn' });
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('@media (max-width: 768px){');
    expect(content).toContain('.btn:hover{color:red}');
  });

  test("scoped @container inherits scope", () => {
    css({
      '@container (min-width: 400px)': { fontSize: '12px' }
    }, { name: 'btn' });
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('@container (min-width: 400px){');
    expect(content).toContain('.btn{font-size:12px}');
  });

  test("scoped @supports inherits scope", () => {
    css({
      '@supports (display: grid)': { display: 'grid' }
    }, { name: 'btn' });
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('@supports (display: grid){');
    expect(content).toContain('.btn{display:grid}');
  });

  test("scoped @starting-style inherits scope", () => {
    css({
      '@starting-style': { opacity: '1' }
    }, { name: 'btn' });
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('@starting-style{.btn{opacity:1}}');
  });

  test("@keyframes stays global even with name option", () => {
    css({
      '@keyframes spin': {
        from: { transform: 'rotate(0deg)' },
        to: { transform: 'rotate(360deg)' },
      },
    }, { name: 'btn' });
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}');
    expect(content).not.toContain('.btn{@keyframes');
  });

  test("@font-face stays global even with name option", () => {
    css({
      '@font-face': {
        fontFamily: '"Custom"',
        src: 'url("/fonts/custom.woff2") format("woff2")',
      },
    }, { name: 'btn' });
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('@font-face');
    expect(content).toContain('font-family:"Custom"');
    expect(content).toContain('src:url("/fonts/custom.woff2") format("woff2")');
    expect(content).not.toContain('.btn{@font-face');
  });

  test("@layer stays global even with name option", () => {
    css({
      '@layer utilities': {
        '.flex': { display: 'flex' },
      },
    }, { name: 'btn' });
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('@layer utilities{.flex{display:flex}}');
    expect(content).not.toContain('.btn{@layer');
  });

  test("global @media (no name) is unaffected", () => {
    css({
      '@media (max-width: 768px)': { fontSize: '12px' },
      '.card': { padding: '1rem' },
    });
    const content = document.getElementById('hella-css')?.textContent;
    expect(content).toContain('@media (max-width: 768px)');
    expect(content).toContain('font-size:12px');
    expect(content).toContain('.card{padding:1rem}');
  });
});
