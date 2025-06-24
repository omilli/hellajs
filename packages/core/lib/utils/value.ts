import { executeComputed, type ComputedValue } from "../computed";
import { executeSignal, type SignalValue } from "../signal";

export function updateValue(value: SignalValue | ComputedValue): boolean {
  return (value as ComputedValue).compFn ? executeComputed(value as ComputedValue) : executeSignal(value as SignalValue, (value as SignalValue).currentVal);
}

export function hasValue<T>(value: T | undefined): value is T {
  return value !== undefined;
} 