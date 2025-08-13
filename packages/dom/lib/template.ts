import type { VNode, VNodeValue } from "./types";

type TemplateFn = (ctx: Record<string, unknown>) => VNode;

// Simple template cache
const templates = new Map<string, TemplateFn>();

export function registerTemplate(id: string, template: TemplateFn): void {
  templates.set(id, template);
}

export function bindTemplate(id: string, ctx: Record<string, unknown>): VNode | VNodeValue {
  const template = templates.get(id);
  return template ? template(ctx) : ctx;
}