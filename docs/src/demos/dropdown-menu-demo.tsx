import { signal } from "@hellajs/core";
import Button from "@registry/button/css/button.js";
import DropdownMenu, {
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuSeparator,
  DropdownMenuSub,
} from "@registry/dropdown-menu/css/dropdown-menu.js";

export function DropdownMenuDemo() {
  const bold = signal(false);
  const size = signal("medium");

  const formatItems = (
    <>
      <DropdownMenuLabel>Formatting</DropdownMenuLabel>
      <DropdownMenuCheckboxItem checked={bold} onCheckedChange={(next: boolean) => bold(next)}>Bold</DropdownMenuCheckboxItem>
      <DropdownMenuSeparator />
      <DropdownMenuRadioGroup
        items={[
          { value: "small", label: "Small" },
          { value: "medium", label: "Medium" },
          { value: "large", label: "Large" },
        ]}
        value={size}
        onValueChange={(next: string) => size(next)}
      />
    </>
  );

  return (
    <>
      <div class="demo-row">
        <DropdownMenu content={formatItems}><Button variant="outline">Format</Button></DropdownMenu>
      </div>
    </>
  );
}

export function DropdownMenuSubmenuDemo() {
  const fileItems = (
    <>
      <DropdownMenuItem>Save</DropdownMenuItem>
      <DropdownMenuSub content={
        <>
          <DropdownMenuItem>Export as PDF</DropdownMenuItem>
          <DropdownMenuItem>Export as HTML</DropdownMenuItem>
        </>
      }>
        Export
      </DropdownMenuSub>
    </>
  );

  return (
    <>
      <div class="demo-row">
        <DropdownMenu content={fileItems}><Button variant="outline">File</Button></DropdownMenu>
      </div>
    </>
  );
}
