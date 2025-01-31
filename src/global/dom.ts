import { StyleConfig } from "../types";

export const STYLE_CACHE = {
  scoped: new Map<string, string>(),
  global: new Map<string, string>(),
};

export const STYLE_CONFIG: StyleConfig = {
  scope: "scoped",
  sizeTo: "px",
};

export const COMPONENT_REGISTRY = new Map<
  string,
  {
    nodeEffects: Set<() => void>;
    propEffects: Set<() => void>;
    events: Map<HTMLElement, Map<string, (event: Event) => void>>;
    rootListeners: Set<(event: Event) => void>;
  }
>();

export function componentRegistry(root: string) {
  let component = COMPONENT_REGISTRY.get(root);
  if (!component) {
    COMPONENT_REGISTRY.set(root, {
      nodeEffects: new Set(),
      propEffects: new Set(),
      events: new Map(),
      rootListeners: new Set(),
    });
    component = COMPONENT_REGISTRY.get(root);
  }
  return component!;
}

export const NON_UNIT_PROPERTIES = new Set([
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
