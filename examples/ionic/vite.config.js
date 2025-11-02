import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import viteHellaJS from '../../plugins/vite/index.mjs'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  css: {
    postcss: './postcss.config.js',
  },
  optimizeDeps: {
    exclude: ['@ionic/core'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
      external: ['/ionic.esm.js'],
    },
  },
  plugins: [
    tailwindcss(),
    viteHellaJS(),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/@ionic/core/dist/ionic/*',
          dest: '',
        },
      ],
    }),
  ],
});