export const componentModule = (setup: Function) => {
  let initialized = false;

  const module = (...args: any[]) => {
    if (initialized) return;
    setup(...args);
    initialized = true;
  };

  module.initialized = () => initialized;

  return module;
};
