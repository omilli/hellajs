
import Checkbox from "@registry/checkbox/css/checkbox.js";
import Input from "@registry/input/css/input.js";
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSeparator, FieldSet, FieldTitle } from "@registry/field/css/field.js";
import { stack } from "./demo-kit";

export default function FieldDemo() {
  return (
    <div class={stack}>
      <FieldSet>
        <FieldLegend>Profile</FieldLegend>
        <FieldGroup>
          <Field>
            <FieldLabel for="demo-name">
              <FieldTitle>Display name</FieldTitle>
              <FieldContent>
                <FieldDescription>Shown on your public profile.</FieldDescription>
              </FieldContent>
            </FieldLabel>
            <Input id="demo-name" placeholder="Ada Lovelace" />
            <FieldError errors={[{ message: "A display name is required." }]} />
          </Field>
          <FieldSeparator />
          <Field>
            <FieldLabel for="demo-email">
              <FieldTitle>Email</FieldTitle>
              <FieldContent>
                <FieldDescription>We only use this for sign-in.</FieldDescription>
              </FieldContent>
            </FieldLabel>
            <Input id="demo-email" type="email" placeholder="ada@lovelace.dev" />
          </Field>
        </FieldGroup>
      </FieldSet>
    </div>
  );
}

export function FieldStateDemo() {
  return (
    <div class={stack}>
      <Field disabled>
        <FieldLabel for="demo-terms">
          <FieldTitle>Accept terms</FieldTitle>
        </FieldLabel>
        <Checkbox id="demo-terms" disabled />
      </Field>
      <Field invalid>
        <FieldLabel for="demo-email-state">
          <FieldTitle>Work email</FieldTitle>
        </FieldLabel>
        <Input id="demo-email-state" ariaInvalid={true} placeholder="ada@lovelace.dev" />
        <FieldError errors={[{ message: "Enter a valid email." }]} />
      </Field>
    </div>
  );
}

export function FieldResponsiveDemo() {
  return (
    <div class={stack}>
      <FieldGroup>
        <Field orientation="responsive">
          <Checkbox id="demo-updates" />
          <FieldLabel for="demo-updates">
            <FieldTitle>Product updates</FieldTitle>
            <FieldContent>
              <FieldDescription>News about features and releases, once a month.</FieldDescription>
            </FieldContent>
          </FieldLabel>
        </Field>
      </FieldGroup>
    </div>
  );
}
