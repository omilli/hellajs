import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from "@components/ui/avatar.js";

export function AvatarDemo() {
  return <Avatar src="/missing-avatar.png" alt="Broken image" fallback="M" />;
}

export function AvatarGroupDemo() {
  return (
    <AvatarGroup>
      <Avatar><AvatarFallback>M</AvatarFallback></Avatar>
      <Avatar><AvatarFallback>J</AvatarFallback></Avatar>
      <Avatar><AvatarFallback>A</AvatarFallback></Avatar>
      <AvatarGroupCount>+5</AvatarGroupCount>
    </AvatarGroup>
  );
}
