import { css } from "@hellajs/css";
import { componentModule } from "../utils/component";

// Move this later
const NO_ANIMATE = "data-no-animate"
css({
  [`[${NO_ANIMATE}] *`]: {
    transition: "none !important"
  },
}, { global: true });

const ACCORDION = "data-accordion";
const ITEM = `${ACCORDION}-item`;
const TRIGGER = `${ACCORDION}-trigger`;
const CONTENT = `${ACCORDION}-content`;
const OPEN = "data-open";
const ALWAYS_OPEN = "data-always-open";
const SPEED = "data-speed";
const MULTIPLE = "data-multiple";

const DOC = document;

const setItemState = (item: HTMLElement, open: boolean, speed: number) => {
  const content = item.querySelector(`[${CONTENT}]`) as HTMLElement;
  const height = `${content.scrollHeight}px`;

  content.style.transition = `height ${speed}s ease`;

  open ? item.setAttribute(OPEN, "") : item.removeAttribute(OPEN);
  content.style.height = open ? '0' : height;
  content.style.height = open ? height : '0';
};

const toggleItem = (key: string, show: boolean, speed: number) => setItemState(DOC.querySelector(`[${ITEM}='${key}']`) as HTMLElement, show, speed);

const toggleAll = (accordion: HTMLElement, open: boolean, speed: number) => {
  const items = accordion.querySelectorAll(`[${ITEM}]`);
  let i = 0, len = items.length;
  for (; i < len; i++) {
    const item = items[i] as HTMLElement;
    const itemKey = item.getAttribute(ITEM) as string;
    toggleItem(itemKey, open, speed);
  }
};

type AccordionOptions = {
  speed: number;
};

type OptionalAccordionOptions = Partial<AccordionOptions>;

let moduleSpeed: number = 0.3;

export const AccordionModule = componentModule((options?: OptionalAccordionOptions) => {
  const { speed } = {
    ...options,
    speed: moduleSpeed
  };

  moduleSpeed = speed!;

  css({
    [`[${CONTENT}]`]: {
      overflow: 'hidden',
      height: '0',
    },
  }, { global: true });

  DOC.addEventListener("DOMContentLoaded", () => {
    DOC.querySelectorAll(`[${ITEM}][${OPEN}]`).forEach((item) => {
      const content = item.querySelector(`[${CONTENT}]`) as HTMLElement;
      item.setAttribute(NO_ANIMATE, "");
      content.style.height = `${content.scrollHeight}px`;
      requestAnimationFrame(() => item.removeAttribute(NO_ANIMATE));
    });
  });

  DOC.addEventListener("click", (event) => {
    const trigger = event.target as HTMLElement;
    if (!trigger.hasAttribute(TRIGGER)) return;

    const accordion = trigger.closest(`[${ACCORDION}]`) as HTMLElement;
    const item = trigger.closest(`[${ITEM}]`) as HTMLElement;
    const itemKey = item.getAttribute(ITEM) as string;

    const itemSpeed = parseFloat(accordion.getAttribute(SPEED) || String(speed));

    const isOpen = item.hasAttribute(OPEN);
    const alwaysOpen = accordion.hasAttribute(ALWAYS_OPEN);

    if (isOpen) {
      const openItems = accordion.querySelectorAll(`[${ITEM}][${OPEN}]`);
      const canClose = !alwaysOpen || openItems.length > 1;
      canClose && toggleItem(itemKey, false, itemSpeed);
    } else {
      !accordion.hasAttribute(MULTIPLE) && toggleAll(accordion, false, itemSpeed);
      toggleItem(itemKey, true, itemSpeed);
    }
  });

  return {
    speed,
  };
});

export const AccordionController = (
  key: string,
  options?: OptionalAccordionOptions
) => {
  options ??= {
    speed: moduleSpeed,
  };

  AccordionModule.initialized() || AccordionModule(options);

  const accordion = DOC.querySelector(`[${ACCORDION}='${key}']`) as HTMLElement;

  return {
    toggle: (
      itemKey: string,
      show: boolean,
      toggleOptions: OptionalAccordionOptions = {}
    ) => toggleItem(itemKey, show, {
      ...options,
      ...toggleOptions,
    }.speed!),
    toggleAll: (
      show: boolean,
      toggleOptions: OptionalAccordionOptions = {}
    ) => toggleAll(accordion, show, {
      ...options,
      ...toggleOptions,
    }.speed!),
  };
};