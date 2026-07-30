import { ssr, doc } from '@hellajs/ssr';
import { css } from '@hellajs/css';
import { App } from './app.js';

// On the server (no DOM), `css()` returns the generated CSS text instead of
// injecting a stylesheet. Pass it to `doc()`'s `styles` to emit one <style> tag.
const stylesheet = css({
  body: {
    fontFamily: 'sans-serif',
    margin: '2rem',
    color: '#333',
  },
  '#count': {
    fontWeight: '700',
    color: '#2563eb',
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

// Bundle the client once at startup. Bun's native bundler resolves the bare
// `@hellajs/*` specifiers the browser can't — no separate build step, no dist/.
const build = await Bun.build({ entrypoints: ['src/client.js'], target: 'browser' });
if (!build.success) throw new Error(`client build failed:\n${build.logs}`);
const client = await build.outputs[0].text();

Bun.serve({
  port: 3000,
  fetch(req) {
    const { pathname } = new URL(req.url);

    // Serve the in-memory client bundle.
    if (pathname === '/client.js') {
      return new Response(client, {
        headers: { 'content-type': 'text/javascript' },
      });
    }

    // `ssr()` walks the template to an HTML string; `doc()` wraps it into a full
    // document and injects the stylesheet and the client script.
    const page = doc({
      head: {
        title: 'SSR Islands',
        styles: [stylesheet],
        scripts: [{ src: '/client.js', type: 'module' }],
      },
      body: ssr(App()),
    });

    return new Response(page, { headers: { 'content-type': 'text/html' } });
  },
});
