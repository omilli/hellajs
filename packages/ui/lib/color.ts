import { palette } from "./palette";

const colorPalette = {
  neutral: "#737b8c",
  primary: "#1260e6",
  accent: "#e67112",
  success: "#1a8205",
  warning: "#cc4106",
  error: "#d90909",
  info: "#19b0e3",
};

export const colors = palette(colorPalette);

export type ColorKey = keyof typeof colors;

export const colorKeys = Object.keys(colorPalette) as ColorKey[];