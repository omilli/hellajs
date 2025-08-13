import type { VNode } from "./nodes";

export interface TemplateFn {
  (ctx: Record<string, unknown>): VNode;
}