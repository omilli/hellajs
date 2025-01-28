import {
  ElementFunction,
  HNode,
  HProps,
  HNodeChildren,
  HTMLTagName,
  HPropsOrChildren,
} from "../types";

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

function isChildrenArg(arg: HPropsOrChildren): arg is HNodeChildren {
  return Array.isArray(arg) || typeof arg !== "object";
}

function parseArgs(args: any[]): [HProps, HNodeChildren] {
  if (args.length === 0) {
    return [{}, []];
  }

  if (args.length === 1) {
    return isChildrenArg(args[0]) ? [{}, args[0]] : [args[0], []];
  }

  return [args[0] || {}, args[1]];
}

function createElement(tag: HTMLTagName): ElementFunction<typeof tag> {
  return (...args: any[]): HNode => {
    const [props, children] = parseArgs(args);
    return h(tag, { ...props, tag }, children);
  };
}
