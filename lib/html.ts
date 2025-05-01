import type { VNode, VNodeProps, VNodeValue, HTMLElementProxy, HTMLTagCache, HTMLElementFactory, HTMLTagName } from "./types";


export const html: HTMLElementProxy = new Proxy(
  {} as HTMLTagCache,
  {
    get(target, tag: string): HTMLElementFactory {
      if (tag in target) {
        return target[tag];
      }

      const factory: HTMLElementFactory = (
        propsOrChild?: VNodeProps | VNodeValue,
        ...children: VNodeValue[]
      ): VNode => {
        const hasProps = propsOrChild !== null &&
          typeof propsOrChild === 'object' &&
          !Array.isArray(propsOrChild) &&
          !(propsOrChild instanceof Function) &&
          !('type' in propsOrChild && 'props' in propsOrChild && 'children' in propsOrChild);

        const props = hasProps ? (propsOrChild as VNodeProps) : {};
        const childArgs = hasProps ? children : [propsOrChild, ...children];

        const normalizedChildren = childArgs
          .flat(Infinity)
          .filter(child => child !== undefined && child !== null)
          .map(child => (
            typeof child === 'string' || typeof child === 'number'
              ? child as string
              : child
          )) as (VNode | string | (() => unknown))[];

        return {
          type: tag as HTMLTagName,
          props,
          children: normalizedChildren
        };
      };

      target[tag] = factory;
      return factory;
    },
  }
) as HTMLElementProxy;