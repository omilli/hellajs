import { ssrStream, docStream } from '@hellajs/ssr';
import { Dashboard } from './app';
import { styles } from './theme';

// Single page — the URL is irrelevant, so render() takes no argument. The dev middleware
// (vite.config.js) passes req.url, but render ignores it. The vite-plugin-hellajs transform
// ran on this module (and ./app) via ssrLoadModule, so <Dashboard /> is already a HellaNode.
export function render(): ReadableStream<string> {
  // docStream assembles the full streamed document: the shell (head, lang, the mount wrapper)
  // flushes first, each body chunk pipes through as it renders, and the closing tags land only
  // after the body closes — for ssrStream that means after every staged <Suspense> swap, so
  // progressive paint holds end-to-end (nothing is collected).
  return docStream({
    lang: 'en',
    // Emits <div id="app">…</div> around the streamed body — the same selector the client's
    // hydrate(<Dashboard />, '#app') targets, so server and client share one string.
    mount: '#app',
    head: {
      title: 'Dashboard',
      meta: [{ charset: 'UTF-8' }],
      // css() returns the generated CSS text on the server — injected here, once.
      styles: [styles],
      // The client entry as a module script: module scripts defer, so head placement gives the
      // same timing as an end-of-body script (the ssr-islands/ssr-routing convention).
      scripts: [{ type: 'module', src: '/src/client.tsx' }],
    },
    body: ssrStream(<Dashboard />),
  });
}
