import { signal } from "@hellajs/core";
import type {
  AvatarComponents,
  AvatarFallbackProps,
  AvatarImageProps,
  AvatarOptions,
  AvatarRootProps,
} from "./types/components";

/**
 * Creates the avatar parts: `Root` + `Image` + `Fallback`. The closure owns one
 * loaded signal — load state is an element-lifecycle fact, not user intent, so
 * nothing is controlled. `Image` hides itself until the native `load` event
 * fires and flips the signal (`error` flips it back); `Fallback` hides while
 * the signal reads true. Both members stay mounted — the swap is
 * attribute-driven — so a broken URL drops the image back out and the fallback
 * returns. Each factory call holds independent state. Call in component scope
 * so the signal disposes with the component.
 *
 * ```tsx
 * const Avatar = avatar();
 *
 * <Avatar.Root>
 *   <Avatar.Image src="/me.png" alt="Portrait" />
 *   <Avatar.Fallback>M</Avatar.Fallback>
 * </Avatar.Root>
 * ```
 * @param options Reserved for future options (a fallback flicker delay); load state is never controlled.
 * @returns The part set, composed as `Avatar.Root`-style members.
 */
export function avatar(options: AvatarOptions = {}): AvatarComponents {
  const loaded = signal(false);

  const Root = (props: AvatarRootProps): JSX.Element => {
    const { children, class: cls, ...attrs } = props;
    return (
      <div data-slot="avatar" class={cls} {...attrs}>
        {children}
      </div>
    );
  };

  const Image = (props: AvatarImageProps): JSX.Element => {
    const { class: cls, ...attrs } = props;
    return (
      <img
        data-slot="avatar-image"
        hidden={() => !loaded()}
        class={cls}
        e:load={() => loaded(true)}
        e:error={() => loaded(false)}
        {...attrs}
      />
    );
  };

  const Fallback = (props: AvatarFallbackProps): JSX.Element => {
    const { children, class: cls, ...attrs } = props;
    return (
      <span data-slot="avatar-fallback" hidden={loaded} class={cls} {...attrs}>
        {children}
      </span>
    );
  };

  return { Root, Image, Fallback };
}
