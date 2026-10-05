import Badge from "@registry/badge/css/badge.js";

export function BadgeDemo() {
  return (
    <>
      <Badge>Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
      <Badge variant="ghost">Ghost</Badge>
      <Badge variant="link">Link</Badge>
    </>
  );
}

export function BadgeAnchorDemo() {
  return (
    <a href="#open">
      <Badge variant="outline">12 open</Badge>
    </a>
  );
}
