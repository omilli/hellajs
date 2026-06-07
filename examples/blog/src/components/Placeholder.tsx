import { css } from "@hellajs/css";
import { theme } from "../theme.ts";

export const Placeholder = ({ message }: { message: string }) => (
  <div class="placeholder">{message}</div>
);

css({
  ".placeholder": {
    textAlign: "center",
    color: theme.color.subtle,
    padding: "2rem 0",
  }
});