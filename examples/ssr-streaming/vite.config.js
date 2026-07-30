import { defineConfig } from 'vite';
import viteHellaJS from 'vite-plugin-hellajs';

// The vite-plugin-hellajs transform runs in BOTH the client pipeline and the
// SSR pipeline (enforce: "pre"), so server.ssrLoadModule('/src/server.tsx')
// turns the server-side JSX into HellaNode objects — JSX is not a HellaNode
// without it. The dev middleware below streams SSR HTML for every app route and
// hands module/asset requests (the client entry, HMR, deps) back to Vite.
export default defineConfig({
  plugins: [
    viteHellaJS(),
    {
      name: 'ssr-stream',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const url = req.url ?? '/';
          // Vite owns module/asset URLs; SSR-stream every other path.
          if (
            url.startsWith('/@') ||
            url.startsWith('/src') ||
            url.startsWith('/node_modules') ||
            /\.[^/]+$/.test(url)
          ) {
            return next();
          }
          try {
            const { render } = await server.ssrLoadModule('/src/server.tsx');
            const stream = render(url);
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            for await (const chunk of stream) res.write(chunk);
            res.end();
          } catch (err) {
            server.ssrFixStacktrace(err);
            console.error(err);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end(String(err?.message ?? err));
          }
        });
      },
    },
  ],
  server: { port: 5173 },
});
