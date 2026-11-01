import * as SonnerCss from "../../../dist/registry/sonner/css/sonner";
import * as SonnerTailwind from "../../../dist/registry/sonner/tailwind/sonner";
import type { HTMLAttributes } from "@hellajs/dom";
import type { ComponentVariant } from "../../helpers/variants-core";

/** Prop bag shared by every compiled Sonner variant (mirrors the emitted ToasterProps). */
export interface SonnerVariantProps extends HTMLAttributes<"ol"> {
  class?: string;
  position?:
    | "top-left"
    | "top-center"
    | "top-right"
    | "bottom-left"
    | "bottom-center"
    | "bottom-right";
  richColors?: boolean;
}
/** The compiled module's toast queue API — the shared `@hellajs/headless` singleton, re-exported by both flavors. */
export type SonnerToastApi = typeof SonnerCss.toast;
/** The newest toaster ol portaled into document.body. */
function newestToaster(): Element | null {
  const toasters = document.querySelectorAll("[data-sonner-toaster]");
  return toasters.length === 0 ? null : toasters[toasters.length - 1]!;
}
/**
 * Every compiled Sonner flavor. `render` is the Toaster export;
 * `toast` is the shared headless queue singleton both flavors re-export,
 * so the two variants drive one store.
 */
export interface SonnerVariant extends ComponentVariant<SonnerVariantProps> {
  toast: SonnerToastApi;
  root: () => Element | null;
}
/**
 * Every compiled Sonner variant (the Toaster export) from dist/registry.
 */
export const sonnerVariants: SonnerVariant[] = [
  { style: "css", render: SonnerCss.Toaster, toast: SonnerCss.toast, root: newestToaster },
  {
    style: "tailwind",
    render: SonnerTailwind.Toaster,
    toast: SonnerTailwind.toast,
    root: newestToaster,
  },
];
