import type { ContextStore } from "../types";
import { getGlobalThis } from "./utils";

// Stores all contexts created by the `context` function.
export const CONTEXT_STORE: ContextStore = new Map();

const globalContext = getGlobalThis();
const key = "hellaContextStore";

if (!globalContext[key]) {
	globalContext[key] = CONTEXT_STORE;
}
