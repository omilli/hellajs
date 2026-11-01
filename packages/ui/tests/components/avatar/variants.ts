import { Avatar as AvatarCssDefault } from "../../../dist/registry/avatar/css/avatar";
import { Avatar as AvatarTailwindDefault } from "../../../dist/registry/avatar/tailwind/avatar";
import * as AvatarCssJsx from "../../../dist/registry/avatar/css/avatar";
import * as AvatarTailwindJsx from "../../../dist/registry/avatar/tailwind/avatar";
import type { GlobalHTMLAttributes, HTMLAttributes, HellaChildren } from "@hellajs/dom";
import { partVariants } from "../../helpers/variants-core";
import type { AnyModule, ChildrenVariant, PartVariant } from "../../helpers/variants-core";

/** Prop bag shared by every compiled Avatar part (the open contract across the span/div/img roots). */
export interface AvatarPartProps extends GlobalHTMLAttributes {
  class?: string;
  children?: HellaChildren;
}
/** Prop bag for the compiled Avatar root (mirrors the emitted AvatarProps). */
export interface AvatarVariantProps extends AvatarPartProps {
  size?: "default" | "sm" | "lg";
  /** Composed path: the portrait source; renders the image part hidden until it loads. */
  src?: string;
  /** Composed path: the portrait's alt text. */
  alt?: string;
  /** Composed path: the initial; rendered as the fallback part, hidden while the image is loaded. */
  fallback?: HellaChildren;
}
/** Prop bag for the compiled AvatarImage part (mirrors the emitted AvatarImageProps). */
export interface AvatarImageVariantProps extends HTMLAttributes<"img"> {
  class?: string;
  loaded?: (value?: boolean) => boolean;
}
/** Prop bag for the compiled AvatarFallback part (mirrors the emitted AvatarFallbackProps). */
export interface AvatarFallbackVariantProps extends AvatarPartProps {
  loaded?: () => boolean;
}
/** The named Avatar parts (the other Avatar exports). */
export const AVATAR_PARTS = ["Image", "Fallback", "Badge", "Group", "GroupCount"] as const;
/** Superset prop bag across Avatar parts (Image carries src/alt/loaded; Fallback carries loaded). */
export type AvatarPartVariantProps = AvatarImageVariantProps & AvatarFallbackVariantProps;
/**
 * Every compiled Avatar variant (the Avatar export) from dist/registry.
 */
export const avatarVariants: ChildrenVariant<AvatarVariantProps>[] = [
  { style: "css", render: AvatarCssDefault, child: (value) => [value] },
  { style: "tailwind", render: AvatarTailwindDefault, child: (value) => [value] },
];
/**
 * Every compiled Avatar part (AvatarImage…AvatarGroupCount) at both styles.
 */
export const avatarPartVariants: PartVariant<AvatarPartVariantProps>[] = AVATAR_PARTS.flatMap(
  (part) =>
    partVariants(part, "Avatar", [
      [AvatarCssJsx as unknown as AnyModule, "css"],
      [AvatarTailwindJsx as unknown as AnyModule, "tailwind"],
    ]),
);
