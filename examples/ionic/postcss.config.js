import purgecssPlugin from '@fullhuman/postcss-purgecss';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';

const purgecss = purgecssPlugin.default || purgecssPlugin;

export default {
  plugins: [
    autoprefixer(),
    ...(process.env.NODE_ENV === 'production'
      ? [
        purgecss({
          content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
          defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || [],
          safelist: {
            // Preserve Ionic core classes and CSS variables
            standard: [/^ion-/, /^hydrated$/],
            deep: [/^ion-/],
            greedy: [/^ion-color-/, /^md-/, /^ios-/],
          },
        }),
        cssnano({
          preset: ['default', {
            discardComments: { removeAll: true },
            normalizeWhitespace: true,
          }],
        }),
      ]
      : []),
  ],
};
