import { flush, scope, signal } from "./internal/core";
import { mount } from "./mount";
import type { ElementProps, ElementRender, ElementSlots, HellaNode } from "./types/nodes.d.ts";

/**
 * Defines a custom element with light DOM and slot support.
 * Props are reactive functions - when attributes change, effects re-run.
 * Children are captured before mount and available via props.children and props.slots.
 * @param tagName The custom element tag name (must contain a hyphen)
 * @param render Render function that receives props and returns a HellaNode
 */
export function element<T extends object = ElementProps & Partial<ElementSlots>>(
  tagName: string,
  render: ElementRender<T>
): void {
  class HellaElement extends HTMLElement {
    private _dispose?: () => void;
    private _initialized = false;
    private _version = signal(0);

    private _bumpVersion() {
      this._version(this._version() + 1);
      flush();
    }

    private _mount() {
      const version = this._version;
      const self = this;

      // Capture children before mount clears them
      const children: Node[] = [];
      const slots: Record<string, Node[]> = {};
      const childNodes = this.childNodes;
      let i = 0, len = childNodes.length;

      while (i < len) {
        const child = childNodes[i++];
        const slotName = (child as Element).getAttribute?.("slot");
        if (slotName) {
          (slots[slotName] ||= []).push(child);
        } else if (child.nodeType !== Node.TEXT_NODE || child.textContent?.trim()) {
          children.push(child);
        }
      }

      // Props proxy provides attributes, children, and slots
      const props = new Proxy({} as T, {
        get(_, name: string) {
          if (name === "children") return children;
          if (name === "slots") return slots;
          return () => {
            version();
            return self.getAttribute(name);
          };
        }
      });

      // Override attribute methods for synchronous reactivity
      const origSetAttribute = this.setAttribute.bind(this);
      const origRemoveAttribute = this.removeAttribute.bind(this);

      this.setAttribute = (name: string, value: string) => {
        origSetAttribute(name, value);
        this._bumpVersion();
      };

      this.removeAttribute = (name: string) => {
        origRemoveAttribute(name);
        this._bumpVersion();
      };

      // Wrap render in scope for automatic cleanup
      this._dispose = scope(() => {
        mount(render(props) as HellaNode, this);
      });
    }

    connectedCallback() {
      if (this._initialized) return;
      this._initialized = true;

      // Defer mount to allow children to be parsed
      // Children aren't available until after connectedCallback completes
      Promise.resolve().then(() => this._mount());
    }

    disconnectedCallback() {
      this._dispose?.();
      this._dispose = undefined;
      this._initialized = false;
    }
  }

  customElements.define(tagName, HellaElement);
}
