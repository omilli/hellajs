
import { css, cssVars } from '@hellajs/css';
import { signal, effect } from '@hellajs/core';

global.suite('CSS - Styles', (suite) => {
  suite.add('CSS - Static Style Generation', () => {
    css({
      backgroundColor: 'red',
      color: 'blue',
      ':hover': { opacity: 0.8 }
    });
  });

  suite.add('CSS - Reactive Style Update', () => {
    const color = signal('red');
    const cleanup = effect(() => {
      css({
        backgroundColor: color(),
      });
    });
    color('blue');
    cleanup();
  });

  suite.add('CSS - Reactive Vars Update', () => {
    const themeMode = signal('light');
    const cleanup = effect(() => {
      cssVars({
        theme: {
          background: themeMode() === 'dark' ? '#000' : '#fff',
        }
      });
    });
    themeMode('dark');
    cleanup();
  });
});
