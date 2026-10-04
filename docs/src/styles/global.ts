import { css } from "@hellajs/css";

css({
  html: {
    colorScheme: "dark",
    scrollbarColor:
      "color-mix(in oklab, var(--foreground) 20%, transparent) var(--base-100)",
  },
  body: {
    backgroundColor: "var(--base-100)",
    color: "var(--foreground)",
    fontFamily: "var(--font-sans)",
  },
})
