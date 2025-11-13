export type Placement = 'top' | 'right' | 'bottom' | 'left';

export const getViewportBounds = () => ({
  width: window.innerWidth,
  height: window.innerHeight,
});

export const getRect = (el: HTMLElement) => el.getBoundingClientRect();

export const computePosition = (trigger: HTMLElement, content: HTMLElement, placement: Placement = 'bottom', offset = 8, padding = 5) => {
  const triggerRect = getRect(trigger);
  const contentRect = getRect(content);
  const viewport = getViewportBounds();

  let x = 0, y = 0;
  let finalPlacement = placement;

  const isVertical = placement === 'top' || placement === 'bottom';
  const isHorizontal = placement === 'left' || placement === 'right';

  if (isVertical) {
    const isTop = placement === 'top';
    y = isTop ? triggerRect.top - contentRect.height - offset : triggerRect.bottom + offset;
    x = triggerRect.left + (triggerRect.width - contentRect.width) / 2;

    const overflowsVertical = isTop ? y < padding : y + contentRect.height > viewport.height - padding;

    if (overflowsVertical) {
      const altY = isTop ? triggerRect.bottom + offset : triggerRect.top - contentRect.height - offset;
      const altOverflow = isTop ? altY + contentRect.height > viewport.height - padding : altY < padding;

      if (!altOverflow) {
        y = altY;
        finalPlacement = isTop ? 'bottom' : 'top';
      }
    }

    // Adjust horizontal centering if overflow
    x = x < padding ? padding : x + contentRect.width > viewport.width - padding ? viewport.width - contentRect.width - padding : x;
  }

  if (isHorizontal) {
    const isLeft = placement === 'left';
    x = isLeft ? triggerRect.left - contentRect.width - offset : triggerRect.right + offset;
    y = triggerRect.top + (triggerRect.height - contentRect.height) / 2;

    const overflowsHorizontal = isLeft ? x < padding : x + contentRect.width > viewport.width - padding;

    if (overflowsHorizontal) {
      const altX = isLeft ? triggerRect.right + offset : triggerRect.left - contentRect.width - offset;
      const altOverflow = isLeft ? altX + contentRect.width > viewport.width - padding : altX < padding;

      if (!altOverflow) {
        x = altX;
        finalPlacement = isLeft ? 'right' : 'left';
      }
    }

    // Adjust vertical centering if overflow
    y = y < padding ? padding : y + contentRect.height > viewport.height - padding ? viewport.height - contentRect.height - padding : y;
  }

  return { x, y, placement: finalPlacement };
};
