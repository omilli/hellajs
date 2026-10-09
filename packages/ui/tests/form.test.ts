import { describe, test, expect, beforeEach, mock } from "bun:test";
import { delay, resetTestState, setupContainer } from "@utils/test-helpers.js";
// The bare "@hellajs/dom" index, not the bundle: the compiled registry components import the bare
// specifier, so the harness mount and the components' reactivity share one dom instance.
import { mount } from "@hellajs/dom";
import {
  assertAttrForwarded,
  assertHandlerForwarded,
  assertStructuralParity,
  classTokens,
  formApiVariants,
  formPartVariants,
  renderVariant,
  FORM_PARTS,
} from "./helpers/variants";

beforeEach(() => {
  resetTestState();
});

/** Email validator shared by the controller suites: non-empty with an @ is clean. */
const emailValidator = (v: string): string | null => (v.includes("@") ? null : "Invalid email");

describe("form", () => {
  test.each(formApiVariants)("$format/$style createForm seeds the initial values", ({ createForm }) => {
    const form = createForm({ email: "", name: "Ada" });
    expect(form.values.email()).toBe("");
    expect(form.values.name()).toBe("Ada");
    expect(form.errors()).toEqual({});
    expect(form.touched()).toEqual({});
    expect(form.dirty()).toBe(false);
  });

  test.each(formApiVariants)("$format/$style createForm updates the field value on setField", ({ createForm }) => {
    const form = createForm({ email: "" });
    form.setField("email", "ada@lovelace.dev");
    expect(form.values.email()).toBe("ada@lovelace.dev");
  });

  test.each(formApiVariants)("$format/$style createForm validates a field on blur", ({ createForm }) => {
    const form = createForm({ email: "" }, { validators: { email: emailValidator } });
    form.blur("email");
    expect(form.touched().email).toBe(true);
    expect(form.errors().email).toBe("Invalid email");
    form.setField("email", "ada@lovelace.dev");
    form.blur("email");
    expect(form.errors().email).toBeUndefined();
  });

  test.each(formApiVariants)("$format/$style createForm revalidates on setField only after the field is touched", ({ createForm }) => {
    const form = createForm({ email: "" }, { validators: { email: emailValidator } });
    form.setField("email", "not-an-email");
    expect(form.errors().email).toBeUndefined();
    form.blur("email");
    form.setField("email", "still-not-an-email");
    expect(form.errors().email).toBe("Invalid email");
    form.setField("email", "ada@lovelace.dev");
    expect(form.errors().email).toBeUndefined();
  });

  test.each(formApiVariants)("$format/$style createForm aggregates validate() over every field", ({ createForm }) => {
    const form = createForm(
      { email: "", name: "" },
      {
        validators: {
          email: emailValidator,
          name: (v) => (v.length > 0 ? null : "Required"),
        },
      },
    );
    expect(form.validate()).toBe(false);
    expect(form.errors().email).toBe("Invalid email");
    expect(form.errors().name).toBe("Required");
    form.setField("email", "ada@lovelace.dev");
    expect(form.validate()).toBe(false);
    form.setField("name", "Ada");
    expect(form.validate()).toBe(true);
    expect(form.errors()).toEqual({});
  });

  test.each(formApiVariants)("$format/$style createForm clears values, errors, and touched on reset", ({ createForm }) => {
    const form = createForm({ email: "seed@hellajs.dev" }, { validators: { email: emailValidator } });
    form.setField("email", "edited");
    form.blur("email");
    expect(form.dirty()).toBe(true);
    form.reset();
    expect(form.values.email()).toBe("seed@hellajs.dev");
    expect(form.errors()).toEqual({});
    expect(form.touched()).toEqual({});
    expect(form.dirty()).toBe(false);
  });

  test.each(formApiVariants)("$format/$style createForm tracks dirty against the initial values", ({ createForm }) => {
    const form = createForm({ email: "" });
    form.setField("email", "typed");
    expect(form.dirty()).toBe(true);
    form.setField("email", "");
    expect(form.dirty()).toBe(false);
  });

  test.each(formApiVariants)("$format/$style createForm marks all touched and skips onValid when invalid", ({ createForm }) => {
    const form = createForm(
      { email: "", name: "" },
      { validators: { email: emailValidator } },
    );
    const onValid = mock(() => {});
    form.handleSubmit(onValid)();
    expect(onValid).not.toHaveBeenCalled();
    expect(form.touched().email).toBe(true);
    expect(form.touched().name).toBe(true);
    expect(form.errors().email).toBe("Invalid email");
  });

  test.each(formApiVariants)("$format/$style createForm calls onValid with the values when clean", ({ createForm }) => {
    const form = createForm(
      { email: "", name: "Ada" },
      { validators: { email: emailValidator } },
    );
    const onValid = mock(() => {});
    form.handleSubmit(onValid)();
    expect(onValid).not.toHaveBeenCalled();
    form.setField("email", "ada@lovelace.dev");
    form.handleSubmit(onValid)();
    expect(onValid).toHaveBeenCalledTimes(1);
    expect(onValid).toHaveBeenCalledWith({ email: "ada@lovelace.dev", name: "Ada" });
  });

  test.each(formApiVariants)("$format/$style createForm preventDefaults the submitted event", ({ createForm }) => {
    const form = createForm({ email: "ada@lovelace.dev" });
    const event = { preventDefault: mock(() => {}) } as unknown as Event;
    form.handleSubmit(() => {})(event);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
  });

  test.each(formPartVariants.filter((variant) => variant.part === "Item"))("$part $format/$style renders data-error and the item tokens", (variant) => {
    const clean = renderVariant(variant, { children: ["x"] });
    expect(clean.getAttribute("data-error")).toBe("false");
    const invalid = renderVariant(variant, { error: true, children: ["x"] });
    expect(invalid.getAttribute("data-error")).toBe("true");
    if (variant.style === "css") {
      expect(classTokens(invalid)[0]!.startsWith("form-item")).toBe(true);
    } else {
      expect(classTokens(invalid)).toContain("grid");
      expect(classTokens(invalid)).toContain("gap-2");
    }
  });

  test.each(formPartVariants.filter((variant) => variant.part === "Item"))("$part $format/$style reads the error accessor", (variant) => {
    const root = renderVariant(variant, { error: () => true, children: ["x"] });
    expect(root.getAttribute("data-error")).toBe("true");
  });

  test.each(formPartVariants.filter((variant) => variant.part === "Label"))("$part $format/$style carries the label error variant", (variant) => {
    const clean = renderVariant(variant, { children: ["Email"] });
    expect(clean.getAttribute("data-error")).toBe("false");
    expect(clean.hasAttribute("aria-invalid")).toBe(false);
    const invalid = renderVariant(variant, { error: true, children: ["Email"] });
    expect(invalid.getAttribute("data-error")).toBe("true");
    expect(invalid.getAttribute("aria-invalid")).toBe("true");
    expect(invalid.tagName).toBe("LABEL");
    if (variant.style === "css") {
      expect(classTokens(invalid)[0]!.startsWith("form-label")).toBe(true);
    } else {
      expect(classTokens(invalid)).toContain("data-[error=true]:text-destructive");
    }
  });

  test.each(formPartVariants.filter((variant) => variant.part === "Label"))("$part $format/$style renders the required hook and the for target", (variant) => {
    const root = renderVariant(variant, { required: true, for: "email", children: ["Email"] });
    expect(root.getAttribute("data-required")).toBe("true");
    expect(root.getAttribute("for")).toBe("email");
  });

  test.each(formPartVariants.filter((variant) => variant.part === "Control"))("$part $format/$style wires aria-invalid and aria-describedby", (variant) => {
    const bare = renderVariant(variant, { children: ["x"] });
    expect(bare.getAttribute("data-slot")).toBe("form-control");
    expect(bare.hasAttribute("aria-invalid")).toBe(false);
    expect(bare.hasAttribute("aria-describedby")).toBe(false);
    const wired = renderVariant(variant, { invalid: true, describedBy: "email-desc", children: ["x"] });
    expect(wired.getAttribute("aria-invalid")).toBe("true");
    expect(wired.getAttribute("aria-describedby")).toBe("email-desc");
  });

  test.each(formPartVariants.filter((variant) => variant.part === "Description"))("$part $format/$style renders the describedby id", (variant) => {
    const root = renderVariant(variant, { id: "email-desc", children: ["We only use this for login."] });
    expect(root.getAttribute("id")).toBe("email-desc");
    expect(root.tagName).toBe("P");
    if (variant.style === "css") {
      expect(classTokens(root)[0]!.startsWith("form-description")).toBe(true);
    } else {
      expect(classTokens(root)).toContain("text-muted-foreground");
    }
  });

  test.each(formPartVariants.filter((variant) => variant.part === "Message"))("$part $format/$style renders the first error with the alert role", (variant) => {
    const root = renderVariant(variant, { errors: ["Invalid email", "Also short"] });
    expect(root.getAttribute("role")).toBe("alert");
    expect(root.textContent).toBe("Invalid email");
    expect(root.hasAttribute("hidden")).toBe(false);
    if (variant.style === "css") {
      expect(classTokens(root)[0]!.startsWith("form-message")).toBe(true);
    } else {
      expect(classTokens(root)).toContain("text-destructive");
    }
  });

  test.each(formPartVariants.filter((variant) => variant.part === "Message"))("$part $format/$style hides when clean and renders fallback children", (variant) => {
    const empty = renderVariant(variant, {});
    expect(empty.hasAttribute("hidden")).toBe(true);
    const fallback = renderVariant(variant, { children: ["All good"] });
    expect(fallback.hasAttribute("hidden")).toBe(false);
    expect(fallback.textContent).toBe("All good");
  });

  test.each(formPartVariants.filter((variant) => variant.part === "Message"))("$part $format/$style reads the errors accessor", (variant) => {
    const root = renderVariant(variant, { errors: () => ["From the accessor"] });
    expect(root.textContent).toBe("From the accessor");
  });

  test("renders the validation message and error flags as submit marks the field", async () => {
    const { createForm } = formApiVariants[0]!;
    const form = createForm({ email: "" }, { validators: { email: emailValidator } });
    const part = (name: string) =>
      formPartVariants.find((candidate) => candidate.part === name && candidate.style === "css" && candidate.format === "jsx")!;
    const message = part("Message").render({
      errors: () => (form.errors().email ? [form.errors().email!] : []),
    });
    const item = part("Item").render({
      error: () => form.errors().email != null,
      children: [message],
    });
    const container = setupContainer();
    mount(item, container);
    form.handleSubmit(() => {})();
    for (let i = 0; i < 50; i++) {
      const message = container.querySelector("[data-slot='form-message']");
      const item = container.querySelector("[data-slot='form-item']");
      if (message?.textContent === "Invalid email" && item?.getAttribute("data-error") === "true") return;
      await delay();
    }
    throw new Error("form message never rendered the validation error");
  });

  test("forwards user attrs onto the parts across all four variants", () => {
    for (const part of FORM_PARTS) {
      assertAttrForwarded(formPartVariants.filter((candidate) => candidate.part === part), { title: "Hella" }, "title", "Hella");
    }
  });

  test("fires a user on:click handler on the label across all four variants", () => {
    const onClick = mock(() => {});
    assertHandlerForwarded(formPartVariants.filter((candidate) => candidate.part === "Label"), { "on:click": onClick }, "on:click", "click", onClick);
  });

  test("merges the user class last on the parts across all four variants", () => {
    for (const part of FORM_PARTS) {
      for (const variant of formPartVariants.filter((candidate) => candidate.part === part)) {
        const root = renderVariant(variant, { class: "my-form-part", children: ["x"] });
        expect(classTokens(root).at(-1)).toBe("my-form-part");
      }
    }
  });

  test("all four flavors agree on tag and attributes", () => {
    for (const part of FORM_PARTS) {
      assertStructuralParity(formPartVariants.filter((candidate) => candidate.part === part), { children: ["x"] });
    }
    assertStructuralParity(formPartVariants.filter((candidate) => candidate.part === "Item"), { error: true, children: ["x"] });
    assertStructuralParity(formPartVariants.filter((candidate) => candidate.part === "Label"), { required: true, error: true, for: "email", children: ["Email"] });
    assertStructuralParity(formPartVariants.filter((candidate) => candidate.part === "Control"), { invalid: true, describedBy: "email-desc", children: ["x"] });
    assertStructuralParity(formPartVariants.filter((candidate) => candidate.part === "Description"), { id: "email-desc", children: ["Note"] });
    assertStructuralParity(formPartVariants.filter((candidate) => candidate.part === "Message"), { errors: ["Invalid email"] });
  });
});
