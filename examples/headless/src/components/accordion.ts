import { css } from "@hellajs/css";

const getItem = (key: string): HTMLElement => {
  return document.querySelector(`[data-accordion-item='${key}']`) as HTMLElement;
}

const getContent = (item: HTMLElement): HTMLElement => {
  return item.querySelector("[data-accordion-content]") as HTMLElement;
}

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

const openItem = (item: HTMLElement) => setItemState(item, true);
const closeItem = (item: HTMLElement) => setItemState(item, false);

const toggleAll = (accordion: HTMLElement, open: boolean) => {
  const items = accordion.querySelectorAll("[data-accordion-item]");
  let i = 0, len = items.length;
  for (; i < len; i++) {
    const item = items[i] as HTMLElement;
    open ? openItem(item) : closeItem(item);
  }
}

const open = (key: string) => {
  const item = getItem(key);
  item && openItem(item);
};

const close = (key: string) => {
  const item = getItem(key);
  item && closeItem(item);
}

export const AccordionModule = () => {
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

    const isOpen = item.hasAttribute("data-open");
    const alwaysOpen = accordion.hasAttribute("data-always-open");

    if (isOpen) {
      const openItems = accordion.querySelectorAll("[data-accordion-item][data-open]");
      const canClose = !alwaysOpen || openItems.length > 1;
      canClose && closeItem(item);
    } else {
      !accordion.hasAttribute("multiple") && toggleAll(accordion, false);
      openItem(item);
    }
  });

}

export const AccordionController = (key: string) => {
  const accordion = document.querySelector(`[data-accordion='${key}']`) as HTMLElement;
  return {
    open,
    openAll: () => toggleAll(accordion, true),
    close,
    closeAll: () => toggleAll(accordion, false)
  };
}