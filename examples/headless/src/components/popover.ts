import { css } from "@hellajs/css";
import { computePosition, autoPosition, type Placement, type PositioningSystem } from "../utils/position";
import { componentModule } from "../utils/component";

const POPOVER = "data-popover";
const TRIGGER = `${POPOVER}-trigger`;
const CONTENT = `${POPOVER}-content`;
const OPEN = "data-open";
const PLACEMENT = "data-placement";
const OFFSET = "data-offset";
const SPEED = "data-speed";

const DOC = document;


type PopoverOptions = {
  offset: number;
  speed: number;
  reactive?: boolean;
};

type OptionalPopoverOptions = Partial<PopoverOptions>;

// Track reactive positioning systems for cleanup
const positioningSystems = new WeakMap<HTMLElement, PositioningSystem>();

const showPopover = (
  trigger: HTMLElement,
  { offset, speed, reactive }: PopoverOptions
) => {
  const popover = trigger.closest(`[${POPOVER}]`) as HTMLElement;
  const content = popover.querySelector(`[${CONTENT}]`) as HTMLElement;
  const placement = (popover.getAttribute(PLACEMENT) || 'bottom') as Placement;
  const offsetValue = parseInt(popover.getAttribute(OFFSET) || String(offset));
  const speedValue = parseFloat(popover.getAttribute(SPEED) || String(speed));

  popover.setAttribute(OPEN, '');

  content.style.transition = `opacity ${speedValue}s ease`;

  if (reactive) {
    // Use reactive positioning with auto-updates
    const system = autoPosition({
      trigger,
      content,
      placement,
      offset: offsetValue,
      autoUpdate: true
    });
    positioningSystems.set(popover, system);
  } else {
    // Use imperative positioning (original behavior)
    const { x, y, placement: finalPlacement } = computePosition(
      trigger,
      content,
      placement,
      offsetValue
    );

    content.style.left = `${x}px`;
    content.style.top = `${y}px`;
    content.setAttribute(PLACEMENT, finalPlacement);
  }
};

const hidePopover = (popover: HTMLElement) => {
  popover.removeAttribute(OPEN);

  // Cleanup reactive positioning system if exists
  const system = positioningSystems.get(popover);
  if (system) {
    system.cleanup();
    positioningSystems.delete(popover);
  }
};

const closePopovers = (
  filter?: (popover: HTMLElement) => boolean
) => {
  const openPopovers = DOC.querySelectorAll(`[${POPOVER}][${OPEN}]`);
  let i = 0, len = openPopovers.length;
  for (; i < len; i++) {
    const popover = openPopovers[i] as HTMLElement;
    (!filter || filter(popover)) && hidePopover(popover);
  }
};

let moduleSpeed: number = 0.3;
let moduleOffset: number = 8;
let moduleReactive: boolean = false;

export const PopoverModule = componentModule((options?: OptionalPopoverOptions) => {
  const moduleOptions = {
    offset: moduleOffset,
    speed: moduleSpeed,
    reactive: moduleReactive,
    ...options
  };

  moduleOffset = moduleOptions.offset!;
  moduleSpeed = moduleOptions.speed!;
  moduleReactive = moduleOptions.reactive!;

  css({
    [`[${CONTENT}]`]: {
      position: 'fixed',
      width: 'max-content',
      zIndex: 1000,
      opacity: 0,
      pointerEvents: 'none',
    },
    [`[${POPOVER}][${OPEN}] [${CONTENT}]`]: {
      opacity: 1,
      pointerEvents: 'auto',
    },
  }, { global: true });

  DOC.addEventListener('click', (event) => {
    const trigger = event.target as HTMLElement;

    if (trigger.hasAttribute(TRIGGER)) {
      const popover = trigger.closest(`[${POPOVER}]`) as HTMLElement;
      popover.hasAttribute(OPEN) ? hidePopover(popover) : showPopover(trigger, moduleOptions);
      return;
    }

    // Close popover if clicking outside
    closePopovers((popover) =>
      !(popover.querySelector(`[${CONTENT}]`) as HTMLElement)
        .contains(trigger)
    );
  });

  // In non-reactive mode, close on scroll/resize (reactive mode handles positioning automatically)
  if (!moduleReactive) {
    window.addEventListener('scroll', () => closePopovers(), true);
    window.addEventListener('resize', () => closePopovers());
  }

  // Close on escape key
  DOC.addEventListener('keydown', (event) =>
    event.key === 'Escape' && closePopovers()
  );
});

const togglePopover = (
  key: string,
  show: boolean,
  options: PopoverOptions
) => {
  const popover = DOC.querySelector(`[${POPOVER}='${key}']`) as HTMLElement;
  if (show) {
    const trigger = popover.querySelector(`[${TRIGGER}]`) as HTMLElement;
    showPopover(trigger, options);
  } else {
    hidePopover(popover);
  }
};

export const PopoverController = (
  key: string,
  options?: OptionalPopoverOptions
) => {
  options ??= {
    offset: moduleOffset,
    speed: moduleSpeed,
  };

  PopoverModule.initialized() || PopoverModule(options);

  return {
    toggle: (show: boolean,
      toggleOptions: OptionalPopoverOptions) => togglePopover(key, show, {
        ...options,
        ...toggleOptions
      } as PopoverOptions),
  };
};
