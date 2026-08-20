import { ssrStream } from '@hellajs/ssr';
import { Dashboard } from './app';
import { styles } from './theme';

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
