/**
 * Waits for all microtasks to complete, ensuring that batched reactive updates
 * have been processed. This is useful for testing reactive code that uses batching.
 *
 * @returns A promise that resolves after microtasks have completed
 */
export async function flushMicrotasks(): Promise<void> {
	// Use setTimeout(0) to ensure we're after any queueMicrotask callbacks
	return new Promise((resolve) => setTimeout(resolve, 0));
}
