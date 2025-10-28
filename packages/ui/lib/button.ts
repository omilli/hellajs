import { css, type CSSObject } from "@hellajs/css";
import { scale, size, colors } from "./global";

const buttonConfig: CSSObject = {
  // Layout
  paddingInline: size(1.25),
  paddingBlock: size(1),
  // Typography
  fontSize: size(0.9),
};

export const button = (styles?: CSSObject) => css({
  // Layout
  position: "relative",
  overflow: "hidden",
  isolation: "isolate",
  paddingInline: buttonConfig.paddingInline,
  paddingBlock: buttonConfig.paddingBlock,
  borderRadius: size(0.25),
  border: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  // Typography
  fontSize: buttonConfig.fontSize,
  fontWeight: 500,
  lineHeight: 1,
  // Colors
  backgroundColor: colors.neutral[900],
  color: colors.neutral.contrast900,
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
    filter: "grayscale(0.3)",
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
  },
  ...styles
}, { name: "btn" });

export const buttonColor = (colorKeys: string[], styles?: CSSObject) => {
  colorKeys.forEach((colorKey) => {
    css({
      backgroundColor: colors[colorKey][500],
      color: colors[colorKey].contrast500,
      ...styles
    }, { name: `btn-${colorKey}` })
  })
};

export const buttonOutline = (colorKeys: string[], styles?: CSSObject) => {
  colorKeys.forEach((colorKey) => {
    const baseColor = colors[colorKey][600];
    css({
      backgroundColor: "transparent",
      "&::before": {
        backgroundColor: baseColor,
      },
      border: `1px solid ${baseColor}`,
      color: baseColor,
      ...styles
    }, { name: `btn-outline-${colorKey}` });
  });
};

export const buttonSoft = (colorKeys: string[], styles?: CSSObject) => {
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
      },
      ...styles
    }, { name: `btn-soft-${colorKey}` });
  });
};

export const buttonRounded = (styles?: CSSObject) => css({
  borderRadius: "9999px",
  ...styles
}, { name: "btn-rounded" });

export const buttonFull = (styles?: CSSObject) => css({
  width: "100%",
  ...styles
}, { name: "btn-full" });

export const buttonIcon = (styles?: CSSObject) => css({
  width: size(2.5),
  height: size(2.5),
  padding: 0,
  ...styles
}, { name: "btn-icon" });

export const buttonScale = (size: "sm" | "lg", styles?: CSSObject) => css({
  paddingInline: `calc(${buttonConfig.paddingInline} * ${scale[size]})`,
  paddingBlock: `calc(${buttonConfig.paddingBlock} * ${scale[size]})`,
  fontSize: `calc(${buttonConfig.fontSize} * ${scale[size]})`,
  ...styles
}, { name: `btn-${size}` });

export const buttonModule = (colorKeys: string[]) => {
  button();
  buttonRounded();
  buttonFull();
  buttonIcon();
  buttonColor(colorKeys);
  buttonOutline(colorKeys);
  buttonSoft(colorKeys);
  buttonScale("sm");
  buttonScale("lg");
}
