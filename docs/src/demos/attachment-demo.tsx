
import { stack } from "./demo-kit";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from "@registry/attachment/css/attachment.js";

type ChipState = "idle" | "uploading" | "processing" | "error" | "done";

function chip(name: string, note: string, state: ChipState) {
  return (
    <Attachment state={state} size="sm">
      <AttachmentMedia state={state} />
      <AttachmentContent>
        <AttachmentTitle>{name}</AttachmentTitle>
        <AttachmentDescription>{note}</AttachmentDescription>
      </AttachmentContent>
      <AttachmentActions>
        <AttachmentAction onclick={() => alert(`Remove ${name}`)}>x</AttachmentAction>
      </AttachmentActions>
    </Attachment>
  );
}

function sized(name: string, size: "default" | "sm" | "xs") {
  return (
    <Attachment state="done" size={size}>
      <AttachmentMedia state="done" />
      <AttachmentContent>
        <AttachmentTitle>{name}</AttachmentTitle>
      </AttachmentContent>
    </Attachment>
  );
}

export default function AttachmentDemo() {
  return (
    <div class={stack}>
      <AttachmentGroup>
        {chip("report.pdf", "Uploaded", "done")}
        {chip("photo.png", "Uploading...", "uploading")}
        {chip("archive.zip", "Failed", "error")}
        {chip("drop-file", "Waiting", "idle")}
      </AttachmentGroup>
    </div>
  );
}

export function AttachmentSizesDemo() {
  return (
    <div class={stack}>
      {sized("design-xs.png", "xs")}
      {sized("design-sm.png", "sm")}
      {sized("design.png", "default")}
    </div>
  );
}
