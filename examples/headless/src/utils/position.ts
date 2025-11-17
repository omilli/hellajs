import { signal, computed, effect, batch, type Signal } from '@hellajs/core';

export type Placement = 'top' | 'right' | 'bottom' | 'left';

export type Position = {
  x: number;
  y: number;
  placement: Placement;
};

export type ViewportBounds = {
  width: number;
  height: number;
};

export const getViewportBounds = (): ViewportBounds => ({
  width: window.innerWidth,
  height: window.innerHeight,
});

export const getRect = (el: HTMLElement) => el.getBoundingClientRect();

export const computePosition = (
  trigger: HTMLElement,
  content: HTMLElement,
  placement: Placement = 'bottom',
  offset = 8,
  padding = 5
): Position => {
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

// Reactive positioning system
export type PositioningConfig = {
  trigger: HTMLElement;
  content: HTMLElement;
  placement?: Placement;
  offset?: number;
  padding?: number;
  autoUpdate?: boolean;
};

export type PositioningSystem = {
  position: Signal<Position>;
  viewport: Signal<ViewportBounds>;
  setPlacement: Signal<Placement>;
  setOffset: Signal<number>;
  setPadding: Signal<number>;
  update: () => void;
  cleanup: () => void;
};

export const positioning = (config: PositioningConfig): PositioningSystem => {
  const triggerEl = signal(config.trigger);
  const contentEl = signal(config.content);
  const placement = signal<Placement>(config.placement || 'bottom');
  const offset = signal(config.offset || 8);
  const padding = signal(config.padding || 5);
  const viewport = signal(getViewportBounds());
  const updateTrigger = signal(0);

  // Compute position reactively
  const position = computed(() => {
    // Force recompute when updateTrigger changes
    updateTrigger();

    const trigger = triggerEl();
    const content = contentEl();
    viewport(); // Track viewport for reactivity

    if (!trigger || !content) return { x: 0, y: 0, placement: placement() };

    return computePosition(trigger, content, placement(), offset(), padding());
  });

  const handlers: (() => void)[] = [];

  // Auto-update on resize
  const resizeHandler = () => {
    batch(() => {
      viewport(getViewportBounds());
      updateTrigger(updateTrigger() + 1);
    });
  };

  // Auto-update on scroll
  const scrollHandler = () => updateTrigger(updateTrigger() + 1);

  if (config.autoUpdate !== false) {
    window.addEventListener('resize', resizeHandler);
    window.addEventListener('scroll', scrollHandler, true);
    handlers.push(
      () => window.removeEventListener('resize', resizeHandler),
      () => window.removeEventListener('scroll', scrollHandler, true)
    );
  }

  const update = () => updateTrigger(updateTrigger() + 1);

  const cleanup = () => {
    let i = 0;
    const len = handlers.length;
    for (; i < len; i++) handlers[i]();
  };

  return {
    position,
    viewport,
    setPlacement: placement,
    setOffset: offset,
    setPadding: padding,
    update,
    cleanup
  };
};

export const autoPosition = (config: PositioningConfig) => {
  const system = positioning(config);

  // Auto-apply position to content element
  const cleanup = effect(() => {
    const pos = system.position();
    const content = config.content;

    content.style.left = `${pos.x}px`;
    content.style.top = `${pos.y}px`;
    content.setAttribute('data-placement', pos.placement);
  });

  return {
    ...system,
    cleanup: () => {
      cleanup();
      system.cleanup();
    }
  };
};
