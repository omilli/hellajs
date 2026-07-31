import { ssr, doc } from '@hellajs/ssr';
import { App, styles } from './app.js';


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
        styles: [styles],
        scripts: [{ src: '/client.js', type: 'module' }],
      },
      body: ssr(App()),
    });

    return new Response(page, { headers: { 'content-type': 'text/html' } });
  },
});
