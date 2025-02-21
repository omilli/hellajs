export const dangerousTags = new Set(["script", "iframe", "object", "embed"]);
export const maxChildDepth = 100;

export const validateTag = (tag: string): boolean =>
  !dangerousTags.has(tag.toLowerCase());

/* Validates that handler doesn't contain dangerous patterns */
export const validateEventHandler = (handler: Function): boolean => {
  const handlerString = handler.toString().toLowerCase();
  const dangerousPatterns = [
    "eval",
    "settimeout",
    "setinterval",
    "new function",
    "constructor",
    "__proto__",
    "prototype",
  ];

  return !dangerousPatterns.some((pattern) => handlerString.includes(pattern));
};

export const validateElementDepth = (depth: number): boolean =>
  depth < maxChildDepth;
