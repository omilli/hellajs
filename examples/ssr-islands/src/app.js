import { html } from '@hellajs/dom';
import { css, cssText } from '@hellajs/css';

// css() registers the rules on both platforms; cssText() collects the generated text
// for the server (after the registration below). Pass it to `doc()`'s `styles` to emit
// one <style> tag.
css({
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

// The registered rule text, collected after the css() call above.
export const styles = cssText();

// Shared template: a static shell with a server-rendered count and an empty
// island slot. Pure data — no DOM. `ssr()` stringifies it to HTML on the server.
export const App = () => html`
  <div>
    <h1>SSR Islands</h1>
    <div id="slot"></div>
  </div>
`;
