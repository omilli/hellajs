import type { Resource } from "./resource";

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
