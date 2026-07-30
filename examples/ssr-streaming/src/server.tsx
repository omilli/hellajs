import { css } from '@hellajs/css';
import { ssrStream } from '@hellajs/ssr';
import { Dashboard } from './app';

// css() returns the generated CSS text on the server (no DOM) — inject it once into the
// streamed document's <head>. The shell is static, so no client re-injection is needed.
const styles = css({
  body: { fontFamily: 'system-ui, sans-serif', maxWidth: '42rem', margin: '2rem auto', padding: '0 1rem', color: '#1f2937' },
  '.dashboard': { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  header: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem' },
  'header h1': { margin: '0', fontSize: '1.5rem' },
  '.user': { color: '#6b7280', fontSize: '0.95rem' },
  '.grid': { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))', gap: '1rem' },
  '.card': { border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1rem 1.25rem', background: '#fff' },
  '.card h2': { margin: '0 0 0.75rem', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6b7280' },
  '.card dl': { display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.25rem 0.75rem', margin: '0' },
  '.card dt': { color: '#6b7280' },
  '.card dd': { margin: '0', fontWeight: '600' },
  '.card ul': { margin: '0', paddingLeft: '1.25rem', lineHeight: '1.6' },
  '.card ol': { margin: '0', paddingLeft: '1.25rem', lineHeight: '1.6' },
  '.skeleton .bone': { display: 'block', height: '0.75rem', marginBottom: '0.5rem', borderRadius: '0.25rem', background: '#e5e7eb' },
});

// A full streamed document needs a prefix and suffix around the streamed body — doc()
// returns a string synchronously, so assemble the shell by hand for ssrStream.
const prefix = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Dashboard</title><style>${styles}</style></head><body><div id="app">`;
const suffix = '</div><script type="module" src="/src/client.tsx"></script></body></html>';

// Single page — the URL is irrelevant, so render() takes no argument. The dev middleware
// (vite.config.js) passes req.url, but render ignores it. The vite-plugin-hellajs transform
// ran on this module (and ./app) via ssrLoadModule, so <Dashboard /> is already a HellaNode.
export function render(): ReadableStream<string> {
  const body = ssrStream(<Dashboard />);
  return new ReadableStream<string>({
    async start(controller) {
      controller.enqueue(prefix);
      for await (const chunk of body) controller.enqueue(chunk);
      controller.enqueue(suffix);
      controller.close();
    },
  });
}
