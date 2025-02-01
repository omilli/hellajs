import { isRecord } from "../global";
import {
  ElementFunction,
  HellaElement,
  HProps,
  HNodeChildren,
  HTMLTagName,
} from "./types";

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
  return args.length === 0
    ? [{}, []]
    : args.length === 1
    ? isChildren
      ? [{}, first as HNodeChildren]
      : [first as HProps, []]
    : [(first as HProps) || {}, second];
}

function createElement(tag: HTMLTagName): ElementFunction<typeof tag> {
  return (...args: any[]): HellaElement => {
    const [props, children] = parseArgs(args);
    return { ...props, tag, children };
  };
}
