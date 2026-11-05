---
title: Drive forms through the createForm controller signals
impact: HIGH
impactDescription: writing field state into local copies desyncs dirty and validation, and the Form parts read the controller through explicit props - no context provider exists to substitute
tags: createForm, FormItem, FormLabel, FormControl, FormDescription, FormMessage
---

## Drive forms through the createForm controller signals

`createForm(initial, options?)` builds one writable signal per field - the KEY SET IS FIXED at creation from `initial`'s keys; a later field is absent until you create a form with it - plus the `errors`/`touched`/`dirty` signals and the submit path. Validators run on blur, on `setField` once the field is touched, and on submit; `validate()` aggregates every field; `reset()` restores values and clears state; `handleSubmit(onValid)` returns the submit handler that preventDefaults the optional event, marks all touched, and calls `onValid(values)` only when clean. The five `Form` parts read the controller through EXPLICIT props (there is no context): thread `error`/`invalid` accessors from `form.errors()` and the message list into `FormMessage` - derive every flag from the controller's signals so validation, dirty tracking, and the message gate stay in one place. Field flags take plain booleans or reactive accessors; use accessors.

**Incorrect (what is wrong):**

```tsx
import { signal } from "@hellajs/core";
import { createForm, FormItem, FormLabel } from "@hellajs/headless";

const form = createForm({ email: "" });
const emailError = signal(""); // a parallel error signal: blur validation,
// submit-time revalidation, and reset never reach it.
const Field = () => (
  <FormItem error={() => emailError() !== ""}>
    <FormLabel for="email" error={() => emailError() !== ""}>Email</FormLabel>
  </FormItem>
);
```

**Correct (what is right):**

```tsx
import { createForm, FormControl, FormDescription, FormItem, FormLabel, FormMessage } from "@hellajs/headless";

const save = (values: { email: string }): void => undefined;
const form = createForm(
  { email: "" },
  {
    validators: {
      email: (value) => (value.includes("@") ? null : "Enter a valid email"),
    },
  },
);

const EmailField = () => (
  <FormItem error={() => form.errors().email != null}>
    <FormLabel for="email" error={() => form.errors().email != null}>
      Email
    </FormLabel>
    <FormControl invalid={() => form.errors().email != null} describedBy="email-hint">
      <input id="email" value={() => form.values.email()} />
      <FormDescription id="email-hint">We only use this to reply</FormDescription>
    </FormControl>
    <FormMessage errors={() => (form.errors().email ? [form.errors().email!] : [])} />
  </FormItem>
);

const submit = form.handleSubmit((values) => save(values));
```

Reference: `packages/headless/lib/form.tsx` and `packages/headless/tests/form.test.ts`
