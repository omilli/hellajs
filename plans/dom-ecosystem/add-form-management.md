## [ ] Add built-in form management

### Depends On
None

### Objective
HellaJS has no form state, validation, or submission lifecycle. Every other framework provides some level of form management:
- React: controlled components, Formik, React Hook Form
- Vue: v-model, VeeValidate
- Svelte: bind:value, Svelte Forms
- Solid: createForm, solid-forms

Users must build everything from scratch with raw signals and manual DOM event handling.

### Tasks

#### [ ] Phase 1: Reactive form bindings

#### Solution
Add first-class reactive form element bindings to `@hellajs/dom`. The current `$ref().bind()` handles input ↔ signal binding for form elements, but it's manual and low-level.

New API:

```ts
// Automatic two-way binding for form elements
import { formValue, formValues, formReset } from '@hellajs/dom';

const name = signal('');
const email = signal('');

// In template:
html`
  <input bind:value=${name} />
  <input bind:value=${email} />
`
```

The `bind:value` prefix already exists in the attribute categorization (`template.ts:383-397`). Enhance the `render.ts` handling of `bind:value` to detect form elements and set up two-way binding automatically:

- `<input>`: listens for `input` event and updates signal
- `<textarea>`: same as input
- `<select>`: listens for `change` event
- `<input type="checkbox">`: maps to boolean
- `<input type="radio">`: maps to value-based selection

This already partially exists in `$ref().bind()` — move it into core render logic so it works declaratively.

##### Tests
- Add test: input with bind:value → typing updates signal
- Add test: signal changes → input value updates
- Add test: checkbox bind:value → boolean mapping
- Add test: select bind:value → option tracking
- Add test: radio bind:value → group selection
- Add test: textarea bind:value

##### Documentation
- AGENTS.md: add form binding usage patterns
- CHANGELOG: minor entry

##### Validation
- `bun check dom` passes
- Two-way form bindings work declaratively without $ref

#### [ ] Phase 2: Form validation

#### Solution
Add built-in validation API that integrates with the reactive form bindings:

```ts
import { form, required, minLength, email } from '@hellajs/dom';

const loginForm = form({
  email: [required(), email()],
  password: [required(), minLength(8)]
});

// In template:
html`
  <form on:submit=${loginForm.handleSubmit}>
    <input bind:value=${loginForm.fields.email.value} />
    <span bind:text=${loginForm.fields.email.error} />
    <input type="password" bind:value=${loginForm.fields.password.value} />
    <span bind:text=${loginForm.fields.password.error} />
    <button disabled=${loginForm.invalid}>Submit</button>
  </form>
`
```

Each field returns:
- `value`: writable signal
- `error`: computed signal (first failing validator message)
- `touched`: writable signal (set to true on blur)
- `valid`: computed signal (no validators failing)

The `form()` function returns:
- `fields`: record of field objects
- `valid`: computed (all fields valid)
- `dirty`: computed (any field modified)
- `handleSubmit`: onSubmit handler (prevents default, validates all fields, calls callback)
- `reset()`: resets all fields and touched state

##### Tests
- Add test: form validation on submit
- Add test: field-level validation (required, email, minLength)
- Add test: form valid/dirty computed signals
- Add test: form reset
- Add test: custom validator functions
- Add test: async validators

##### Documentation
- AGENTS.md: add form validation usage patterns
- CHANGELOG: minor entry

##### Validation
- Form validation works declaratively
- Signals reflect validation state reactively
- No breaking changes to existing code

#### [ ] Phase 3: Submission lifecycle and strategies

#### Solution
Add form submission lifecycle management:

- Submit states: `idle` → `submitting` → `success` | `error`
- Progressive enhancement: forms work without JS (via `@hellajs/router` or action URLs)
- Debounced auto-save for non-submit forms
- Dirty field tracking for unsaved-warning navigation guards

The submission lifecycle integrates with `@hellajs/resource` for async API calls.

##### Tests
- Add test: form submitting state
- Add test: form success/error states
- Add test: progressive enhancement fallback
- Add test: dirty-tracking navigation guard

##### Documentation
- Full form management guide
- Migration from manual form handling

##### Validation
- Form submission lifecycle works correctly
- Progressive enhancement degrades gracefully
- Dirty tracking prevents accidental navigation

### Documentation
Full form management guide covering bindings, validation, submission, and progressive enhancement.

### Validation
Reactive form bindings, validation, and submission lifecycle work declaratively. No breaking changes.
