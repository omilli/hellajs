import { html } from '@hellajs/dom';
import { css } from '@hellajs/css';

// On the server (no DOM), `css()` returns the generated CSS text instead of
// injecting a stylesheet. Pass it to `doc()`'s `styles` to emit one <style> tag.
export const styles = css({
  body: {
    fontFamily: 'sans-serif',
    margin: '2rem',
    color: '#333',
  },
  '#slot button': {
    marginTop: '1rem',
    padding: '0.5rem 1rem',
    fontSize: '1rem',
    cursor: 'pointer',
    borderRadius: '0.375rem',
    border: '1px solid #2563eb',
    backgroundColor: '#fff',
  },
});

// Shared template: a static shell with a server-rendered count and an empty
// island slot. Pure data — no DOM. `ssr()` stringifies it to HTML on the server.
export const App = () => html`
  <div>
    <h1>SSR Islands</h1>
    <div id="slot"></div>
  </div>
`;
