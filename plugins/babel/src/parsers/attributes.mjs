// Parse HTML attributes from component strings
import { parseTextContent } from './text.mjs';

/**
 * @param {string | null | undefined} attrsStr
 * @param {any[]} expressions
 * @returns {Record<string, any>}
 */
export function parseAttributes(attrsStr, expressions) {
  if (!attrsStr?.trim()) return {};

  const props = {};
  // Match all prefixes including error:
  const attrRegex = /(error:[\w-]+|e:[\w-]+|on:[\w-]+|bind:[\w-]+|hook:[\w-]+|[\w-]+)(?:=(?:"([^"]*?)"|'([^']*?)'|(__SLOT_\d+__)|([^\s>]+)))?/g;
  let match;

  while ((match = attrRegex.exec(attrsStr)) !== null) {
    const name = match[1];
    const doubleQuoted = match[2];
    const singleQuoted = match[3];
    const slotMarker = match[4];
    const unquoted = match[5];

    if (slotMarker) {
      const slotMatch = slotMarker.match(/__SLOT_(\d+)__/);
      const index = slotMatch ? parseInt(slotMatch[1]) : 0;
      props[name] = { __slot: index };
    } else if (doubleQuoted !== undefined) {
      const singleSlotMatch = doubleQuoted.match(/^__SLOT_(\d+)__$/);
      if (singleSlotMatch) {
        props[name] = { __slot: parseInt(singleSlotMatch[1]) };
      } else {
        const parts = parseTextContent(doubleQuoted, expressions);
        if (parts.length === 1 && typeof parts[0] === 'string') {
          props[name] = parts[0];
        } else {
          props[name] = parts;
        }
      }
    } else if (singleQuoted !== undefined) {
      const singleSlotMatch = singleQuoted.match(/^__SLOT_(\d+)__$/);
      if (singleSlotMatch) {
        props[name] = { __slot: parseInt(singleSlotMatch[1]) };
      } else {
        const parts = parseTextContent(singleQuoted, expressions);
        if (parts.length === 1 && typeof parts[0] === 'string') {
          props[name] = parts[0];
        } else {
          props[name] = parts;
        }
      }
    } else if (unquoted !== undefined) {
      const singleSlotMatch = unquoted.match(/^__SLOT_(\d+)__$/);
      if (singleSlotMatch) {
        props[name] = { __slot: parseInt(singleSlotMatch[1]) };
      } else {
        props[name] = unquoted;
      }
    } else {
      props[name] = true;
    }
  }

  return props;
}
