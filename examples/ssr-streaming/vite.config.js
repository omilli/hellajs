import { defineConfig } from "vite";
import viteHellaJS from "vite-plugin-hellajs";

export default defineConfig({
  plugins: [
    viteHellaJS(),
    {
      name: "ssr-stream",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const url = req.url ?? "/";
          if (
            url.startsWith("/@") ||
            url.startsWith("/src") ||
            url.startsWith("/node_modules") ||
            /\.[^/]+$/.test(url)
          ) {
            return next();
          }
          try {
            const { render } = await server.ssrLoadModule("/src/server.tsx");
            const stream = render(url);
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            for await (const chunk of stream) res.write(chunk);
            res.end();
          } catch (err) {
            server.ssrFixStacktrace(err);
            console.error(err);
            res.writeHead(500, { "Content-Type": "text/plain" });
            res.end(String(err?.message ?? err));
          }
        });
      },
    },
  ],
  server: { port: 5173 },
});
