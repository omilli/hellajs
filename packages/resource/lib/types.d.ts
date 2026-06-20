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
 * @template TTransformed - The transformed data type returned by transform
 */
export interface ResourceOptions<T, K, TTransformed = T> {
  /** Function or static value to generate cache key for caching and deduplication */
  key?: (() => K) | K;
  /** Whether the resource is enabled and can make requests */
  enabled?: boolean;
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
 * Cache entry structure storing cached data with metadata for TTL and LRU eviction.
 * @template T - The cached data type
 */
export interface CacheEntry<T> {
  /** The cached data value */
  data: T;
  /** Timestamp when entry was created */
  timestamp: number;
  /** Time-to-live duration in milliseconds */
  cacheTime: number;
  /** Duration data is considered fresh in milliseconds */
  staleTime: number;
  /** Timestamp of last access for LRU eviction */
  lastAccess: number;
}

/**
 * Global cache configuration settings.
 */
export interface CacheConfig {
  /** Maximum number of entries before LRU eviction begins */
  maxSize?: number;
  /** Whether to enable Least Recently Used eviction strategy */
  enableLRU?: boolean;
}

/**
 * Describes a single batch update operation for {@link ResourceCache.updateMultiple}.
 * @template T - The data type for the update
 */
export interface CacheUpdate<T> {
  key: unknown;
  updater: T | ((old: T | undefined) => T);
}


/**
 * Flattened read-only view over the nested cache structure.
 * Provides a simple Map-like interface that searches across all fetcher scopes.
 */
export interface CacheMapView {
  /** Total cached entries across all fetcher scopes */
  readonly size: number;
  /** Finds a cache entry by key across all scopes */
  get(key: unknown): CacheEntry<unknown> | undefined;
  /** Checks if a key exists in any scope */
  has(key: unknown): boolean;
  /** Clears all entries across all fetcher scopes */
  clear(): void;
}

export interface ResourceCache {
  /**
   * Flattened view over the nested cache, searching across all fetcher scopes.
   * Each resource's cache is automatically isolated by its fetcher identity.
   */
  readonly map: CacheMapView;

  /**
   * Gets the current cache configuration settings.
   * @returns Current cache configuration object
   */
  readonly config: CacheConfig;

  /**
   * Updates the global cache configuration with new settings.
   * @param config - Partial configuration object to merge with current settings
   */
  setConfig(config: Partial<CacheConfig>): void;

  /**
   * Stores data in the cache with optional time-to-live and stale time.
   * @template K - The cache key type
   * @template T - The data type to cache
   * @param key - Unique cache key for the data
   * @param data - Data to store in cache
   * @param cacheTime - Optional TTL in milliseconds (0 = no caching)
   * @param staleTime - Optional stale time in milliseconds (0 = always stale)
   * @returns Typed cache key for type safety
   */
  set<K, T>(key: K, data: T, cacheTime?: number, staleTime?: number): K;

  /**
   * Retrieves data from the cache by key.
   * @template T - The expected data type
   * @param key Cache key to look up
   * @returns Cached data or undefined if not found/expired
   */
  get<T = unknown>(key: unknown): T | undefined;

  /**
   * Updates existing cached data using an updater function or direct value.
   * @template T - The data type
   * @param key - Cache key to update
   * @param updater - New value or function that receives old value and returns new value
   * @returns True if update succeeded, false if entry not found/expired
   */
  update<T>(key: unknown, updater: T | ((old: T | undefined) => T)): boolean;

  /**
   * Performs cleanup of expired cache entries to free memory.
   * Uses throttling to prevent excessive cleanup operations.
   */
  cleanup(): void;

  /**
   * Updates multiple cache entries in a batch operation.
   * @template T - The data type for all updates
   * @param updates - Array of update operations containing key and updater
   */
  updateMultiple<T>(updates: Array<CacheUpdate<T>>): void;

  /**
   * Removes a single entry from the cache by key.
   * @param key - Cache key to invalidate
   */
  invalidate(key: unknown): void;

  /**
   * Removes multiple entries from the cache by keys.
   * @param keys - Array of cache keys to invalidate
   */
  invalidateMultiple(keys: unknown[]): void;

  /**
   * Invalidates all cache entries whose keys start with the given prefix.
   * @param prefix - String prefix to match cache keys
   * @returns Number of entries invalidated
   */
  invalidateByPrefix(prefix: string): number;

  /**
   * Invalidates all cache entries whose keys match the given pattern.
   * @param pattern - RegExp pattern to match cache keys
   * @returns Number of entries invalidated
   */
  invalidateByPattern(pattern: RegExp): number;

  /**
   * Invalidates all cache entries.
   * @returns Number of entries invalidated
   */
  invalidateAll(): number;

  /**
   * Creates a key generator template function for consistent cache key creation.
   * @template T - The parameters type for key generation
   * @returns Function that accepts a template and returns a key generator
   */
  createKeyGenerator<T>(): (template: (params: T) => unknown) => (params: T) => unknown;

  /**
   * Immediately invalidates all provided resources by calling their invalidate methods.
   * @param resources - Array of resources with invalidate methods
   */
  invalidateResources(resources: Array<Pick<Resource<unknown>, "invalidate">>): void;

  /**
   * Checks if the browser is currently online.
   * @returns True if online, false if offline
   */
  isOnline(): boolean;

  /**
   * Subscribes to online/offline status changes.
   * @param callback - Function called with online status when it changes
   * @returns Unsubscribe function
   */
  onOnlineChange(callback: (online: boolean) => void): () => void;
}

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