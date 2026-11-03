import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import { avatar } from "@hellajs/headless";

export function AvatarDemo() {
  // A valid base64 payload that is not a real PNG: the image decode fails
  // without a network request, so the demo's error path stays silent.
  const brokenSrc = "data:image/png;base64,aGVsbG8=";

  const portraitSrc =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%237c3aed'/%3E%3Ccircle cx='16' cy='12' r='6' fill='white'/%3E%3Cpath d='M4 32c0-6.6 5.4-12 12-12s12 5.4 12 12' fill='white'/%3E%3C/svg%3E";

  const Avatar = avatar();
  const broken = signal(true);

  const avatarDemo = style({
    alignItems: "center",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    '& [data-slot="avatar"]': {
      alignItems: "center",
      borderRadius: "9999px",
      display: "flex",
      height: "3rem",
      justifyContent: "center",
      overflow: "hidden",
      width: "3rem",
    },
    '& [data-slot="avatar-image"]': {
      height: "100%",
      objectFit: "cover",
      width: "100%",
    },
    "& .note": {
      fontSize: "0.875rem",
      margin: 0,
      opacity: 0.7,
    },
  });

  return (
    <div class={avatarDemo}>
      <Avatar.Root>
        <Avatar.Image src={() => (broken() ? brokenSrc : portraitSrc)} alt="Portrait" />
        <Avatar.Fallback>KB</Avatar.Fallback>
      </Avatar.Root>
      <button type="button" on:click={() => broken(!broken())}>
        {() => (broken() ? "Fix src" : "Break src")}
      </button>
      <p class="note">
        {() => (broken() ? "The src failed - the fallback shows." : "The src loaded - the portrait shows.")}
      </p>
    </div>
  );
}
