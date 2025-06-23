import { executeComputed, type ComputedValue } from "../computed";
import { executeSignal, type SignalValue } from "../signal";

export function updateValue(value: SignalValue | ComputedValue): boolean {
  return 'compFn' in value ? executeComputed(value) : executeSignal(value, (value as SignalValue).currentVal);
}

export function hasValue<T>(value: T | undefined): value is T {
  return value !== undefined;
} 