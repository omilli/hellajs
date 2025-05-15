import type { Context, ContextStack, VNode } from "../types";

export function context<T>(defaultValue: T): Context<T> {
  const stack: ContextStack<T> = [];

  function provide(props: { value: T; children: () => VNode }) {
    stack.push(props.value);
    const result = props.children();
    stack.pop();
    return result;
  }

  function use() {
    if (stack.length === 0) return defaultValue;
    return stack[stack.length - 1];
  }

  return { provide, use };
}