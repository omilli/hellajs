import { forEach } from "./forEach";
import type { VNodeProps } from "./types";

export type SlotChildren = JSX.Element | JSX.Element[];

export type SlotProps = VNodeProps & { children?: SlotChildren };

export type SlotChild = (props: SlotProps) => JSX.Element;

export const slot = (children?: SlotChildren) =>
  Array.isArray(children) ? forEach(children, (child) => child) : children;