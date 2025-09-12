// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from "@tailwindcss/vite";
import icon from "astro-icon";
import mdx from '@astrojs/mdx';
import pagefind from "astro-pagefind";

// https://astro.build/config
export default defineConfig({
  integrations: [icon(), mdx(), pagefind()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@core/*': '../packages/core/docs/*',
        '@css/*': '../packages/css/docs/*',
        '@dom/*': '../packages/dom/docs/*',
        '@resource/*': '../packages/resource/docs/*',
        '@router/*': '../packages/router/docs/*',
        '@store/*': '../packages/store/docs/*'
      }
    }
  },
});