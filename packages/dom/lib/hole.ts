import type { VNodeProps, VNodeValue } from "./types";

export type HoleArgs = (VNodeProps | VNodeValue)[];

export type HoleChild = (...args: HoleArgs) => VNodeValue;

export const hole = (args: any[]) => {
  const isProps = typeof args[0] === 'object' && Object.hasOwn(args[0], 'tag');
  let props: VNodeProps = isProps ? args[0] : {}, children = args;
  return { props, children }
}
