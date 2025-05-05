import { getCurrentScope } from "../reactive";
import type { VNodeValue } from "../types";
import type { ComponentContext } from "./component";
import type { Context } from "./context";

/**
 * Provides a context value to its children within the component tree.
 *
 * @template T - The type of the context value.
 * @param params - The parameters for the Provider component.
 * @param params.context - The context object to provide.
 * @param params.value - The value to associate with the context.
 * @param params.children - The child nodes that will have access to the provided context.
 * @returns A VNode representing the Provider wrapper for its children.
 * @throws Will throw an error if used outside of a valid component scope.
 */
export function Provider<T>({ context, value, children }: {
  context: Context<T>;
  value: T;
  children: VNodeValue[];
}) {
  const scope = getCurrentScope();
  if (!scope || !('contexts' in scope)) {
    throw new Error('Provider must be used within a Component');
  }

  (scope as ComponentContext).contexts.set(context, value);

  return {
    tag: '$',
    props: {},
    children,
  };
}