import viteHellaJS from "vite-plugin-hellajs";
import { fileURLToPath, URL } from "node:url";

/**
 * Astro integration for HellaJS. Wires the HellaJS Vite plugin (JSX + `html\`\`` → HellaNode) and
 * registers a framework renderer so `.jsx`/`.tsx` components render server-side via `@hellajs/ssr`
 * and hydrate on the client behind `client:*` directives.
 *
 * Exclusive-use: assumes the project uses HellaJS as its only JSX framework — the Vite plugin
 * transforms all `.jsx`/`.tsx`/`.js`/`.ts` (skipping `node_modules`), so mixing another JSX
 * framework (React/Solid) in the same project is unsupported.
 * @returns {import("astro").AstroIntegration}
 */
export default function hellajs() {
  return {
    name: "astro-hellajs",
    hooks: {
      "astro:config:setup"({ updateConfig, addRenderer }) {
        updateConfig({
          vite: { plugins: [viteHellaJS()] }
        });
        addRenderer({
          name: "astro-hellajs",
          clientEntrypoint: fileURLToPath(new URL("./client.mjs", import.meta.url)),
          serverEntrypoint: fileURLToPath(new URL("./server.mjs", import.meta.url)),
        });
      }
    }
  };
}
