import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import Button from "@registry/button/css/button.js";
import Toaster, { toast } from "@registry/sonner/css/sonner.js";

const stack = style({
  alignItems: "flex-start",
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
  maxWidth: "26rem",
  width: "100%",
});

const row = style({
  alignItems: "center",
  display: "flex",
  flexWrap: "wrap",
  gap: "0.5rem",
  justifyContent: "center",
  width: "100%",
});



export function SonnerDemo() {
  const pending = signal(false);

  const firePromise = () => {
    pending(true);
    toast.promise(
      new Promise<string>((resolve) => setTimeout(() => resolve("report.pdf"), 1600)),
      {
        loading: "Uploading",
        success: (name) => `Uploaded ${name}`,
        error: "Upload failed",
      },
    );
    setTimeout(() => pending(false), 1700);
  };

  return (
    <>
      <Toaster richColors />
      <div class="demo-row">
        <Button on:click={() => toast("Saved", { description: "Your work is safe.", type: "success" })}>Success</Button>
        <Button on:click={() => toast("Something broke.", { type: "error" })}>Error</Button>
        <Button on:click={() => toast("Disk almost full.", { type: "warning" })}>Warning</Button>
        <Button on:click={() => toast("New version available.", { type: "info" })}>Info</Button>
      </div>
      <div class="demo-row">
        <Button variant="outline" on:click={() => toast("Deleted", { action: { label: "Undo", onclick: () => toast("Restored.", { type: "success" }) } })}>Action toast</Button>
        <Button variant="outline" on:click={firePromise}>{() => (pending() ? "Uploading…" : "Promise toast")}</Button>
        <Button variant="outline" on:click={() => toast.dismiss()}>Dismiss all</Button>
      </div>
      <p class="demo-muted">Toasts stack bottom-right (three visible, older ones shrink and retire), pause their countdown on hover, and swipe away past 45% of the toast width. The X button appears on hover.</p>
    </>
  );
}

export function SonnerQueueDemo() {
  const burst = () => {
    let n = 0;
    const tick = () => {
      n += 1;
      toast(`Background job ${n}`, { description: `Entry ${n} of 5` });
      if (n < 5) setTimeout(tick, 500);
    };
    tick();
  };

  return (
    <>
      <Button variant="outline" on:click={burst}>Run five jobs</Button>
      <p class="demo-muted">Five toasts enter one shared queue (portaled beside the hero stack above): the first three stay, every later arrival retires the oldest, and the survivors shrink one depth step each.</p>
    </>
  );
}
