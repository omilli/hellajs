import { getCurrentScope } from "../reactive";
import type { VNodeValue } from "../types";
import type { ComponentContext } from "./component";
import type { Context } from "./context";

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
    tag: 'fragment',
    props: {},
    children,
  };
}