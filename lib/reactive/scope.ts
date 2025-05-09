let scopeStack: unknown[] = [];

export function pushScope<T>(ctx: T) {
  scopeStack.push(ctx);
}

export function popScope() {
  scopeStack.pop();
}

export function getCurrentScope() {
  return scopeStack[scopeStack.length - 1] || null;
}