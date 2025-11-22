"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSidebar } from "@/components/ui/sidebar";
import { tweakcn } from "@/lib/tweakcn";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
    items?: {
      title: string;
      url: string;
    }[];
  }[];
}) {
  // Determine collapsed state to adapt rendering like shadcn/ui demo
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <SidebarGroup>
      {/* Hide group label entirely when collapsed to keep a clean icon stack */}
      {!isCollapsed && <SidebarGroupLabel>Platform</SidebarGroupLabel>}
      <SidebarMenu>
        {items.map((item) => {
          const hasChildren =
            Array.isArray(item.items) && item.items.length > 0;

          if (hasChildren) {
            return (
              <Collapsible
                key={item.title}
                asChild
                defaultOpen={item.isActive}
                className="group/collapsible"
              >
                <SidebarMenuItem className={isCollapsed ? "p-0 m-0 flex justify-center items-center w-full" : undefined}>
                  <CollapsibleTrigger asChild>
                    {/* When collapsed: icon-only button centered with tooltip. When expanded: icon + text. */}
                    {isCollapsed ? (
                      <SidebarMenuButton
                        tooltip={{ children: item.title, side: "right", align: "center", sideOffset: 10 }}
                        isActive={item.isActive}
                        className={tweakcn(
                          // Ensure perfect centering within the 45px column
                          "h-[45px] w-[45px] rounded-md flex items-center justify-center transition-all duration-200 mx-auto p-0",
                        )}
                      >
                        {item.icon && <item.icon className="h-5 w-5 shrink-0" />}
                      </SidebarMenuButton>
                    ) : (
                      <SidebarMenuButton
                        tooltip={undefined}
                        isActive={item.isActive}
                        className={tweakcn("h-[45px] transition-all justify-start px-2.5 gap-2")}
                      >
                        {item.icon && <item.icon className="h-5 w-5 shrink-0" />}
                        <span className="truncate text-sm font-medium">{item.title}</span>
                        <ChevronRight className="ml-auto size-4 shrink-0 transition-transform duration-200 ease-out group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild>
                            <a href={subItem.url}>
                              <span>{subItem.title}</span>
                            </a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            );
          }

          return (
            <SidebarMenuItem key={item.title} className={isCollapsed ? "p-0 m-0 flex justify-center items-center w-full" : undefined}>
              {isCollapsed ? (
                <SidebarMenuButton
                  tooltip={{ children: item.title, side: "right", align: "center", sideOffset: 10 }}
                  isActive={item.isActive}
                  className={tweakcn(
                    // Center the icon within the column and remove any residual offsets
                    "h-[45px] w-[45px] rounded-md flex items-center justify-center transition-all duration-200 mx-auto p-0",
                  )}
                  asChild
                >
                  <a href={item.url} aria-current={item.isActive ? "page" : undefined}>
                    {item.icon && <item.icon className="h-5 w-5 shrink-0" />}
                  </a>
                </SidebarMenuButton>
              ) : (
                <SidebarMenuButton
                  isActive={item.isActive}
                  className={tweakcn("h-[45px] transition-all justify-start px-2.5 gap-2")}
                  asChild
                >
                  <a href={item.url} aria-current={item.isActive ? "page" : undefined}>
                    {item.icon && <item.icon className="h-5 w-5 shrink-0" />}
                    <span className="truncate text-sm font-medium">{item.title}</span>
                  </a>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
