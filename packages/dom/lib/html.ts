import type { VNode, VNodeValue, VNodeProps, HTMLTagName } from "./types";

// Pre-compiled regexes for better performance
const ATTR_REGEX = /(\w+(?:-\w+)*)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
const PLACEHOLDER_REGEX = /__P(\d+)__/g;

export function html(template: TemplateStringsArray, ...values: VNodeValue[]): VNode {
  let htmlString = '';
  for (let i = 0; i < template.length; i++) {
    htmlString += template[i];
    if (i < values.length) htmlString += `__P${i}__`;
  }
  return parse(htmlString.trim(), values);
}

function parse(html: string, values: VNodeValue[]): VNode {
  html = html.trim();
  if (!html.startsWith('<')) {
    return { tag: '$', children: interpolate(html, values) as VNodeValue[] };
  }

  const tagMatch = html.match(/^<(\w+)([^>]*?)(?:\s*\/)?>/);
  if (!tagMatch) throw new Error(`Invalid HTML: ${html}`);

  const [fullMatch, tagName, attrsString] = tagMatch;
  const tag = tagName.toLowerCase() as HTMLTagName;
  const isSelfClosing = fullMatch.endsWith('/>');
  const props = parseAttrs(attrsString.trim(), values);

  if (isSelfClosing) return { tag, props, children: [] };

  const closingTag = `</${tag}>`;
  const closingIndex = html.lastIndexOf(closingTag);
  if (closingIndex === -1) return { tag, props, children: [] };

  const content = html.slice(fullMatch.length, closingIndex);
  const children = parseChildren(content, values);

  return { tag, props, children };
}

function parseAttrs(attrsString: string, values: VNodeValue[]): VNodeProps {
  if (!attrsString) return {};

  const props: VNodeProps = {};
  ATTR_REGEX.lastIndex = 0; // Reset regex state
  let match;

  while ((match = ATTR_REGEX.exec(attrsString))) {
    const [, name, doubleQuoted, singleQuoted, unquoted] = match;
    const value = doubleQuoted ?? singleQuoted ?? unquoted ?? '';
    (props as any)[name] = value.includes('__P') ? interpolate(value, values, true) : value;
  }

  return props;
}

function parseChildren(content: string, values: VNodeValue[]): VNodeValue[] {
  if (!content.trim()) return [];

  const children: VNodeValue[] = [];
  let remaining = content;

  while (remaining) {
    const tagMatch = remaining.match(/^(\s*)<(\w+)([^>]*?)>/);

    if (tagMatch) {
      const [fullMatch, leadingWhitespace, tagName] = tagMatch;

      if (leadingWhitespace?.trim()) {
        children.push(...(interpolate(leadingWhitespace, values) as VNodeValue[]));
      }

      const elementHtml = extractElement(remaining.slice(leadingWhitespace.length), tagName);
      children.push(parse(elementHtml, values));
      remaining = remaining.slice(leadingWhitespace.length + elementHtml.length);
    } else {
      const trimmed = remaining.trim();
      if (trimmed) children.push(...(interpolate(trimmed, values) as VNodeValue[]));
      break;
    }
  }

  return children.filter(child => child !== '' && child != null);
}

function extractElement(html: string, tagName: string): string {
  const firstTagEnd = html.indexOf('>');
  if (firstTagEnd === -1) return html;

  if (html.slice(0, firstTagEnd + 1).endsWith('/>')) {
    return html.slice(0, firstTagEnd + 1);
  }

  let depth = 1;
  let i = firstTagEnd + 1;
  const openTag = `<${tagName}`;
  const closeTag = `</${tagName}>`;

  while (i < html.length && depth > 0) {
    if (html.slice(i).startsWith(openTag)) {
      depth++;
      i += openTag.length;
    } else if (html.slice(i).startsWith(closeTag)) {
      depth--;
      i += closeTag.length;
    } else {
      i++;
    }
  }

  return html.slice(0, i);
}

// Unified interpolation function - handles both attributes and text
function interpolate(text: string, values: VNodeValue[], isAttribute = false): VNodeValue | VNodeValue[] {
  if (!text.includes('__P')) return isAttribute ? text : (text ? [text] : []);

  // Single placeholder optimization for attributes
  if (isAttribute) {
    const match = text.match(/^__P(\d+)__$/);
    if (match) return values[parseInt(match[1], 10)];
  }

  const parts: VNodeValue[] = [];
  PLACEHOLDER_REGEX.lastIndex = 0; // Reset regex state
  let lastIndex = 0;
  let match;

  while ((match = PLACEHOLDER_REGEX.exec(text))) {
    const beforeText = text.slice(lastIndex, match.index);
    if (beforeText) parts.push(beforeText);

    const index = parseInt(match[1], 10);
    if (index < values.length) parts.push(values[index]);

    lastIndex = match.index + match[0].length;
  }

  const afterText = text.slice(lastIndex);
  if (afterText) parts.push(afterText);

  return isAttribute ? parts.join('') : parts;
}