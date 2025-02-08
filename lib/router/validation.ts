export const maxNavigationRate = 1000 / 30;
export const maxRedirects = 10;
export const pathValidationRegex = /^[/\w-]+$/;
export const paramValidationRegex = /^[\w-]+$/;

let lastNavigationTime = 0;
let redirectCount = 0;

export const validatePath = (path: string): boolean =>
  Boolean(path.match(pathValidationRegex));

export const validateRouteParam = (param: string): boolean =>
  Boolean(param.match(paramValidationRegex));

export const validateNavigationRate = (): boolean => {
  const now = Date.now();
  const timeDiff = now - lastNavigationTime;
  lastNavigationTime = now;
  return timeDiff > maxNavigationRate;
};

export const validateRedirectCount = (): boolean => {
  redirectCount++;
  const isValid = redirectCount <= maxRedirects;
  !isValid && (redirectCount = 0);
  return isValid;
};

export const resetRedirectCount = (): void => {
  redirectCount = 0;
};
