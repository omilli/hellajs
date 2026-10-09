import { css } from "@hellajs/css";
import { tokens } from "./tokens";

css({
  html: {
    colorScheme: "dark",
    scrollbarColor:
      `color-mix(in oklab, ${tokens.foreground} 20%, transparent) ${tokens.base100}`,
  },
  body: {
    backgroundColor: tokens.base100,
    color: tokens.foreground,
    fontFamily: tokens.fontSans,
  },
})
