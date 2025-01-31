import { StyleConfig } from "../types";

export const STYLE_CACHE = {
  scoped: new Map<string, string>(),
  global: new Map<string, string>(),
};

export const STYLE_CONFIG: StyleConfig = {
  scope: "scoped",
  sizeTo: "px",
};

export const STYLE_SIZE_IGNORE = new Set([
  "opacity",
  "flex",
  "flexGrow",
  "flexShrink",
  "order",
  "gridRow",
  "gridColumn",
  "gridArea",
  "zIndex",
  "aspectRatio",
  "scale",
  "scaleX",
  "scaleY",
  "scaleZ",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "wordSpacing",
  "fill",
  "fillOpacity",
  "stroke",
  "strokeOpacity",
  "animationIterationCount",
  "alpha",
  "colorStop",
  "columnCount",
  "columns",
  "perspective",
  "zoom",
]);
