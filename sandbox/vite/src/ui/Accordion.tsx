import { signal } from "@hellajs/core";
import { slot, SlotProps } from "@hellajs/dom";

<style global="true">
  {{
    '[data-ui="accordion-item"]': {
      display: "none",
      '&[data-ui-open="true"]': {
        display: "block"
      }
    }
  }}
</style>

export function HeadlessAccordion() {
  const isOpen = signal(false);
  const toggle = () => isOpen(!isOpen());

  const Container = ({ children }: SlotProps) =>
    <div data-ui="accordion">{slot(children)}</div>;

  const Toggle = ({ children }: SlotProps) =>
    <div data-ui="accordion-toggle" onclick={toggle}>{slot(children)}</div>;

  const Item = ({ children }: SlotProps) =>
    <div data-ui="accordion-item" data-ui-open={isOpen}>{slot(children)}</div>;

  return {
    isOpen,
    toggle,
    Container,
    Toggle,
    Item
  }
}