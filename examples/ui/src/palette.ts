import { computed, signal } from "@hellajs/core";
import { cssVars, type CSSVars } from "../../../packages/css";

const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");

const preferredTheme = () => prefersDark.matches ? "dark" : "light";

export type MonoChromeKey = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

export const paletteKeys: MonoChromeKey[] = [100, 200, 300, 400, 500, 600, 700, 800, 900];

export type Palette = {
  [K in MonoChromeKey]: string | (() => string);
} & {
  [K in MonoChromeKey as `contrast${K}`]: string | (() => string);
};

export type PaletteKey = keyof Palette;

export type PaletteVars<T> = Record<keyof T, CSSVars<Palette>>;

export const activeTheme = signal<"light" | "dark">(preferredTheme());

export const isDarkTheme = computed(() => activeTheme() === 'dark');

prefersDark.addEventListener("change", () => activeTheme(preferredTheme()));

export function palette<T extends { neutral: string } & Record<string, string>>(colors: T) {
  const result = {} as PaletteVars<T>;
  Object.entries(colors).forEach(([name, color]) => {
    result[name as keyof T] = cssVars(monochrome(color), { prefix: `color-${name}` });
  });
  return result;
}

function monochrome(hex: string) {
  const clean = hex.replace('#', '');
  const r = slice(clean, 0, 2);
  const g = slice(clean, 2, 4);
  const b = slice(clean, 4, 6);

  // Convert RGB to HSL for lightness manipulation
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const diff = max - min;
  const sum = max + min;

  const l = sum / 2;
  const s = diff === 0 ? 0 : l > 0.5 ? diff / (2 - sum) : diff / sum;
  const h = diff === 0 ? 0 :
    max === r / 255 ? ((g - b) / 255 / diff + (g < b ? 6 : 0)) / 6 :
      max === g / 255 ? ((b - r) / 255 / diff + 2) / 6 :
        ((r - g) / 255 / diff + 4) / 6;

  // HSL to RGB conversion function
  const hslToRgb = (h: number, s: number, l: number) => {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h * 6) % 2 - 1));
    const m = l - c / 2;

    let r = 0, g = 0, b = 0;
    const h6 = h * 6;

    if (h6 < 1) r = c, g = x;
    else if (h6 < 2) r = x, g = c;
    else if (h6 < 3) g = c, b = x;
    else if (h6 < 4) g = x, b = c;
    else if (h6 < 5) r = x, b = c;
    else r = c, b = x;

    return `#${pad(round(r, m))}${pad(round(g, m))}${pad(round(b, m))}`;
  };

  const fullPalette = {} as Palette;

  paletteKeys.forEach((key, index) => {
    if (key === 500) {
      // Use the original input hex as the 500 shade
      fullPalette[key] = hex;
    } else {
      // Calculate lightness offset from 500 (index 4)
      const offset = index - 4;
      const targetLightness = Math.max(0, Math.min(1, l + (offset * -0.1)));

      fullPalette[key] = () => isDarkTheme() ?
        hslToRgb(h, s, Math.max(0, Math.min(1, l + ((paletteKeys.length - 1 - index - 4) * -0.1))))
        : hslToRgb(h, s, targetLightness);
    }
  });

  Object.entries(fullPalette).forEach(([key, color]) => {
    const colorValue = typeof color === 'function' ? color() : color;
    fullPalette[`contrast${key}` as PaletteKey] = contrast(colorValue);
  });

  return fullPalette as Palette;
};

function contrast(hex: string) {
  const clean = hex.replace('#', '');

  // Convert hex to RGB and calculate relative luminance in one pass
  const r = slice(clean, 0, 2) / 255;
  const g = slice(clean, 2, 4) / 255;
  const b = slice(clean, 4, 6) / 255;

  // Calculate luminance with inlined sRGB conversion
  const luminance = 0.2126 * lum(r) + 0.7152 * lum(g) + 0.0722 * lum(b);
  // Compare contrast ratios: white (1.05 / (luminance + 0.05)) vs black ((luminance + 0.05) / 0.05)
  return (luminance + 0.05) * (luminance + 0.05) > 0.1 ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.85)";
};

const slice = (str: string, start: number, end?: number) => parseInt(str.slice(start, end), 16);

const round = (val: number, max: number) => Math.round((val + max) * 255);

const pad = (val: number) => val.toString(16).padStart(2, '0');

const lum = (val: number) => val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);

