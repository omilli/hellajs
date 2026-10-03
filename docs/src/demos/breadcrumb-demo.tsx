import { style } from "@hellajs/css";
import Breadcrumb, {
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@registry/breadcrumb/css/breadcrumb.js";
import DropdownMenu, { DropdownMenuItem } from "@registry/dropdown-menu/css/dropdown-menu.js";
import { row } from "./demo-kit";

const stack = style({
  alignItems: "center",
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
  width: "100%",
});



export default function BreadcrumbDemo() {
  return (
    <div class={stack}>
      <div class={row}>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink href="#home">Home</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbLink href="#ui">UI</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>Breadcrumb</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </div>
  );
}

export function BreadcrumbCollapsedDemo() {
  return (
    <div class={stack}>
      <div class={row}>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink href="#home">Home</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <DropdownMenu content={
                <>
                  <DropdownMenuItem>Components</DropdownMenuItem>
                  <DropdownMenuItem>Labels</DropdownMenuItem>
                </>
              }>
                <BreadcrumbEllipsis />
              </DropdownMenu>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbLink href="#docs">Docs</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>Breadcrumb</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </div>
  );
}
