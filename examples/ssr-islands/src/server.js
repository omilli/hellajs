import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { build } from 'esbuild';
import { ssr, doc } from '@hellajs/ssr';
import { App, styles } from './app.js';


// Bundle the client once at startup. esbuild resolves the bare `@hellajs/*`
// specifiers the browser can't; the bundle is held in memory, so there is no
// separate build step and no dist/.
const result = await build({ entryPoints: ['src/client.js'], bundle: true, write: false, format: 'esm' });
const client = result.outputFiles[0].text;

const app = new Hono();

// Serve the in-memory client bundle.
app.get('/client.js', (c) => c.body(client, 200, { 'content-type': 'text/javascript; charset=utf-8' }));

app.get('*', (c) => c.html(doc({
  head: {
    title: 'SSR Islands',
    styles: [styles],
    scripts: [{ src: '/client.js', type: 'module' }],
  },
  // `ssr()` walks the template to an HTML string; `doc()` wraps it into a full
  // document and injects the stylesheet and the client script.
  body: ssr(App()),
})));

serve({ fetch: app.fetch, port: 3000 });
