import { defineConfig } from 'astro/config';
import hellajs from 'astro-plugin-hellajs';

export default defineConfig({
  integrations: [hellajs()],
});
