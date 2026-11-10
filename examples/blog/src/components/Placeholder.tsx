import { style } from "@hellajs/css";
import { theme } from "../theme";

interface PlaceholderProps {
  message: string;
}

const placeholder = style({
  textAlign: "center",
  color: theme.color.subtle,
  padding: "2rem 0",
});

export const Placeholder = ({ message }: PlaceholderProps) => (
  <div class={placeholder}>{message}</div>
);
