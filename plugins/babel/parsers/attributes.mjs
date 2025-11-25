// Parse HTML attributes from component strings
import { parseTextContent } from './text.mjs';

export function parseAttributes(attrsStr, expressions) {
  if (!attrsStr?.trim()) return {};

  const props = {};
  const attrRegex = /(on:[\w-]+|bind:[\w-]+|hooks:[\w-]+|[\w-]+)(?:=(?:"([^"]*?)"|(__SLOT_\d+__)))?/g;
  let match;

  while ((match = attrRegex.exec(attrsStr)) !== null) {
    const name = match[1];
    const staticValue = match[2];
    const slotMarker = match[3];

    if (slotMarker) {
      const slotMatch = slotMarker.match(/__SLOT_(\d+)__/);
      const index = slotMatch ? parseInt(slotMatch[1]) : 0;
      props[name] = { __slot: index };
    } else if (staticValue !== undefined) {
      // Check if static value is a single slot marker
      const singleSlotMatch = staticValue.match(/^__SLOT_(\d+)__$/);
      if (singleSlotMatch) {
        props[name] = { __slot: parseInt(singleSlotMatch[1]) };
      } else {
        // Handle multiple slots or mixed content in attribute value
        const parts = parseTextContent(staticValue, expressions);
        if (parts.length === 1 && typeof parts[0] === 'string') {
          props[name] = parts[0];
        } else {
          props[name] = parts;
        }
      }
    } else {
      props[name] = true;
    }
  }

  return props;
}
