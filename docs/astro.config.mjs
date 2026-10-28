// @ts-check
import { defineConfig } from 'astro/config';
import icon from "astro-icon";
import mdx from '@astrojs/mdx';
import pagefind from "astro-pagefind";
import hellajs from "astro-plugin-hellajs";

// https://astro.build/config
export default defineConfig({
  integrations: [icon(), mdx(), pagefind(), hellajs()],
  // Component css (chrome, callouts, install tabs) rides Astro's stylesheet
  // pipeline as extracted per-module chunks; inline them so every page is
  // self-contained — no render-blocking css requests, no opaque chunk names.
  build: { inlineStylesheets: "always" },
  vite: {
    resolve: {
      alias: {
        '@components/*': './src/components/*',
        '@core/*': '../packages/core/docs/*',
        '@css/*': '../packages/css/docs/*',
        '@dom/*': '../packages/dom/docs/*',
        '@headless/*': '../packages/headless/docs/*',
        '@resource/*': '../packages/resource/docs/*',
        '@router/*': '../packages/router/docs/*',
        '@store/*': '../packages/store/docs/*',
        '@ssr/*': '../packages/ssr/docs/*',
        '@ui/*': '../packages/ui/docs/*',
        '@examples/*': '../examples/*'
      }
    }
  },
});