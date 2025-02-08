import { router } from "./store";
import { matchPath } from "./utils";

export function beforeNavigate(
  paths: string[],
  callback: (path: string) => void
): () => void {
  const handler = (path: string) =>
    (paths.length === 0 || paths.some((pattern) => matchPath(pattern, path))) &&
    callback(path);
  router().on("beforeNavigate", handler);
  return () => router().off("beforeNavigate", handler);
}

export function afterNavigate(
  paths: string[],
  callback: (path: string) => void
): () => void {
  const handler = (path: string) =>
    (paths.length === 0 || paths.some((pattern) => matchPath(pattern, path))) &&
    callback(path);
  router().on("afterNavigate", handler);
  return () => router().off("afterNavigate", handler);
}
