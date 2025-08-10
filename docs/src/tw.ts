export const tw = (strings: TemplateStringsArray, ...values: any[]): string =>
  strings.reduce((result, str, i) =>
    `${result}${str}${values[i] || ''}`,
    '');
