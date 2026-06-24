import type { HellaNode } from "@hellajs/dom";

export const fallbackHandler = (
  def: HellaNode | (() => HellaNode) | null = null
) =>
  onError((error: Error, context) =>
    context.config?.fallback?.(error) ?? (def as HellaNode | null));
