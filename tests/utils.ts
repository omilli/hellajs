export function tick(): Promise<unknown> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(null));
  });
}
