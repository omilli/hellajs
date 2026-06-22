import { expect } from "bun:test";

export const renderInto = (container: HTMLElement) => (content: string) => {
  container.textContent = content;
};

export const setupRouterEnv = (): {
  container: HTMLDivElement;
  render: (content: string) => void;
} => {
  resetTestState();
  const container = setupContainer();
  const render = renderInto(container);
  window.history.replaceState({}, "", "/");
  return { container, render };
};

export const expectLoggedError = (
  sup: { errors: [string, unknown][] },
  prefix: string,
  message?: string
): void => {
  expect(
    sup.errors.some(
      ([p, e]) =>
        p === prefix &&
        e instanceof Error &&
        (message === undefined || e.message === message)
    )
  ).toBe(true);
};
