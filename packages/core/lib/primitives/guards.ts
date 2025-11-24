/**
 * Type guard to check if a value is a signal.
 * @param value - The value to check
 * @returns True if the value is a signal, false otherwise
 */
export function isSignal(value: unknown): boolean {
  return typeof value === 'function' && value.name === '$signal';
}

/**
 * Type guard to check if a value is a computed.
 * @param value - The value to check
 * @returns True if the value is a computed, false otherwise
 */
export function isComputed(value: unknown): boolean {
  return typeof value === 'function' && value.name === '$computed';
}

/**
 * Type guard to check if a value is either a signal or computed.
 * @param value - The value to check
 * @returns True if the value is a signal or computed, false otherwise
 */
export function isReactive(value: unknown): boolean {
  return isSignal(value) || isComputed(value);
}
