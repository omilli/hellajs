import { signal } from "./signal";
import { ResourceOptions, ResourceResult, GenericPromise } from "../types";

export function resource<T>(
  input?: string | GenericPromise<T>,
  options: ResourceOptions<T> = {}
): ResourceResult<T> {
  const state = {
    data: signal<T | undefined>(undefined),
    loading: signal(false),
    error: signal<Error | undefined>(undefined),
  };
  const fetcher = createResourceFetcher(input, options);
  const fetch = createFetchHandler(fetcher, state, options);
  return {
    ...state,
    fetch,
  };
}

function createResourceFetcher<T>(
  input: string | GenericPromise<T> | undefined,
  options: ResourceOptions<T>
): GenericPromise<T> {
  if (!input) {
    return () => fetchJSON(window.location.pathname, options.onError);
  }
  return typeof input === "string"
    ? () => fetchJSON(input, options.onError)
    : input;
}

async function fetchJSON<T>(
  url: string,
  onError?: (response: Response) => void
): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    onError?.(response);
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

function createFetchHandler<T>(
  fetcher: GenericPromise<T>,
  state: Pick<ResourceResult<T>, "data" | "loading" | "error">,
  options: ResourceOptions<T>
): () => Promise<void> {
  return async function fetch(): Promise<void> {
    state.loading.set(true);
    state.error.set(undefined);
    try {
      const result = await fetcher();
      const transformedResult = options.transform?.(result) ?? result;
      state.data.set(transformedResult);
    } catch (e) {
      state.error.set(e instanceof Error ? e : new Error(String(e)));
    } finally {
      state.loading.set(false);
    }
  };
}
