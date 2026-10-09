import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import { tokens } from "../styles/tokens";
import Button from "@registry/button/css/button.js";
import Input from "@registry/input/css/input.js";
import { createForm, FormControl, FormDescription, FormItem, FormLabel, FormMessage } from "@registry/form/css/form.js";

const stack = style({
  alignItems: "flex-start",
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
  maxWidth: "26rem",
  width: "100%",
});

const row = style({
  display: "flex",
  gap: "0.5rem",
});



const resetButton = style({
  border: `1px solid ${tokens.border}`,
  borderRadius: `calc(${tokens.radius} - 2px)`,
  cursor: "pointer",
  fontSize: "0.75rem",
  padding: "0.25rem 0.5rem",
  width: "fit-content",
}, { label: "demo-reset-button" });

export function FormDemo() {
  const saved = signal("");
  const form = createForm(
    { email: "", name: "" },
    {
      validators: {
        email: (v) => (v.includes("@") ? null : "Enter a valid email"),
        name: (v) => (v.length > 0 ? null : "Required"),
      },
    },
  );

  return (
    <form class={stack} on:submit={form.handleSubmit((values) => saved(values.email))}>
      <FormItem error={() => form.errors().email != null}>
        <FormLabel for="demo-email" error={() => form.errors().email != null}>Email</FormLabel>
        <FormControl describedBy="demo-email-msg" invalid={() => form.errors().email != null}>
          <Input id="demo-email" type="email" placeholder="ada@lovelace.dev" value={() => form.values.email()} on:input={(e: Event) => form.setField("email", (e.target as HTMLInputElement).value)} />
        </FormControl>
        <FormDescription id="demo-email-msg">We only use this for sign-in.</FormDescription>
        <FormMessage errors={() => (form.errors().email ? [form.errors().email!] : [])} />
      </FormItem>
      <FormItem error={() => form.errors().name != null}>
        <FormLabel for="demo-name" error={() => form.errors().name != null}>Display name</FormLabel>
        <FormControl invalid={() => form.errors().name != null}>
          <Input id="demo-name" placeholder="Ada Lovelace" value={() => form.values.name()} on:input={(e: Event) => form.setField("name", (e.target as HTMLInputElement).value)} />
        </FormControl>
        <FormMessage errors={() => (form.errors().name ? [form.errors().name!] : [])} />
      </FormItem>
      <Button>Save</Button>
      <p class="demo-muted">{() => (saved() ? `Saved ${saved()}` : "Submit with an empty field to see the validation messages.")}</p>
    </form>
  );
}

export function FormBlurDemo() {
  const blurForm = createForm(
    { email: "" },
    { validators: { email: (v) => (v.includes("@") ? null : "Invalid email") } },
  );

  return (
    <div class={stack} on:focusout={() => blurForm.blur("email")}>
      <FormItem error={() => blurForm.errors().email != null}>
        <FormLabel for="demo-blur-email">Email</FormLabel>
        <FormControl invalid={() => blurForm.errors().email != null}>
          <Input id="demo-blur-email" placeholder="Leave the field to validate" value={() => blurForm.values.email()} on:input={(e: Event) => blurForm.setField("email", (e.target as HTMLInputElement).value)} />
        </FormControl>
        <FormMessage errors={() => (blurForm.errors().email ? [blurForm.errors().email!] : [])} />
      </FormItem>
      <p class="demo-muted">{() => (blurForm.errors().email ? `Marked touched, validated: ${blurForm.errors().email}` : "Focus the field, type an invalid email, then leave it.")}</p>
    </div>
  );
}

export function FormResetDemo() {
  const resetForm = createForm(
    { email: "ada@lovelace.dev" },
    { validators: { email: (v) => (v.includes("@") ? null : "Invalid email") } },
  );

  return (
    <form class={stack} on:submit={resetForm.handleSubmit(() => {})}>
      <FormItem error={() => resetForm.errors().email != null}>
        <FormLabel for="demo-reset-email">Email</FormLabel>
        <FormControl invalid={() => resetForm.errors().email != null}>
          <Input id="demo-reset-email" value={() => resetForm.values.email()} on:input={(e: Event) => resetForm.setField("email", (e.target as HTMLInputElement).value)} />
        </FormControl>
        <FormMessage errors={() => (resetForm.errors().email ? [resetForm.errors().email!] : [])} />
      </FormItem>
      <div class={row}>
        <Button>Save</Button>
        <button type="button" class={resetButton} on:click={() => resetForm.reset()}>Reset</button>
      </div>
      <p class="demo-muted">{() => `Value now: ${resetForm.values.email()}`}</p>
    </form>
  );
}
