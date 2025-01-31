import { isRecord } from "../global";
import {
  ElementFunction,
  HNode,
  HProps,
  HNodeChildren,
  HTMLTagName,
} from "./types";

export function h(
  type: HTMLTagName,
  props: HProps = {},
  children: HNodeChildren = []
): HNode {
  return { type, props, children };
}

export const html: {
  [Tag in HTMLTagName]: ElementFunction<Tag>;
} = new Proxy({} as any, {
  get: (_, tag: string) => createElement(tag as HTMLTagName),
});

function parseArgs(
  args: Array<HProps | HNodeChildren>
): [HProps, HNodeChildren] {
  const first = args[0];
  const second = args[1] as HNodeChildren;
  const isChildren = Array.isArray(first) || !isRecord(first);
  switch (true) {
    case args.length === 0:
      return [{}, []];
    case args.length === 1:
      return isChildren ? [{}, first as HNodeChildren] : [first as HProps, []];
    default:
      return [(first as HProps) || {}, second];
  }
}

function createElement(tag: HTMLTagName): ElementFunction<typeof tag> {
  return (...args: any[]): HNode => {
    const [props, children] = parseArgs(args);
    return h(tag, { ...props, tag }, children);
  };
}
