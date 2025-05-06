import { scope, setCurrentScope, getCurrentScope } from "../reactive";
import type { VNode } from "../types";

export function component<Props extends object>(
  fn: (props?: Props) => VNode & { cleanup?: () => void } | [VNode, () => void]
) {
  return (props?: Props) => {
    const componentScope = scope();
    const prev = getCurrentScope();
    setCurrentScope(componentScope);
    let result: VNode;
    let userCleanup: (() => void) | undefined;
    try {
      const out = fn(props);
      if (Array.isArray(out)) {
        result = out[0];
        userCleanup = out[1];
      } else {
        result = out;
        userCleanup = out.cleanup;
      }
    } finally {
      setCurrentScope(prev);
    }
    if (typeof result === "object") {
      result.cleanup = () => {
        userCleanup?.();
        componentScope.cleanup();
      };
    }
    return result;
  };
}