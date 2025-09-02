import { defineConfig } from 'vite'
import viteHellaJS from 'vite-plugin-hellajs'

export default defineConfig({
  plugins: [viteHellaJS()],
  build: {
    minify: false, // Disable minification for JavaScript and CSS
    // You can also specifically control CSS minification:
    // cssMinify: false, 
  },
})