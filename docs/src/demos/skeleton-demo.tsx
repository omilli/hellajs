import { style } from "@hellajs/css";
import Skeleton from "@registry/skeleton/css/skeleton.js";
import { stack } from "./demo-kit";

const avatarRow = style({
  alignItems: "center",
  display: "flex",
  gap: "1rem",
  width: "100%",
}, { label: "demo-avatar-row" });

const col = style({
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
  width: "100%",
}, { label: "demo-col" });

const avatar = style({ borderRadius: "50%", height: "3rem", width: "3rem" }, { label: "demo-sk-avatar" });
const line32 = style({ height: "1rem", width: "8rem" }, { label: "demo-sk-32" });
const line24 = style({ height: "1rem", width: "6rem" }, { label: "demo-sk-24" });
const lineFull = style({ height: "1rem", width: "100%" }, { label: "demo-sk-full" });
const lineTwoThirds = style({ height: "1rem", width: "66.666667%" }, { label: "demo-sk-2/3" });
const block = style({ height: "8rem", width: "100%" }, { label: "demo-sk-block" });

export default function SkeletonDemo() {
  return (
    <div class={stack}>
      <div class={avatarRow}>
        <Skeleton class={avatar}>{[]}</Skeleton>
        <div class={col}>
          <Skeleton class={line32}>{[]}</Skeleton>
          <Skeleton class={line24}>{[]}</Skeleton>
        </div>
      </div>
      <div class={col}>
        <Skeleton class={lineFull}>{[]}</Skeleton>
        <Skeleton class={lineFull}>{[]}</Skeleton>
        <Skeleton class={lineTwoThirds}>{[]}</Skeleton>
      </div>
    </div>
  );
}

export function SkeletonBlockDemo() {
  return (
    <div class={stack}>
      <Skeleton class={block}>{[]}</Skeleton>
    </div>
  );
}
