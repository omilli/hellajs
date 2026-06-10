import { signal, computed } from "@hellajs/core";
import { mount } from "@hellajs/dom";
import { css, cssVars } from "@hellajs/css";

const theme = signal('light');
const isDark = computed(() => theme() === 'dark');

const vars = cssVars({
  bg: () => isDark() ? '#1a1a2e' : '#fff',
  surface: () => isDark() ? '#16213e' : '#f8fafc',
  text: () => isDark() ? '#e2e8f0' : '#1e293b',
  primary: () => '#3b82f6',
  border: () => isDark() ? '#334155' : '#e2e8f0',
});

css({
  '.page': {
    minHeight: '100vh',
    backgroundColor: vars.bg,
    color: vars.text,
    fontFamily: 'system-ui, sans-serif',
    transition: 'background-color 0.2s, color 0.2s',
  },
  '.app': {
    maxWidth: '30rem',
    margin: '0 auto',
    padding: '1rem',
    'h1': { margin: '0 0 0.75rem' },
    'button': {
      padding: '0.5rem 1rem',
      border: 'none',
      borderRadius: '0.25rem',
      backgroundColor: vars.primary,
      color: '#fff',
      cursor: 'pointer',
      fontSize: '0.875rem',
    },
  },
});

const ThemeSwitcher = () => (
  <div class="page">
    <div class="app">
      <h1>Theme Switcher</h1>
      <button on:click={() => theme(isDark() ? 'light' : 'dark')}>
        {() => isDark() ? '☀️ Light' : '🌙 Dark'}
      </button>
      <p>Toggle the button to switch themes. The background, text, and border colors all update reactively.</p>
    </div>
  </div>
);

mount(ThemeSwitcher, '#app');
