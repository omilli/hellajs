import type { VNodeProps, VNodeValue } from "./types";

export type SlotChildren = VNodeValue | VNodeValue[];

export type SlotProps = VNodeProps & { children?: SlotChildren };

export type SlotChild = (props: SlotProps) => VNodeValue;

export declare const slot: <T extends VNodeValue | VNodeValue[]>(children: T) => T;