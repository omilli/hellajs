import { css } from "@hellajs/css";

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

const DOC = document;

const setItemState = (item: HTMLElement, open: boolean) => {
  const content = item.querySelector(`[${CONTENT}]`) as HTMLElement;
  const height = `${content.scrollHeight}px`;
  open ? item.setAttribute(OPEN, "") : item.removeAttribute(OPEN);
  content.style.height = open ? '0' : height;
  content.style.height = open ? height : '0';
};

const toggleItem = (key: string, show: boolean) => setItemState(DOC.querySelector(`[${ITEM}='${key}']`) as HTMLElement, show);

const toggleAll = (accordion: HTMLElement, open: boolean) => {
  const items = accordion.querySelectorAll(`[${ITEM}]`);
  let i = 0, len = items.length;
  for (; i < len; i++) {
    const item = items[i] as HTMLElement;
    const itemKey = item.getAttribute(ITEM) as string;
    open ? toggleItem(itemKey, true) : toggleItem(itemKey, false);
  }
}

let IsInitialized = false;

export const AccordionModule = (options?: { speed?: number }) => {
  const { speed = 0.3 } = options || {};

  if (IsInitialized) return;

  css({
    [`[${CONTENT}]`]: {
      overflow: 'hidden',
      height: '0',
      transition: `height ${speed}s ease`
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

    const isOpen = item.hasAttribute(OPEN);
    const alwaysOpen = accordion.hasAttribute(ALWAYS_OPEN);

    if (isOpen) {
      const openItems = accordion.querySelectorAll(`[${ITEM}][${OPEN}]`);
      const canClose = !alwaysOpen || openItems.length > 1;
      canClose && toggleItem(itemKey, false);
    } else {
      !accordion.hasAttribute("multiple") && toggleAll(accordion, false);
      toggleItem(itemKey, true);
    }
  });

  IsInitialized = true;
}

export const AccordionController = (key: string) => {
  if (!IsInitialized) {
    AccordionModule();
    IsInitialized = true;
  }

  const accordion = DOC.querySelector(`[${ACCORDION}='${key}']`) as HTMLElement;

  return {
    toggle: (key: string, show: boolean) => toggleItem(key, show),
    toggleAll: (show: boolean) => toggleAll(accordion, show),
  };
}