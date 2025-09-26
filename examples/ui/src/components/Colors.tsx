import { forEach } from "@hellajs/dom";
import { css } from "@hellajs/css";
import { paletteKeys } from "../lib/palette";
import { size } from "../lib/utils";
import { colors, type ColorKey } from "../color";


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