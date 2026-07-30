import { html } from '@hellajs/dom';
import { router } from '@hellajs/router';
import { ssr, doc } from '@hellajs/ssr';
import { routes, App, notFound } from './app.js';
import { tokens, stylesheet } from './theme.js';

// Bundle the client once at startup. Bun's native bundler resolves the bare
// `@hellajs/*` specifiers the browser can't — no separate build step, no dist/.
const build = await Bun.build({ entrypoints: ['src/client.js'], target: 'browser' });
if (!build.success) throw new Error(`client build failed:\n${build.logs}`);
const client = await build.outputs[0].text();

Bun.serve({
  port: 3000,
  fetch(req) {
    const { pathname, search } = new URL(req.url);

    if (pathname === '/client.js') {
      return new Response(client, {
        headers: { 'content-type': 'text/javascript' },
      });
    }

    // url overrides window.location (there is none on the server); router init
    // is synchronous, so currentView holds the matched view before ssr walks the
    // tree. The whole block is synchronous — no await between router and ssr —
    // so no second request can interleave and overwrite the router's module-level
    // signals mid-render.
    router({ routes, url: pathname + search, notFound });

    // Wrap the output so the client has an #app container to hydrate into —
    // hydrate('#app') adopts the existing nodes instead of rebuilding them.
    const body = `<div id="app">${ssr(html`<${App} />`)}</div>`;

    const page = doc({
      lang: 'en',
      head: {
        title: 'SSR Routing',
        styles: [tokens, stylesheet],
        scripts: [{ src: '/client.js', type: 'module' }],
      },
      body,
    });

    return new Response(page, { headers: { 'content-type': 'text/html' } });
  },
});
