import type { HTMLAttributes } from "@hellajs/dom";
import type { ToasterPosition } from "@hellajs/headless";

export interface ToasterProps extends HTMLAttributes<"ol"> {
  class?: string;
  position?: ToasterPosition;
  /** Tints the whole card per flavor (sonner's richColors); icons are tinted either way. */
  richColors?: boolean;
}
