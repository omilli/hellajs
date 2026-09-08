// HTML template parser for tagged template literals
import { FRAGMENT_TAG, VOID_TAGS } from "../constants.mjs";
import { parseAttributes } from "./attributes.mjs";
import { parseTextContent } from "./text.mjs";

// Strip HTML comments, DOCTYPE, and CDATA sections before tokenization
const SKIP_REGEX = /<!--[\s\S]*?-->|<!DOCTYPE[^>]*>|<!\[CDATA\[[\s\S]*?\]\]>/gi;

/** @typedef {{ tag?: string, props?: Record<string, boolean | string | { __slot: number } | Array<string | { __slot: number }>>, children?: HtmlNode[], __slot?: number } | string} HtmlNode */

/**
 * Parse HTML template to intermediate AST
 * @param {Array<{ value: { raw: string } }>} quasis
 * @param {import("@babel/core").Expression[]} expressions
 * @returns {HtmlNode}
 */
export function parseHTMLComponent(quasis, expressions) {
  // Build HTML string with slot markers
  let htmlString = "";
  let i = 0;
  const len = quasis.length;

  while (i < len) {
    htmlString += quasis[i].value.raw;
    if (i < expressions.length) {
      htmlString += `__SLOT_${i}__`;
    }
    i++;
  }

  // Parse HTML to intermediate structure
  const nodes = parseHTML(htmlString, expressions);
  return nodes.length === 1 ? nodes[0] : { tag: FRAGMENT_TAG, children: nodes };
}

/**
 * Parse HTML string to intermediate AST structure
 * @param {string} html
 * @param {import("@babel/core").Expression[]} expressions
 * @returns {HtmlNode[]}
 */
export function parseHTML(html, expressions) {
  const cleaned = html.replace(SKIP_REGEX, "");
  const trimmed = cleaned.trim();

  // Single slot marker - return expression directly
  if (trimmed.match(/^__SLOT_\d+__$/)) {
    const match = trimmed.match(/__SLOT_(\d+)__/);
    const index = match ? parseInt(match[1]) : 0;
    return [{ __slot: index }];
  }

  // Replace fragment syntax with special tag name
  const normalizedHTML = cleaned
    .replace(/<>/g, `<__fragment__>`)
    .replace(/<\/>/g, `</__fragment__>`);

  const result = [];
  const stack = [];
  let current = null;
  const tokenRegex = /<(\/)?([\w-]*)([^>]*?)(\s*\/)?>|([^<]+)/g;
  let match;

  while ((match = tokenRegex.exec(normalizedHTML)) !== null) {
    const isClosing = match[1];
    let tagName = match[2];
    const attrsStr = match[3];
    const isSelfClosing = match[4];
    const textContent = match[5];

    // Convert __fragment__ back to FRAGMENT_TAG
    if (tagName === "__fragment__") {
      tagName = FRAGMENT_TAG;
    }

    if (textContent) {
      const children = parseTextContent(textContent.trim(), expressions);
      if (children.length > 0) {
        if (current) {
          current.children = current.children || [];
          children.forEach(child => current.children.push(child));
        } else {
          children.forEach(child => result.push(child));
        }
      }
    } else if (isClosing) {
      // Close the nearest open ancestor with a matching tag (implicitly closing
      // everything above it); a closer with no matching open element is stray
      // and dropped. Dynamic-component closers (</__SLOT_N__>) match the
      // nearest open dynamic component: the open and close markers are distinct
      // expressions, so their indices never agree.
      const isSlotCloser = /^__SLOT_\d+__$/.test(tagName);
      let k = stack.length - 1;
      while (k >= 0) {
        const openTag = stack[k].tag;
        if (isSlotCloser ? /^__SLOT_\d+__$/.test(openTag) : openTag === tagName) break;
        k--;
      }

      if (k >= 0) {
        const completed = stack[k];
        stack.length = k;
        if (k === 0) {
          result.push(completed);
          current = null;
        } else {
          current = stack[k - 1];
        }
      }
    } else {
      const node = {
        tag: tagName,
        props: tagName === FRAGMENT_TAG ? {} : parseAttributes(attrsStr, expressions),
        children: []
      };

      // Void elements never push to the stack: they are leaf nodes whose
      // following content is a sibling, not a child.
      if (isSelfClosing || VOID_TAGS.has(tagName)) {
        if (current) {
          current.children = current.children || [];
          current.children.push(node);
        } else {
          result.push(node);
        }
      } else {
        if (current) {
          current.children = current.children || [];
          current.children.push(node);
        }
        stack.push(node);
        current = node;
      }
    }
  }

  // Unclosed elements flush at EOF: children were parented at their open, so
  // only the outermost open element becomes a root — nothing is re-added.
  if (stack.length > 0) {
    result.push(stack[0]);
  }

  return result;
}
