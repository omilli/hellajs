/**
 * Function type for custom data fetching operations.
 * @template T - The expected return data type
 * @template K - The cache key type used for caching and deduplication
 */
export type Fetcher<T, K> = (key: K) => Promise<T>;

/**
 * Represents the current state of a resource operation.
 * - `idle`: Resource has not been fetched or is in initial state
 * - `loading`: Request is currently in progress
 * - `success`: Request completed successfully with data
 * - `error`: Request failed with an error
 */
export type ResourceStatus = "idle" | "loading" | "success" | "error";

/**
 * Categorizes different types of errors that can occur during resource operations.
 * Used for structured error handling and user feedback.
 */
export type ResourceErrorCategory =
  | "not_found"    // Resource not found (404)
  | "server"       // Server errors (5xx)
  | "client"       // Client errors (4xx)
  | "abort"        // Request was aborted
  | "unknown";     // Unclassified errors

/**
 * Structured error information providing details about failed resource operations.
 */
export interface ResourceError {
  /** Human-readable error message */
  message: string;
  /** Categorized error type for structured handling */
  category: ResourceErrorCategory;
  /** HTTP status code if available */
  statusCode?: number;
  /** Original error object for debugging */
  originalError?: unknown;
}

/**
 * Options for the resource fetch method.
 */
export interface FetchOptions {
  /** Bypass cache and force a fresh network request */
  force?: boolean;
}

/**
 * Configuration options for creating and controlling resource behavior.
 * @template T - The expected data type
 * @template K - The cache key type
 * @template TTransformed - The transformed data type returned by transform
 */
export interface ResourceOptions<T, K, TTransformed = T> {
  /** Function or static value to generate cache key for caching and deduplication */
  key?: (() => K) | K;
  /** Whether the resource is enabled, or a getter re-evaluated reactively for automatic fetches */
  enabled?: boolean | (() => boolean);
  /** Whether to automatically refetch when key dependencies change */
  refetchOnKeyChange?: boolean;
  /** Initial data value to use before any requests complete */
  initialData?: T;
  /** Cache time-to-live in milliseconds (0 = no caching) */
  cacheTime?: number;
  /** Duration in ms data is considered fresh before background revalidation (0 = always stale, Infinity = never stale) */
  staleTime?: number;
  /** Whether to auto-refetch when data becomes stale (default: true) */
  revalidateOnStale?: boolean;
  /** Request timeout in milliseconds before abort */
  timeout?: number;
  /** External abort signal to cancel requests */
  abortSignal?: AbortSignal;
  /** Whether to deduplicate identical concurrent requests */
  deduplicate?: boolean;
  /** Preserve object/array references for structurally unchanged subtrees on fetch success, preventing redundant reactive cascades (default: false) */
  structuralSharing?: boolean;
  /** Number of retry attempts on failure, or function to determine if retry should occur */
  retry?: number | boolean | ((failureCount: number, error: ResourceError) => boolean);
  /** Delay between retries in ms, or function returning delay based on attempt number */
  retryDelay?: number | ((attempt: number, error: ResourceError) => number);
  /** Transforms data before returning, cache stores original data */
  transform?: (data: T) => TTransformed;
  /** Callback fired when request succeeds */
  onSuccess?: (data: T) => void;
  /** Callback fired when request fails */
  onError?: (err: unknown) => void;
  /** Refetch interval in ms, false to disable, or function returning interval based on data */
  refetchInterval?: number | false | ((data: TTransformed | undefined) => number | false);
  /** Continue polling when tab is hidden (default: false) */
  refetchIntervalInBackground?: boolean;
  /** Refetch when window regains focus (default: false) */
  refetchOnWindowFocus?: boolean;
  /** Refetch when browser reconnects (default: false) */
  refetchOnReconnect?: boolean;

  // Mutation-specific options
  /** Hook called before mutation for optimistic updates */
  onMutate?: (variables: unknown) => Promise<unknown> | unknown;
  /** Callback fired after mutation completes (success or error) */
  onSettled?: (data?: T, error?: unknown, variables?: unknown, context?: unknown) => Promise<void> | void;
}

/**
 * The main resource object providing reactive state and control methods.
 * Offers fine-grained reactivity with manual fetch control and intelligent caching.
 * @template TTransformed - The transformed data type returned by data()
 * @template T - The raw data type for mutations and setData
 */
export interface Resource<TTransformed, T = TTransformed> {
  /** Reactive signal containing the fetched data (transformed if transform is used) */
  data: () => TTransformed | undefined;
  /** Reactive signal containing error information if request failed */
  error: () => ResourceError | undefined;
  /** Reactive signal indicating if initial load is in progress (no data yet) */
  isLoading: () => boolean;
  /** Reactive signal indicating if any fetch is in progress (including background refetch) */
  isFetching: () => boolean;
  /** Reactive signal indicating if resource has not been fetched yet */
  isIdle: () => boolean;
  /** Computed signal showing current resource status */
  status: () => ResourceStatus;
  /** Fetches data using cache-first strategy, or force fresh with `{ force: true }` */
  fetch(options?: FetchOptions): void;
  /** Cancels ongoing request and resets to initial state */
  abort(): void;
  /** Clears cache entry and triggers fresh request */
  invalidate(): void;
  /** Updates cached data with new value or updater function (raw type) */
  setData: (updater: T | ((old: T | undefined) => T)) => void;
  /** Gets the current cache key */
  cacheKey: () => unknown;
  /** Executes a mutation with given variables (returns raw type) */
  mutate: <TVariables = unknown>(variables: TVariables) => Promise<T>;
  /** Resets resource state to initial values */
  reset(): void;
  /** Disposes of all resource effects, polling timers, and subscriptions */
  dispose(): void;
}
