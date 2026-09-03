import { css, vars, cssText } from '@hellajs/css';

// vars() registers the custom-property declarations on both platforms and returns
// the var() proxy everywhere; css() registers its rules the same way. cssText()
// then collects both — the css-side rules in registration order, then the vars
// buckets — as the text for one <style> tag via doc({ head: { styles } }).
export const tokens = vars({
  color: { primary: '#2563eb', text: '#333' },
  space: { nav: '1rem' },
});

css({
  body: {
    fontFamily: 'sans-serif',
    margin: '0',
    color: tokens.color.text,
  },
  nav: {
    display: 'flex',
    gap: tokens.space.nav,
    padding: tokens.space.nav,
    borderBottom: '1px solid #e5e7eb',
    a: {
      color: tokens.color.primary,
      textDecoration: 'none',
      '&.active': {
        fontWeight: '700',
        textDecoration: 'underline',
      }
    },
  },
  main: {
    padding: tokens.space.nav,
  },
});

// The registered rule text (css rules + vars buckets), collected after the calls above.
export const stylesheet = cssText();
