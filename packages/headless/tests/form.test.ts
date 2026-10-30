import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { flush, signal } from "@hellajs/core";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { mount } from "@hellajs/dom";
import {
  createForm,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@hellajs/headless";

beforeEach(() => {
  resetTestState();
});

/** Email validator shared by the controller suites: non-empty with an @ is clean. */
const emailValidator = (v: string): string | null => (v.includes("@") ? null : "Invalid email");

/** Mounts a rendered node into a fresh body container and returns its root element. */
function mountPart(node: JSX.Element): HTMLElement {
  const container = document.createElement("div");
  document.body.append(container);
  mount(node, container);
  return container.firstElementChild as HTMLElement;
}

describe("form", () => {
  test("createForm seeds one writable signal per field with clean state", () => {
    const form = createForm({ email: "", name: "Ada" });
    expect(form.values.email()).toBe("");
    expect(form.values.name()).toBe("Ada");
    expect(form.errors()).toEqual({});
    expect(form.touched()).toEqual({});
    expect(form.dirty()).toBe(false);
  });

  test("createForm writes the field value through setField", () => {
    const form = createForm({ email: "" });
    form.setField("email", "ada@hellajs.dev");
    expect(form.values.email()).toBe("ada@hellajs.dev");
  });

  test("createForm tracks dirty against the initial values and back", () => {
    const form = createForm({ email: "" });
    form.setField("email", "typed");
    expect(form.dirty()).toBe(true);
    form.setField("email", "");
    expect(form.dirty()).toBe(false);
  });

  test("blur marks the field touched and validates it", () => {
    const form = createForm({ email: "" }, { validators: { email: emailValidator } });
    form.blur("email");
    expect(form.touched().email).toBe(true);
    expect(form.errors().email).toBe("Invalid email");
    form.setField("email", "ada@hellajs.dev");
    form.blur("email");
    expect(form.errors().email).toBeUndefined();
  });

  test("setField revalidates only after the field is touched", () => {
    const form = createForm({ email: "" }, { validators: { email: emailValidator } });
    form.setField("email", "not-an-email");
    expect(form.errors().email).toBeUndefined();
    form.blur("email");
    form.setField("email", "still-not-an-email");
    expect(form.errors().email).toBe("Invalid email");
    form.setField("email", "ada@hellajs.dev");
    expect(form.errors().email).toBeUndefined();
  });

  test("a touched field without a validator revalidates to a clean result", () => {
    const form = createForm({ email: "", name: "" }, { validators: { email: emailValidator } });
    form.blur("name");
    form.setField("name", "Ada");
    expect(form.touched().name).toBe(true);
    expect(form.errors()).toEqual({});
  });

  test("validators receive the field value and the full values snapshot", () => {
    const validator = vi.fn((v: string, values: { email: string; name: string }) =>
      values.name.length > 0 ? null : "Name required first",
    );
    const form = createForm(
      { email: "ada@hellajs.dev", name: "" },
      { validators: { email: validator } },
    );
    form.blur("email");
    expect(validator).toHaveBeenCalledWith("ada@hellajs.dev", {
      email: "ada@hellajs.dev",
      name: "",
    });
    expect(form.errors().email).toBe("Name required first");
  });

  test("validate aggregates over every field", () => {
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
    form.setField("email", "ada@hellajs.dev");
    expect(form.validate()).toBe(false);
    form.setField("name", "Ada");
    expect(form.validate()).toBe(true);
    expect(form.errors()).toEqual({});
  });

  test("reset restores values and clears errors, touched, and dirty", () => {
    const form = createForm(
      { email: "seed@hellajs.dev" },
      { validators: { email: emailValidator } },
    );
    form.setField("email", "edited");
    form.blur("email");
    expect(form.dirty()).toBe(true);
    form.reset();
    expect(form.values.email()).toBe("seed@hellajs.dev");
    expect(form.errors()).toEqual({});
    expect(form.touched()).toEqual({});
    expect(form.dirty()).toBe(false);
  });

  test("handleSubmit marks all fields touched and skips onValid when invalid", () => {
    const form = createForm({ email: "", name: "" }, { validators: { email: emailValidator } });
    const onValid = vi.fn(() => {});
    form.handleSubmit(onValid)();
    expect(onValid).not.toHaveBeenCalled();
    expect(form.touched().email).toBe(true);
    expect(form.touched().name).toBe(true);
    expect(form.errors().email).toBe("Invalid email");
  });

  test("handleSubmit calls onValid with the values when clean", () => {
    const form = createForm({ email: "", name: "Ada" }, { validators: { email: emailValidator } });
    const onValid = vi.fn(() => {});
    form.handleSubmit(onValid)();
    expect(onValid).not.toHaveBeenCalled();
    form.setField("email", "ada@hellajs.dev");
    form.handleSubmit(onValid)();
    expect(onValid).toHaveBeenCalledTimes(1);
    expect(onValid).toHaveBeenCalledWith({ email: "ada@hellajs.dev", name: "Ada" });
  });

  test("handleSubmit preventDefaults the submitted event", () => {
    const form = createForm({ email: "ada@hellajs.dev" });
    const event = { preventDefault: vi.fn(() => {}) } as unknown as Event;
    form.handleSubmit(() => {})(event);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
  });

  test("instances stay independent", () => {
    const first = createForm({ email: "" }, { validators: { email: emailValidator } });
    const second = createForm({ email: "" });
    first.setField("email", "typed");
    first.blur("email");
    expect(second.values.email()).toBe("");
    expect(second.dirty()).toBe(false);
    expect(second.touched()).toEqual({});
  });

  test("the item renders data-error from the error flag", () => {
    const clean = mountPart(FormItem({ children: "x" }));
    expect(clean.getAttribute("data-error")).toBe("false");
    const invalid = mountPart(FormItem({ error: true, children: "x" }));
    expect(invalid.getAttribute("data-error")).toBe("true");
  });

  test("the item reads its error accessor reactively", async () => {
    const invalid = signal(false);
    const root = mountPart(FormItem({ error: () => invalid(), children: "x" }));
    await delay();
    expect(root.getAttribute("data-error")).toBe("false");
    invalid(true);
    flush();
    expect(root.getAttribute("data-error")).toBe("true");
  });

  test("the label pairs its for target with the required hook", () => {
    const label = mountPart(FormLabel({ for: "email", required: true, children: "Email" }));
    expect(label.getAttribute("for")).toBe("email");
    expect(label.getAttribute("data-required")).toBe("true");
    expect(label.hasAttribute("aria-invalid")).toBe(false);
  });

  test("the label marks aria-invalid on the error flag", () => {
    const label = mountPart(FormLabel({ error: true, children: "Email" }));
    expect(label.getAttribute("data-error")).toBe("true");
    expect(label.getAttribute("aria-invalid")).toBe("true");
  });

  test("the label and control error flags accept accessors", async () => {
    const invalid = signal(false);
    const label = mountPart(FormLabel({ error: () => invalid(), children: "Email" }));
    const control = mountPart(FormControl({ invalid: () => invalid(), children: "x" }));
    await delay();
    expect(label.getAttribute("data-error")).toBe("false");
    expect(label.hasAttribute("aria-invalid")).toBe(false);
    expect(control.hasAttribute("aria-invalid")).toBe(false);
    invalid(true);
    flush();
    expect(label.getAttribute("data-error")).toBe("true");
    expect(label.getAttribute("aria-invalid")).toBe("true");
    expect(control.getAttribute("aria-invalid")).toBe("true");
  });

  test("the control wires aria-invalid and describedby", () => {
    const bare = mountPart(FormControl({ children: "x" }));
    expect(bare.getAttribute("data-slot")).toBe("form-control");
    expect(bare.hasAttribute("aria-invalid")).toBe(false);
    expect(bare.hasAttribute("aria-describedby")).toBe(false);
    const wired = mountPart(
      FormControl({ invalid: true, describedBy: "email-desc", children: "x" }),
    );
    expect(wired.getAttribute("aria-invalid")).toBe("true");
    expect(wired.getAttribute("aria-describedby")).toBe("email-desc");
  });

  test("the description renders its describedby id", () => {
    const note = mountPart(
      FormDescription({ id: "email-desc", children: "We only use this for login." }),
    );
    expect(note.getAttribute("id")).toBe("email-desc");
    expect(note.tagName).toBe("P");
  });

  test("the message renders the first error with the alert role", () => {
    const message = mountPart(FormMessage({ errors: ["Invalid email", "Also short"] }));
    expect(message.getAttribute("role")).toBe("alert");
    expect(message.textContent).toBe("Invalid email");
    expect(message.hasAttribute("hidden")).toBe(false);
  });

  test("the message hides while clean and renders fallback children", async () => {
    const empty = mountPart(FormMessage({}));
    await delay();
    expect(empty.hasAttribute("hidden")).toBe(true);
    const fallback = mountPart(FormMessage({ children: "All good" }));
    expect(fallback.hasAttribute("hidden")).toBe(false);
    expect(fallback.textContent).toBe("All good");
  });

  test("the message updates from the controller's error state", async () => {
    const form = createForm({ email: "" }, { validators: { email: emailValidator } });
    const root = mountPart(
      FormItem({
        error: () => form.errors().email != null,
        children: [
          FormMessage({ errors: () => (form.errors().email ? [form.errors().email!] : []) }),
        ],
      }),
    );
    await delay();
    const message = root.querySelector("[data-slot='form-message']")!;
    expect(message.hasAttribute("hidden")).toBe(true);
    form.handleSubmit(() => {})();
    flush();
    expect(root.getAttribute("data-error")).toBe("true");
    expect(message.textContent).toBe("Invalid email");
    expect(message.hasAttribute("hidden")).toBe(false);
  });

  test("the parts forward user attrs and merge the user class", () => {
    const roots = [
      FormItem({ title: "Hella", class: "mine", children: "x" }),
      FormLabel({ title: "Hella", class: "mine", children: "x" }),
      FormControl({ title: "Hella", class: "mine", children: "x" }),
      FormDescription({ title: "Hella", class: "mine", children: "x" }),
      FormMessage({ title: "Hella", class: "mine", children: "x" }),
    ];
    for (const node of roots) {
      const root = mountPart(node);
      expect(root.getAttribute("title")).toBe("Hella");
      expect(root.getAttribute("class")).toBe("mine");
    }
  });
});
