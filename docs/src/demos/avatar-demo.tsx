import { signal } from "@hellajs/core";

import Avatar, { AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage } from "@registry/avatar/css/avatar.js";
import { stack } from "./demo-kit";

export default function AvatarDemo() {
  const loaded = signal(false);

  return (
    <div class={stack}>
      <Avatar>
        <AvatarImage src="/missing-avatar.png" alt="Broken image" loaded={loaded} />
        <AvatarFallback loaded={loaded}>M</AvatarFallback>
      </Avatar>
    </div>
  );
}

export function AvatarGroupDemo() {
  return (
    <div class={stack}>
      <AvatarGroup>
        <Avatar><AvatarFallback>M</AvatarFallback></Avatar>
        <Avatar><AvatarFallback>J</AvatarFallback></Avatar>
        <Avatar><AvatarFallback>A</AvatarFallback></Avatar>
        <AvatarGroupCount>+5</AvatarGroupCount>
      </AvatarGroup>
    </div>
  );
}
