import { forEach } from "@hellajs/dom";
import { css } from "@hellajs/css";
import { palette, paletteKeys } from "../palette";
import { size } from "../utils";

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


export const Colors = () => <>
  <h1>Color Palette</h1>
  {forEach(Object.keys(colors) as ColorKey[], (color) => (
    <>
      <h2 class={css({ textTransform: "capitalize" })}>{color}</h2>

      {forEach(paletteKeys, (shade) => (
        <div class={css({
          marginBlock: size(0.25),
          padding: size(0.5),
          backgroundColor: colors[color][shade],
          color: colors[color][`contrast${shade}`],
        })}>
          {`${color} ${shade}`}
        </div>
      ))}
    </>
  ))}
</>