import { isRecord, isFunction } from "../global";
import {
  ElementFunction,
  HellaElement,
  HProps,
  HNodeChildren,
  HTMLTagName,
} from "./types";

// Returns html tag functions
export const html: {
  // @ts-expect-error (Trick to force fragment type support)
  [Tag in HTMLTagName | "$"]: ElementFunction<Tag>;
} = new Proxy({} as any, {
  get: (_, tag: string) => createElement(tag as HTMLTagName),
});

// Creates element functions for given html tag
function createElement(tag: HTMLTagName): ElementFunction<typeof tag> {
  return (...args: any[]): HellaElement => {
    const [props, content] = parseArgs(args);
    const { root, ...rest } = props;
    return (tag as string) === "$"
      ? ({ root, content } as HellaElement)
      : { ...rest, root, tag, content };
  };
}
// Extracts props and content from function arguments
function parseArgs(
  args: Array<HProps | HNodeChildren>
): [HProps, HNodeChildren] {
  const first = args[0];
  const second = args[1];
  const isPrimitiveOrFunction =
    typeof first === "string" || typeof first === "number" || isFunction(first);
  const isChildren =
    Array.isArray(first) || isPrimitiveOrFunction || !isRecord(first);
  const wrapChildren = (content: any) =>
    Array.isArray(content) ? content : [content];

  return args.length === 0
    ? [{}, []]
    : args.length === 1
    ? isChildren
      ? [{}, wrapChildren(first)]
      : [first as HProps, []]
    : [first as HProps, wrapChildren(second)];
}
