import { batch, signal, effect } from '../../packages/core';
import { describe, test, expect } from "bun:test";
import { tick } from "../utils/tick.js";

describe("batch", () => {
  test("optimize UI updates by batching multiple signal changes", async () => {
    const userName = signal<string>("Alice");
    const userAge = signal<number>(25);
    let uiRenderCount: number = 0;

    // Simulate a UI component that depends on multiple user properties
    effect(() => {
      userName();
      userAge();
      uiRenderCount++;
    });

    // Update multiple user properties at once
    batch(() => {
      userName("Bob");
      userAge(30);
    });

    await tick();
    expect(uiRenderCount).toBe(2); // initial render + single batched update
  });

  test("handle errors gracefully without breaking batch system", () => {
    expect(() => {
      batch(() => {
        throw new Error("Database connection failed");
      });
    }).toThrow("Database connection failed");

    // System should recover and allow subsequent batches
    expect(() => batch(() => {
      const testSignal = signal("recovery test");
      testSignal("success");
    })).not.toThrow();
  });

  test("batches complex form updates efficiently", async () => {
    const formData = {
      email: signal(""),
      name: signal(""),
      phone: signal(""),
      address: signal("")
    };

    let formValidationRuns = 0;

    // Simulate form validation that depends on all fields
    effect(() => {
      formData.email();
      formData.name();
      formData.phone();
      formData.address();
      formValidationRuns++;
    });

    // Update entire form at once (like when loading user data)
    batch(() => {
      formData.email("user@example.com");
      formData.name("John Doe");
      formData.phone("+1-555-0123");
      formData.address("123 Main St");
    });

    await tick();
    expect(formValidationRuns).toBe(2); // initial + single batched validation
  });
});
