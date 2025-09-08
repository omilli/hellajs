/**
 * Stringifies an object for hashing.
 * @param obj The object to stringify.
 * @returns A string representation of the object.
 */
export function stringify(obj: any): string {
  if (typeof obj !== 'object' || obj === null) return String(obj);

  const keys = Object.keys(obj).sort();
  const pairs = [];
  let i = 0, l = keys.length;
  while (i < l) {
    pairs.push(`${keys[i]}:${stringify(obj[keys[i]])}`);
    i++;
  }
  return `{${pairs.join(',')}}`;
}