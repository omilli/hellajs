import { HELLA_RESOURCE } from "./resource.global";
import { ResourceOptions } from "./resource.types";

const { activeRequests } = HELLA_RESOURCE;

export function validatePoolSize(limit: number): void {
  if (activeRequests.size >= limit) {
    throw new Error("Resource pool limit reached");
  }
}

export function validateResult<T>(
  result: T,
  config: Required<ResourceOptions<T>>
): T {
  // Handle null/undefined results
  if (result === null || result === undefined) {
    throw new Error("Resource returned no data");
  }

  // Run custom validation
  if (!config.validate(result)) {
    throw new Error("Resource validation failed");
  }

  return result;
}
