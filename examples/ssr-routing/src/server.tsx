import { readFileSync } from 'node:fs';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { router } from '@hellajs/router';
import { ssr, doc } from '@hellajs/ssr';
import { routes, App, notFound } from './app.js';
import { stylesheet } from './theme.js';

// Serve the client bundle emitted by build.mjs. The server no longer bundles at
// startup: JSX cannot run under raw `node`, so build.mjs compiles both entries
// (client + server) before this file ever boots.
const client = readFileSync(new URL('../dist/client.js', import.meta.url), 'utf8');

const app = new Hono();

// Serve the client bundle from disk.
app.get('/client.js', (c) => c.body(client, 200, { 'content-type': 'text/javascript; charset=utf-8' }));

// One catch-all: Hono never routes. `@hellajs/router` matches the request URL
// against the shared route map, on the server and on the client alike.
app.get('*', (c) => {
  const { pathname, search } = new URL(c.req.url);

  // url overrides window.location (there is none on the server); router init
  // is synchronous, so currentView holds the matched view before ssr walks the
  // tree. The whole block is synchronous (no await between router and ssr), so
  // no second request can interleave and overwrite the router's module-level
  // signals mid-render.
  router({ routes, url: pathname + search, notFound });

  // Wrap the output so the client has an #app container to hydrate into:
  // hydrate('#app') adopts the existing nodes instead of rebuilding them.
  const body = `<div id="app">${ssr(<App />)}</div>`;

  return c.html(doc({
    lang: 'en',
    head: {
      title: 'SSR Routing',
      styles: [stylesheet],
      scripts: [{ src: '/client.js', type: 'module' }],
    },
    body,
  }));
});

serve({ fetch: app.fetch, port: 3000 });
