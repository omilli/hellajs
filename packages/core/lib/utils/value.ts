import { executeComputed, type ComputedBase } from "../computed";
import { executeSignal, type SignalBase } from "../signal";

export function updateValue(value: SignalBase | ComputedBase): boolean {
  return (value as ComputedBase).compFn ? executeComputed(value as ComputedBase) : executeSignal(value as SignalBase, (value as SignalBase).currentVal);
}

export function hasValue<T>(value: T | undefined): value is T {
  return value !== undefined;
} 