import { signal } from "@hellajs/core";

import Avatar, { AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage } from "@registry/avatar/css/avatar.js";

export function AvatarDemo() {
  const loaded = signal(false);

  return (
    <Avatar>
      <AvatarImage src="/missing-avatar.png" alt="Broken image" loaded={loaded} />
      <AvatarFallback loaded={loaded}>M</AvatarFallback>
    </Avatar>
  );
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
