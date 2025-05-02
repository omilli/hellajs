import { getCurrentComponent } from "../ui";
import { setCurrentEffect } from "./state";

export function effect(fn: () => void): () => void {
  let execute: (() => void) | null = () => {
    setCurrentEffect(execute);
    fn();
    setCurrentEffect(null);
  };

  execute();

  const currentComponent = getCurrentComponent();

  if (currentComponent) {
    currentComponent.effects.add(() => {
      execute = null;
    });
  }

  return () => {
    execute = null;
  };
}