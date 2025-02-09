import { toError } from "../global";
import { HELLA_RESOURCE } from "./resource.global";
import { ResourceOptions } from "./resource.types";

const { activeRequests } = HELLA_RESOURCE;

export function validatePoolSize(limit: number): void {
  if (activeRequests.size >= limit) {
    throw toError("Resource pool limit reached");
  }
}

export function validateResult<T>(
  result: T,
  config: Required<ResourceOptions<T>>
): T {
  if (result === null || result === undefined) {
    throw toError("Resource returned no data");
  }

  if (!config.validate(result)) {
    throw toError("Resource validation failed");
  }

  return result;
}
