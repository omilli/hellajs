import { style } from "@hellajs/css";
import { tokens } from "../styles/tokens";
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
} from "@components/ui/sidebar.js";



const muted = style({
  color: tokens.mutedForeground,
  fontSize: "0.875rem",
}, { label: "demo-muted" });

const shell = style({
  position: "relative",
  width: "100%",
  height: "30rem",
  overflow: "hidden",
  border: `1px solid ${tokens.border}`,
  borderRadius: tokens.radius,
  background: tokens.background,
  transform: "translateZ(0)",
}, { label: "demo-sidebar-shell" });

export function SidebarDemo() {
  return (
    <div class={shell}>
      <SidebarProvider children={(state) => (
          <>
          <Sidebar open={state.open} mobile={state.mobile} openMobile={state.openMobile} onOpenMobileChange={state.setOpenMobile} collapsible="icon">
            <SidebarHeader><span class="demo-muted">Acme Inc</span></SidebarHeader>
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
            <SidebarFooter><span class="demo-muted">Ctrl+B toggles</span></SidebarFooter>
          </Sidebar>
          <SidebarInset>
            <SidebarTrigger onToggle={state.onToggle} />
          </SidebarInset>
          </>
      )} />
    </div>
  );
}

export function SidebarMenuDemo() {
  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton active>Inbox</SidebarMenuButton>
          <SidebarMenuBadge>3</SidebarMenuBadge>
          <SidebarMenuAction showOnHover on:click={() => console.log("configure")}>Configure</SidebarMenuAction>
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
    </>
  );
}
