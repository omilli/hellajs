import { css } from "@hellajs/css";

const getItem = (key: string): HTMLElement =>
  document.querySelector(`[data-accordion-item='${key}']`) as HTMLElement;

const getItemKey = (item: HTMLElement) => item.getAttribute("data-accordion-item") as string;

const getContent = (item: HTMLElement): HTMLElement =>
  item.querySelector("[data-accordion-content]") as HTMLElement

const animate = (el: HTMLElement, from: string, to: string) => {
  el.style.height = from;
  el.style.height = to;
};

const setItemState = (item: HTMLElement, open: boolean) => {
  const content = getContent(item);
  const height = `${content.scrollHeight}px`;
  open ? item.setAttribute("data-open", "") : item.removeAttribute("data-open");
  animate(content, open ? '0' : height, open ? height : '0');
};

const openItem = (key: string) => setItemState(getItem(key), true);
const closeItem = (key: string) => setItemState(getItem(key), false);

const toggleAll = (accordion: HTMLElement, open: boolean) => {
  const items = accordion.querySelectorAll("[data-accordion-item]");
  let i = 0, len = items.length;
  for (; i < len; i++) {
    const item = items[i] as HTMLElement;
    const itemKey = getItemKey(item);
    open ? openItem(itemKey) : closeItem(itemKey);
  }
}

let IsInitialized = false;

export const AccordionModule = () => {
  if (IsInitialized) return;

  css({
    [`[data-no-animate] *`]: {
      transition: "none !important"
    },
  }, { global: true });

  css({
    [`[data-accordion-content]`]: {
      overflow: 'hidden',
      height: '0',
      transition: 'height 0.3s ease'
    },
  }, { global: true });

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-accordion-item][data-open]").forEach((item) => {
      const content = getContent(item as HTMLElement);
      item.setAttribute("data-no-animate", "");
      content.style.height = `${content.scrollHeight}px`;
      requestAnimationFrame(() => item.removeAttribute("data-no-animate"));
    });
  });

  document.addEventListener("click", (event) => {
    const trigger = event.target as HTMLElement;
    if (!trigger.hasAttribute("data-accordion-trigger")) return;

    const accordion = trigger.closest("[data-accordion]") as HTMLElement;
    const item = trigger.closest("[data-accordion-item]") as HTMLElement;
    const itemKey = getItemKey(item);

    const isOpen = item.hasAttribute("data-open");
    const alwaysOpen = accordion.hasAttribute("data-always-open");

    if (isOpen) {
      const openItems = accordion.querySelectorAll("[data-accordion-item][data-open]");
      const canClose = !alwaysOpen || openItems.length > 1;
      canClose && closeItem(itemKey);
    } else {
      !accordion.hasAttribute("multiple") && toggleAll(accordion, false);
      openItem(itemKey);
    }
  });

  IsInitialized = true;
}

export const AccordionController = (key: string) => {
  if (!IsInitialized) {
    AccordionModule();
    IsInitialized = true;
  }
  const accordion = document.querySelector(`[data-accordion='${key}']`) as HTMLElement;
  return {
    open: (key: string) => openItem(key),
    openAll: () => toggleAll(accordion, true),
    close: (key: string) => closeItem(key),
    closeAll: () => toggleAll(accordion, false)
  };
}