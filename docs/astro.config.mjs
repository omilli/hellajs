// @ts-check
import { defineConfig } from 'astro/config';
import icon from "astro-icon";
import mdx from '@astrojs/mdx';
import pagefind from "astro-pagefind";
import hellajs from "astro-plugin-hellajs";

// https://astro.build/config
export default defineConfig({
  integrations: [icon(), mdx(), pagefind(), hellajs()],
  vite: {
    resolve: {
      alias: {
        '@components/*': './src/components/*',
        '@core/*': '../packages/core/docs/*',
        '@css/*': '../packages/css/docs/*',
        '@dom/*': '../packages/dom/docs/*',
        '@resource/*': '../packages/resource/docs/*',
        '@router/*': '../packages/router/docs/*',
        '@store/*': '../packages/store/docs/*',
        '@ssr/*': '../packages/ssr/docs/*',
        '@ui/*': '../packages/ui/docs/*',
        '@registry/*': '../packages/ui/dist/registry/*',
        '@examples/*': '../examples/*'
      }
    }
  },
});