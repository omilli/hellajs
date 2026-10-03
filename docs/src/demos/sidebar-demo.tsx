import { style } from "@hellajs/css";
import { stack } from "./demo-kit";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@registry/sidebar/css/sidebar.js";



const muted = style({
  color: "var(--muted-foreground)",
  fontSize: "0.875rem",
}, { label: "demo-muted" });

export default function SidebarDemo() {
  return (
    <SidebarProvider children={(state) => (
      <div class={stack}>
          <Sidebar open={state.open} mobile={state.mobile} openMobile={state.openMobile} onOpenMobileChange={state.setOpenMobile} collapsible="icon">
            <SidebarHeader><span class={muted}>Acme Inc</span></SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Application</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton active tooltip="Home" open={state.open} mobile={state.mobile}>Home</SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton tooltip="Search" open={state.open} mobile={state.mobile}>Search</SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
            <SidebarSeparator />
            <SidebarFooter><span class={muted}>Ctrl+B toggles</span></SidebarFooter>
          </Sidebar>
          <SidebarInset>
            <SidebarTrigger onToggle={state.onToggle} />
          </SidebarInset>
        </div>
      )} />
  );
}

export function SidebarMenuDemo() {
  return (
    <div class={stack}>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton active>Inbox</SidebarMenuButton>
          <SidebarMenuBadge>3</SidebarMenuBadge>
          <SidebarMenuAction showOnHover onclick={() => console.log("configure")}>Configure</SidebarMenuAction>
          <SidebarMenuSub>
            <SidebarMenuSubItem>
              <SidebarMenuSubButton active href="#settings">Settings</SidebarMenuSubButton>
            </SidebarMenuSubItem>
          </SidebarMenuSub>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuSkeleton showIcon />
        </SidebarMenuItem>
      </SidebarMenu>
    </div>
  );
}
