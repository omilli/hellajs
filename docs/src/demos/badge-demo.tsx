import { style } from "@hellajs/css";
import Badge from "@registry/badge/css/badge.js";

const row = style({
  alignItems: "center",
  display: "flex",
  gap: "0.5rem",
  justifyContent: "center",
  flexWrap: "wrap",
});

export default function BadgeDemo() {
  return (
    <div class={row}>
      <Badge>Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
      <Badge variant="ghost">Ghost</Badge>
      <Badge variant="link">Link</Badge>
    </div>
  );
}

export function BadgeAnchorDemo() {
  return (
    <a href="#open">
      <Badge variant="outline">12 open</Badge>
    </a>
  );
}
