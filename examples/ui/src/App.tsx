import { forEach, mount } from "@hellajs/dom";
import { palette, paletteKeys } from "./palette";
import { css, cssVars } from "../../../packages/css";
import type { CSSObject } from "@hellajs/css";

const colorPalette = {
  neutral: "#737b8c",
  primary: "#1260e6",
  accent: "#e67112",
  success: "#1a8205",
  warning: "#cc4106",
  error: "#d90909",
  info: "#19b0e3",
};

const colors = palette(colorPalette);

type ColorKey = keyof typeof colors;

const size = (factor: number, unit: string = "rem") => `${factor}${unit}`;

const scale = cssVars({
  lg: 1.25,
  md: 1,
  sm: 0.875,
}, { prefix: "scale" });

css({
  "*, *::before, *::after": {
    boxSizing: "border-box"
  },
  body: {
    lineHeight: 1.5,
    WebkitFontSmoothing: "antialiased",
    backgroundColor: colors.neutral[100],
    color: colors.neutral[900],
    margin: 0,
    fontFamily: "sans-serif",
    fontSize: size(16, "px"),
    fontWeight: 400
  },
  "body, h1, h2, h3, h4, h5, h6, p, figure, blockquote, dl, dd": {
    margin: 0
  },
  "img, picture, video, canvas, svg": {
    display: "block",
    maxWidth: "100%"
  },
  "input, button, textarea, select": {
    font: "inherit"
  },
  "p, h1, h2, h3, h4, h5, h6": {
    overflowWrap: "break-word"
  }
}, { global: true });


const button: CSSObject = {
  // Layout
  paddingInline: size(1.25),
  paddingBlock: size(1),
  // Typography
  fontSize: size(0.9),
  backgroundColor: colors.neutral[900],
  color: colors.neutral.contrast900,
};

css({
  // Layout
  position: "relative",
  overflow: "hidden",
  isolation: "isolate",
  paddingInline: button.paddingInline,
  paddingBlock: button.paddingBlock,
  borderRadius: size(0.25),
  border: "none",
  // display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  // Typography
  fontSize: button.fontSize,
  fontWeight: 500,
  lineHeight: 1,
  // Colors
  backgroundColor: button.backgroundColor,
  color: button.color,
  // Interaction
  cursor: "pointer",
  userSelect: "none",
  outline: "none",
  transition: "all 0.1s ease-in-out",
  "&::before": {
    content: '',
    position: "absolute",
    inset: 0,
    backgroundColor: "black",
    opacity: 0,
    transition: "all 0.3s ease",
    mixBlendMode: "luminosity",
    zIndex: -1
  },
  "&:hover": {
    transform: "scale(1.01)",
    "&::before": {
      opacity: 0.1,
    }
  },
  "&:focus-visible": {
    outline: `2px solid ${colors.neutral[500]}`,
    outlineOffset: "2px",
    borderColor: colors.neutral[500],
  },
  "&:active": {
    transform: "translateY(2px)",
  },
  "&:disabled": {
    opacity: 0.6,
    filter: "grayscale(0.7)",
    cursor: "not-allowed",
    "&:hover": {
      transform: "scale(1)",
      "&::before": {
        opacity: 0,
      }
    },
  }
}, { name: "btn" });


css({
  borderRadius: "9999px",
}, { name: "btn-rounded" });

css({
  width: "100%",
}, { name: "btn-full" });

css({
  width: size(2.5),
  height: size(2.5),
  padding: 0,
}, { name: "btn-icon" });

export const btnColor = (colorKeys: ColorKey[]) => {
  colorKeys.forEach((colorKey) => {
    const baseColor = colors[colorKey];
    css({
      backgroundColor: baseColor[500],
      color: baseColor.contrast500,
    }, { name: `btn-${colorKey}` })
  })
};

export const btnOutline = (colorKeys: ColorKey[]) => {
  colorKeys.forEach((colorKey) => {
    const baseColor = colors[colorKey][600];
    css({
      backgroundColor: "transparent",
      "&::before": {
        backgroundColor: baseColor,
      },
      border: `1px solid ${baseColor}`,
      color: baseColor,
    }, { name: `btn-outline-${colorKey}` });
  });
};

export const btnSoft = (colorKeys: ColorKey[]) => {
  colorKeys.forEach((colorKey) => {
    const baseColor = colors[colorKey][600];
    css({
      backgroundColor: "transparent",
      color: baseColor,
      "&::before": {
        backgroundColor: baseColor,
        opacity: 0.1
      },
      "&:hover::before": {
        opacity: 0.2
      }
    }, { name: `btn-soft-${colorKey}` });
  });
};

export const btnScale = (size: "sm" | "lg") => css({
  paddingInline: `calc(${button.paddingInline} * ${scale[size]})`,
  paddingBlock: `calc(${button.paddingBlock} * ${scale[size]})`,
  fontSize: `calc(${button.fontSize} * ${scale[size]})`,
}, { name: `btn-${size}` });

const colorKeys = Object.keys(colorPalette) as ColorKey[];

btnColor(colorKeys);
btnOutline(colorKeys);
btnSoft(colorKeys);
btnScale("sm");
btnScale("lg");

mount(() => {
  return <div class={css({
    display: "flex",
    flexDirection: "column",
    maxWidth: size(40),
    margin: "auto",
    gap: size(1),
    padding: size(2),
  }, { name: "wrapper" })}>
    <h1>Buttons</h1>
    <h2>Filled</h2>
    <button class="btn btn-full">Full Button</button>
    <button class="btn btn-primary btn-full">Primary Button</button>
    <button class="btn btn-accent btn-full">Accent Button</button>
    <button class="btn btn-success btn-full">Success Button</button>
    <button class="btn btn-warning btn-full">Warning Button</button>
    <button class="btn btn-error btn-full">Error Button</button>
    <button class="btn btn-info btn-full">Info Button</button>
    <h2>Outline</h2>
    <button class="btn btn-outline-primary btn-full">Outline Primary Button</button>
    <button class="btn btn-outline-accent btn-full">Outline Accent Button</button>
    <button class="btn btn-outline-success btn-full">Outline Success Button</button>
    <button class="btn btn-outline-warning btn-full">Outline Warning Button</button>
    <button class="btn btn-outline-error btn-full">Outline Error Button</button>
    <button class="btn btn-outline-info btn-full">Outline Info Button</button>
    <button class="btn btn-outline btn-full">Outline Button</button>
    <h2>Soft</h2>
    <button class="btn btn-soft-primary btn-full">Soft Primary Button</button>
    <button class="btn btn-soft-accent btn-full">Soft Accent Button</button>
    <button class="btn btn-soft-success btn-full">Soft Success Button</button>
    <button class="btn btn-soft-warning btn-full">Soft Warning Button</button>
    <button class="btn btn-soft-error btn-full">Soft Error Button</button>
    <button class="btn btn-soft-info btn-full">Soft Info Button</button>
    <button class="btn btn-soft btn-full">Soft Button</button>
    <h2>Sizes</h2>
    <button class="btn btn-lg">Large Button</button>
    <button class="btn btn-sm">Small Button</button>
    <h2>Rounded</h2>
    <button class="btn btn-rounded">Rounded Button</button>
    <h2>Disabled</h2>
    <button disabled={true} class="btn btn-full">Disabled Button</button>
    <button disabled={true} class="btn btn-full">Full Button</button>
    <button disabled={true} class="btn btn-primary btn-full">Primary Button</button>
    <button disabled={true} class="btn btn-accent btn-full">Accent Button</button>
    <button disabled={true} class="btn btn-success btn-full">Success Button</button>
    <button disabled={true} class="btn btn-warning btn-full">Warning Button</button>
    <button disabled={true} class="btn btn-error btn-full">Error Button</button>
    <button disabled={true} class="btn btn-info btn-full">Info Button</button>
    <h2>Icon</h2>
    <button class="btn btn-icon btn-rounded">I</button>
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
  </div>
})