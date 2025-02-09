export const dangerousTags = new Set(["script", "iframe", "object", "embed"]);
export const dangerousProps = new Set([
  "href",
  "src",
  "action",
  "data",
  "onclick",
]);
export const maxChildDepth = 100;

export const validateTag = (tag: string): boolean =>
  !dangerousTags.has(tag.toLowerCase());

export const validateEventHandler = (handler: Function): boolean => {
  const handlerString = handler.toString();
  return (
    !handlerString.includes("eval") &&
    !handlerString.includes("Function") &&
    !handlerString.includes("setTimeout") &&
    !handlerString.includes("setInterval")
  );
};

export const validateElementDepth = (depth: number): boolean =>
  depth < maxChildDepth;
