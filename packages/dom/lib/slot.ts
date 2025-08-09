import type { VNodeProps, VNodeValue } from "./types";
import { isVNode } from "./utils";

export type SlotChildren = VNodeValue | VNodeValue[];

export type SlotProps = VNodeProps & { children?: SlotChildren };

export type SlotChild = (props: SlotProps) => VNodeValue;

export type SlotArgs = (VNodeProps | VNodeValue)[];

export type SlotResult = {
  props: VNodeProps;
  children: VNodeValue[];
};

export const slot = (args: VNodeValue[]): SlotResult => {
  const isProps = args.length > 0 && isVNode(args[0]);
  const props: VNodeProps = isProps ? args[0] as VNodeProps : {};
  const children = isProps ? args.slice(1) : args;
  return { props, children };
};