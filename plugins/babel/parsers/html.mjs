// HTML template parser for tagged template literals
import { FRAGMENT_TAG } from '../constants.mjs';
import { parseAttributes } from './attributes.mjs';
import { parseTextContent } from './text.mjs';

// Parse HTML template to intermediate AST
export function parseHTMLTemplate(quasis, expressions) {
  // Build HTML string with slot markers
  let htmlString = '';
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

// Parse HTML string to intermediate AST structure
export function parseHTML(html, expressions) {
  const trimmed = html.trim();

  // Single slot marker - return expression directly
  if (trimmed.match(/^__SLOT_\d+__$/)) {
    const match = trimmed.match(/__SLOT_(\d+)__/);
    const index = match ? parseInt(match[1]) : 0;
    return [{ __slot: index }];
  }

  // Replace fragment syntax with special tag name
  const normalizedHTML = html
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
    if (tagName === '__fragment__') {
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
      if (stack.length > 0) {
        const completed = stack.pop();
        if (stack.length === 0) {
          result.push(completed);
          current = null;
        } else {
          current = stack[stack.length - 1];
        }
      }
    } else {
      const node = {
        tag: tagName,
        props: tagName === FRAGMENT_TAG ? {} : parseAttributes(attrsStr, expressions),
        children: []
      };

      if (isSelfClosing) {
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

  return result;
}
