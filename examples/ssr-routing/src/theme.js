import { cssVars, css } from '@hellajs/css';

// On the server (no DOM), cssVars() returns the custom-property declarations as
// CSS text (":root{--color-primary:#2563eb;…}") and css() returns the generated
// rule text — both stateless, neither touches a stylesheet. Collect the server
// return values and pass them to doc({ head: { styles } }) to emit one <style>.
// On the client the same calls return a var() proxy / class name instead; this
// module is server-only, so only the server path runs here.
export const tokens = cssVars({
  color: { primary: '#2563eb', text: '#333' },
  space: { nav: '1rem' },
});

export const stylesheet = css({
  body: {
    fontFamily: 'sans-serif',
    margin: '0',
    color: 'var(--color-text)',
  },
  nav: {
    display: 'flex',
    gap: 'var(--space-nav)',
    padding: 'var(--space-nav)',
    borderBottom: '1px solid #e5e7eb',
  },
  'nav a': {
    color: 'var(--color-primary)',
    textDecoration: 'none',
  },
  'nav a.active': {
    fontWeight: '700',
    textDecoration: 'underline',
  },
  main: {
    padding: 'var(--space-nav)',
  },
});
