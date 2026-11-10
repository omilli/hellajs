import { signal } from "@hellajs/core";
import { css, vars } from "@hellajs/css";
import { mount } from "@hellajs/dom";

const isDark = signal(false);

const colors = vars({
  dark: "#1a1a2e",
  light: "#fff",
});

const theme = vars({
  bg: () => (isDark() ? colors.dark : colors.light),
  text: () => (isDark() ? colors.light : colors.dark),
});

css({
  body: {
    textAlign: "center",
    backgroundColor: theme.bg,
    color: theme.text,
  },
  button: {
    backgroundColor: theme.text,
    color: theme.bg,
  },
});

const ThemeSwitcher = () => (
  <>
    <h1>Theme Switcher</h1>
    <button on:click={() => isDark(!isDark())}>{isDark() ? "☀️ Light" : "🌙 Dark"}</button>
    <p>Toggle the button to switch themes.</p>
  </>
);

mount(ThemeSwitcher, "#app");
