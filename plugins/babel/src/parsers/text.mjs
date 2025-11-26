// Parse text content with slot markers

export function parseTextContent(text, expressions) {
  if (!text) return [];

  const parts = [];
  const slotRegex = /__SLOT_(\d+)__/g;
  let lastIndex = 0;
  let match;

  while ((match = slotRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const textBefore = text.slice(lastIndex, match.index);
      if (textBefore) parts.push(textBefore);
    }
    parts.push({ __slot: parseInt(match[1]) });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex);
    if (remaining) parts.push(remaining);
  }

  return parts.length === 0 ? [text] : parts;
}
