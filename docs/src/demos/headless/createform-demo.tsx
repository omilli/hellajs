import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import {
  createForm,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@hellajs/headless";

export function CreateFormDemo() {
  const submitted = signal<{ email: string } | undefined>(undefined);

  const form = createForm(
    { email: "" },
    { validators: { email: (v) => (v.includes("@") ? null : "Invalid email") } },
  );
  const emailInvalid = () => form.errors().email != null;
  const emailErrors = () => (form.errors().email ? [form.errors().email!] : []);

  const createFormDemo = style({
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    width: "300px",
    '& [data-slot="form-item"]': {
      display: "flex",
      flexDirection: "column",
      gap: "0.375rem",
    },
    '& [data-slot="form-description"]': {
      fontSize: "0.8125rem",
      margin: 0,
      opacity: 0.7,
    },
    '& [data-slot="form-message"]': {
      color: "#f87171",
      fontSize: "0.8125rem",
      margin: 0,
    },
    "& .report": {
      fontSize: "0.8125rem",
      margin: 0,
      opacity: 0.7,
    },
  });

  return (
    <form
      class={createFormDemo}
      on:submit={form.handleSubmit((values) => submitted(values))}
    >
      <FormItem error={emailInvalid}>
        <FormLabel for="email" error={emailInvalid}>
          Email
        </FormLabel>
        <FormControl invalid={emailInvalid}>
          <input
            id="email"
            value={form.values.email}
            on:input={(e) => form.setField("email", (e.target as HTMLInputElement).value)}
            e:blur={() => form.blur("email")}
          />
        </FormControl>
        <FormDescription id="email-note">We only use this for sign-in.</FormDescription>
        <FormMessage errors={emailErrors} />
      </FormItem>
      <button type="submit">Subscribe</button>
      <p class="report">
        {() => (submitted() ? `Submitted: ${JSON.stringify(submitted())}` : "Fill the email, then submit.")}
      </p>
    </form>
  );
}
