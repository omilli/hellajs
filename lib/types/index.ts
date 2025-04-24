import type { VNodeString } from "./dom";

export * from "./dom";
export * from "./attributes";
export * from "./html";
export * from "./reactive"

/**
 * Object with a known ID property
 */
export interface WithId {
  id: VNodeString;
}