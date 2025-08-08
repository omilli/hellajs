import type { VNodeProps, VNodeValue } from "./types";

export type HoleArgs = (VNodeProps | VNodeValue)[];

export type HoleChild = (...args: HoleArgs) => VNodeValue;

export type HoleResult = {
  props: VNodeProps;
  children: VNodeValue[];
};

export const hole = (args: VNodeValue[]): HoleResult => {
  const isProps = args.length > 0 && typeof args[0] === 'object' && args[0] !== null && 'tag' in args[0];
  const props: VNodeProps = isProps ? args[0] as VNodeProps : {};
  const children = isProps ? args.slice(1) : args;
  return { props, children };
};
