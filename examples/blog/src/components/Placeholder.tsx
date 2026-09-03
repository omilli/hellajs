import { style } from "@hellajs/css";
import { theme } from "../theme.ts";

const placeholder = style({
  textAlign: "center",
  color: theme.color.subtle,
  padding: "2rem 0",
}, { label: "placeholder" });

export const Placeholder = ({ message }: { message: string }) => (
  <div class={placeholder}>{message}</div>
);
