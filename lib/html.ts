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
          !('tag' in propsOrChild && 'props' in propsOrChild && 'children' in propsOrChild);

        const props = hasProps ? (propsOrChild as VNodeProps) : {};
        const childArgs = hasProps ? children : [propsOrChild, ...children];

        return {
          tag: tag as HTMLTagName,
          props,
          children: childArgs as VNodeValue[],
        };
      };

      target[tag] = factory;
      return factory;
    },
  }
) as HTMLElementProxy;