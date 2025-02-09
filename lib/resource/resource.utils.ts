import { signal } from "../reactive";
import { ResourceOptions } from "./resource.types";

/**
 * Resource state initialization
 */
export function resourceState<T>() {
  return {
    data: signal<T | undefined>(undefined),
    loading: signal(false),
    error: signal<Error | undefined>(undefined),
  };
}

/**
 * Resource configuration with defaults
 */
export function resourceConfig<T>(options: ResourceOptions<T>) {
  return {
    cache: true,
    cacheTime: 300000,
    timeout: 30000,
    retries: 3,
    retryDelay: 1000,
    poolSize: 10,
    transform: (data: T) => data,
    validate: (_: T) => true,
    onError: (_: Response) => undefined,
    ...options,
  };
}
