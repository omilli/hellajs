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
export interface ResourceOptions<T, K> {
  /** Function to generate cache key for caching and deduplication */
  key?: () => K;
  /** Whether the resource is enabled and can make requests */
  enabled?: boolean;
  /** Whether to automatically refetch when key dependencies change */
  auto?: boolean;
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

  // Mutation-specific options
  /** Hook called before mutation for optimistic updates */
  onMutate?: <TVariables, TContext = unknown>(variables: TVariables) => Promise<TContext> | TContext;
  /** Callback fired after mutation completes (success or error) */
  onSettled?: <TVariables, TContext = unknown>(data?: T, error?: unknown, variables?: TVariables, context?: TContext) => Promise<void> | void;
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

export interface CacheUpdate<T> {
  key: unknown;
  updater: T | ((old: T | undefined) => T);
}

/** Type mapping for cache keys to their corresponding value types */
export type CacheKeyMap = {};

/** Helper type to extract value type from cache key */
export type ValueFromKey<K> = K extends keyof CacheKeyMap ? CacheKeyMap[K] : unknown;

export interface ResourceCache {
  /**
   * Gets the internal cache map containing all cached entries.
   * @returns The global cache Map instance
   */
  readonly map: Map<unknown, CacheEntry<unknown>>;

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
   * Stores data in the cache with optional time-to-live.
   * @template K - The cache key type
   * @template T - The data type to cache
   * @param key - Unique cache key for the data
   * @param data - Data to store in cache
   * @param cacheTime - Optional TTL in milliseconds (0 = no caching)
   * @returns Typed cache key for type safety
   */
  set<K, T>(key: K, data: T, cacheTime?: number): K & keyof CacheKeyMap extends never ? K : K & { __type: T };

  /**
   * Retrieves data from the cache by key.
   * @template K - The cache key type
   * @param key - Cache key to look up
   * @returns Cached data or undefined if not found/expired
   */
  get<K>(key: K): ValueFromKey<K> | undefined;

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
   * Creates a key generator template function for consistent cache key creation.
   * @template T - The parameters type for key generation
   * @returns Function that accepts a template and returns a key generator
   */
  generateKeys<T>(): (template: (params: T) => unknown) => (params: T) => unknown;

  /**
   * Creates an invalidator function that clears cache for multiple resources.
   * @param resources - Array of resources with invalidate methods
   * @returns Function that invalidates all provided resources
   */
  /**
   * Immediately invalidates all provided resources by calling their invalidate methods.
   * Despite the name suggesting it creates a function, this method executes immediately.
   * @param resources - Array of resources with invalidate methods
   */
  createInvalidator(resources: Array<Pick<Resource<any>, 'invalidate'>>): void;
}

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
export interface Resource<T> {
  /** Reactive signal containing the fetched data or undefined */
  data: () => T | undefined;
  /** Reactive signal containing error information if request failed */
  error: () => ResourceError | undefined;
  /** Reactive signal indicating if a request is currently in progress */
  loading: () => boolean;
  /** Computed signal showing current resource status */
  status: () => ResourceStatus;
  /** @deprecated use get() */
  fetch(): void;
  /** Initiates cache-first fetch (uses cached data if valid) */
  get(): void;
  /** Forces fresh request bypassing cache */
  request(): void;
  /** Cancels ongoing request and resets to initial state */
  abort(): void;
  /** Clears cache entry and triggers fresh request */
  invalidate(): void;
  /** Updates cached data with new value or updater function */
  setData: (updater: T | ((old: T | undefined) => T)) => void;
  /** Gets the current cache key */
  cacheKey: () => unknown;
  /** Executes a mutation with given variables */
  mutate: <TVariables = any>(variables: TVariables) => Promise<T>;
  /** Resets resource state to initial values */
  reset(): void;
}

/**
 * Function type for mutation operations that modify data.
 * @template TData - The expected return data type
 * @template TVariables - The input variables type
 */


/**
 * Configuration options for creating and controlling mutation behavior.
 * @template TData - The expected data type
 * @template TVariables - The input variables type
 * @template TContext - The context type for optimistic updates
 */


/**
 * The main mutation object providing reactive state and control methods.
 * Offers fine-grained reactivity with manual execution control.
 * @template TData - The expected data type
 * @template TVariables - The input variables type
 * @template TContext - The context type for optimistic updates
 */
