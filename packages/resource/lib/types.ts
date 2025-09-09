import type { ReadonlySignal } from "@hellajs/core";

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
 * Configuration options for creating and controlling resource behavior.
 * @template T - The expected data type
 * @template K - The cache key type
 */
export type ResourceOptions<T, K> = {
  /** Function to generate cache key for caching and deduplication */
  key?: () => K;
  /** Whether the resource is enabled and can make requests */
  enabled?: boolean;
  /** Initial data value to use before any requests complete */
  initialData?: T;
  /** Cache time-to-live in milliseconds (0 = no caching) */
  cacheTime?: number;
  /** Request timeout in milliseconds before abort */
  timeout?: number;
  /** External abort signal to cancel requests */
  abortSignal?: AbortSignal;
  /** Whether to deduplicate identical concurrent requests */
  deduplicate?: boolean;
  /** Callback fired when request succeeds */
  onSuccess?: (data: T) => void;
  /** Callback fired when request fails */
  onError?: (err: unknown) => void;
};

/**
 * Cache entry structure storing cached data with metadata for TTL and LRU eviction.
 * @template T - The cached data type
 */
export type CacheEntry<T> = {
  /** The cached data value */
  data: T;
  /** Timestamp when entry was created */
  timestamp: number;
  /** Time-to-live duration in milliseconds */
  cacheTime: number;
  /** Timestamp of last access for LRU eviction */
  lastAccess: number;
};

/**
 * Global cache configuration settings.
 */
export type CacheConfig = {
  /** Maximum number of entries before LRU eviction begins */
  maxSize?: number;
  /** Whether to enable Least Recently Used eviction strategy */
  enableLRU?: boolean;
};

/**
 * Categorizes different types of errors that can occur during resource operations.
 * Used for structured error handling and user feedback.
 */
export type ResourceErrorCategory =
  | 'network'      // Network connectivity issues
  | 'validation'   // Data validation failures
  | 'authorization' // Authentication/authorization failures
  | 'not_found'    // Resource not found (404)
  | 'server'       // Server errors (5xx)
  | 'client'       // Client errors (4xx)
  | 'timeout'      // Request timeout
  | 'abort'        // Request was aborted
  | 'unknown';     // Unclassified errors

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
 * The main resource object providing reactive state and control methods.
 * Offers fine-grained reactivity with manual fetch control and intelligent caching.
 * @template T - The expected data type
 */
export type Resource<T> = {
  /** Reactive signal containing the fetched data or undefined */
  data: ReadonlySignal<T | undefined>;
  /** Reactive signal containing error information if request failed */
  error: ReadonlySignal<ResourceError | undefined>;
  /** Reactive signal indicating if a request is currently in progress */
  loading: ReadonlySignal<boolean>;
  /** Computed signal showing current resource status */
  status: ReadonlySignal<ResourceStatus>;
  /** Initiates cache-first fetch (uses cached data if valid) */
  fetch(): void;
  /** Forces fresh request bypassing cache */
  request(): void;
  /** Cancels ongoing request and resets to initial state */
  abort(): void;
  /** Clears cache entry and triggers fresh request */
  invalidate(): void;
};