import type { ReactiveContext } from "../types";

/**
 * Starts a batch operation
 *
 * @param reactive - The reactive context
 */
export function startBatch({ batchDepth }: ReactiveContext): void {
	// Increment the batch depth counter - we're nesting another batch
	batchDepth++;
}

/**
 * Ends a batch operation
 *
 * @param reactive - The reactive context
 * @returns True if this was the outermost batch (depth 0), false otherwise
 */
export function endBatch({ batchDepth }: ReactiveContext): boolean {
	// Check if we're actually in a batch
	if (batchDepth > 0) {
		// Decrement the batch depth counter
		batchDepth--;
		// If we've reached the outermost batch (depth 0), return true - this tells the caller to flush effects
		return batchDepth === 0;
	}
	// We weren't in a batch in the first place - return false
	return false;
}
