import {
  createTimeout,
  delay,
  isAbortError,
  isString,
  toError,
} from "../global";
import { ResourceJSONArgs, ResourceRequestArgs } from "./resource.types";

/**
 * Request execution with retries
 */
export async function executeRequest<T>({
  input,
  options,
  signal,
}: ResourceRequestArgs<T>): Promise<T> {
  let error: Error | undefined;

  for (let attempt = 0; attempt < options.retries; attempt++) {
    try {
      const timeoutPromise = createTimeout(options.timeout);
      const fetchPromise = isString(input)
        ? fetchJSON({ url: input, onError: options.onError, signal })
        : input();

      return (await Promise.race([fetchPromise, timeoutPromise])) as T;
    } catch (e) {
      error = toError(e);
      if (isAbortError(e)) throw error;
      await delay(options.retryDelay * (attempt + 1));
    }
  }

  throw error ?? new Error("Request failed");
}

/**
 * JSON fetcher with error handling
 */
export async function fetchJSON<T>({
  url,
  onError,
  signal,
}: ResourceJSONArgs): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    onError?.(response);
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}
