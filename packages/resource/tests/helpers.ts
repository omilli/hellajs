import { expect } from "bun:test";

export const mockUser = { id: 1, name: "John Doe" };
export const mockPosts = [{ id: 1, title: "Post 1" }, { id: 2, title: "Post 2" }];

// Rejection-assert helpers shared by the mutations/mutation-abort/prefetch tests:
// settle the promise and pin the rejection shape in one step. Must be awaited.
export async function expectAbortError(promise: Promise<unknown>): Promise<void> {
  try {
    await promise;
    expect(true).toBe(false);
  } catch (err) {
    expect(err).toBeInstanceOf(DOMException);
    expect((err as DOMException).name).toBe("AbortError");
  }
}

export async function expectErrorMessage(promise: Promise<unknown>, message: string): Promise<void> {
  try {
    await promise;
    expect(true).toBe(false);
  } catch (err) {
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toBe(message);
  }
}
