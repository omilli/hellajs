import { isString } from "../global";

// Sanitize a string value
export const sanitizeValue = (value: any): string =>
  isString(value) ? value.replace(/[^\w\s-:./]/gi, "") : String(value);

// Sanitize a url
export const sanitizeUrl = (url: string): string => {
  const parsed = new URL(url, window.location.origin);
  return ["http:", "https:"].includes(parsed.protocol) ? url : "";
};

// Sanitize an html string
export const sanitizeHtml = (html: string): string => {
  const div = document.createElement("div");
  div.textContent = html;
  return div.innerHTML;
};

// Sanitize a dangerous prop string
const dangerousProps = new Set(["href", "src", "action", "data"]);
export const shouldSanitizeProp = (key: string): boolean =>
  dangerousProps.has(key);
