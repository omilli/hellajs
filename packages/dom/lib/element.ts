import { flush, scope, signal } from "./internal/core";
import { mount } from "./mount";
import type { ComponentProps, ComponentRenderFn, ComponentSlots, ElementOptions, HellaNode } from "./types/nodes";

/**
 * Defines a custom element with light DOM and slot support.
 * Props are reactive functions - when attributes change, effects re-run.
 * Children are captured before mount and available via props.children and props.slots.
 * @param tagName The custom element tag name (must contain a hyphen)
 * @param render Render function that receives props and returns a HellaNode
 * @param options Optional element options — `shadow` attaches a shadow root instead of rendering to light DOM
 * @throws {Error} When tagName is not a hyphenated string or render is not a function.
 */
export function element<T extends object = ComponentProps & Partial<ComponentSlots>>(
  tagName: string,
  render: ComponentRenderFn<T>,
  options: ElementOptions = {}
): void {
  class HellaCustomElement extends HTMLElement {
    private _dispose?: () => void;
    private _isInitialized = false;
    private _shadowRoot?: ShadowRoot;
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
      let i = 0;
      const len = childNodes.length;

      while (i < len) {
        const child = childNodes[i++]!;
        const slotName = (child as Element).getAttribute?.("slot");
        if (slotName) {
          (slots[slotName] ||= []).push(child);
        } else if (child.nodeType !== Node.TEXT_NODE || child.textContent?.trim()) {
          children.push(child);
        }
      }

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

      // attachShadow throws on a host that already carries a shadow root (reconnects), and
      // this.shadowRoot reads null for closed roots — so the reference lives on the instance.
      const root = options.shadow
        ? (this._shadowRoot ??= this.attachShadow(options.shadow === true ? { mode: "open" } : options.shadow))
        : this;

      this._dispose = scope(() => {
        mount(render(props) as HellaNode, root);
      });
    }

    connectedCallback() {
      if (this._isInitialized) return;
      this._isInitialized = true;

      // Defer mount to allow children to be parsed
      // Children aren't available until after connectedCallback completes
      Promise.resolve().then(() => this._mount());
    }

    disconnectedCallback() {
      this._dispose?.();
      this._dispose = undefined;
      this._isInitialized = false;
    }
  }

  if (typeof tagName !== "string" || !tagName.includes("-")) {
    throw new Error(`[dom] element: tagName must be a hyphenated string, received ${typeof tagName !== "string" ? typeof tagName : tagName}`);
  }
  if (typeof render !== "function") {
    throw new Error(`[dom] element: render must be a function, received ${typeof render}`);
  }

  customElements.define(tagName, HellaCustomElement);
}
