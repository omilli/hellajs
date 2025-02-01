import { isRecord } from "../global";
import {
  ElementFunction,
  HellaElement,
  HProps,
  HNodeChildren,
  HTMLTagName,
} from "./types";

// Returns html tag functions
// const { div } = html;
// div({ id: "foo" }, "Hello, World!");
export const html: {
  [Tag in HTMLTagName]: ElementFunction<Tag>;
} = new Proxy({} as any, {
  get: (_, tag: string) => createElement(tag as HTMLTagName),
});

// Creates element functions for given html tag
function createElement(tag: HTMLTagName): ElementFunction<typeof tag> {
  return (...args: any[]): HellaElement => {
    const [props, children] = parseArgs(args);
    return { ...props, tag, children };
  };
}
// Extracts props and children from function arguments
// Possible combos:
// div("Hello, World!");
// div({ id: "foo" }, "Hello, World!");
// div({ id: "foo" }, [span("Hello, World!")]);
// div([span("Hello, World!")]);
// div(span("Hello, World!"));
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
