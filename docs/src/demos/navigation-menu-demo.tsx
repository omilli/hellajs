import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import { row } from "./demo-kit";
import NavigationMenu, {
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuIndicator,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuViewport,
} from "@registry/navigation-menu/css/navigation-menu.js";

const stack = style({
  alignItems: "center",
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
});



function trigger(id: string, label: string, value: () => string, toggle: (id: string) => void) {
  return (
    <NavigationMenuTrigger value={id} active={() => value() === id} onActivate={() => toggle(id)}>{label}</NavigationMenuTrigger>
  );
}

export default function NavigationMenuDemo() {
  const value = signal("");
  const toggle = (id: string): void => value(value() === id ? "" : id);

  return (
    <div class={stack}>
      <div class={row}>
        <NavigationMenu onValueChange={(next: string) => value(next)}>
          <NavigationMenuList>
            <NavigationMenuItem>
              {trigger("learn", "Learn", value, toggle)}
              <NavigationMenuContent active={() => value() === "learn"}>
                <NavigationMenuLink href="#intro">Introduction</NavigationMenuLink>
                <NavigationMenuLink href="#themes">Themes and Tokens</NavigationMenuLink>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              {trigger("reference", "Reference", value, toggle)}
              <NavigationMenuContent active={() => value() === "reference"}>
                <NavigationMenuLink href="#components">Components</NavigationMenuLink>
                <NavigationMenuLink href="#behaviors">Headless Behaviors</NavigationMenuLink>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
          <NavigationMenuViewport active={() => value() !== ""} />
          <NavigationMenuIndicator />
        </NavigationMenu>
      </div>
    </div>
  );
}

export function NavigationMenuActiveLinksDemo() {
  const value = signal("");
  const toggle = (id: string): void => value(value() === id ? "" : id);

  return (
    <div class={stack}>
      <div class={row}>
        <NavigationMenu onValueChange={(next: string) => value(next)}>
          <NavigationMenuList>
            <NavigationMenuItem>
              {trigger("resources", "Resources", value, toggle)}
              <NavigationMenuContent active={() => value() === "resources"}>
                <NavigationMenuLink href="#guide" active={true}>Guide</NavigationMenuLink>
                <NavigationMenuLink href="#api">API Reference</NavigationMenuLink>
                <NavigationMenuLink href="#examples">Examples</NavigationMenuLink>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
          <NavigationMenuViewport active={() => value() !== ""} />
          <NavigationMenuIndicator active={() => value() !== ""} />
        </NavigationMenu>
      </div>
    </div>
  );
}
