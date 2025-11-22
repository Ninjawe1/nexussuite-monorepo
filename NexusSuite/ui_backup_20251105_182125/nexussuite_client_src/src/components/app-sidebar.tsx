import { Home, Users, DollarSign, BarChart3, Calendar, Trophy, Megaphone, Wallet, FileText, Shield, Settings, Crown, UserCog } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { BottomProfile } from "@/components/bottom-profile";

const clubMenuItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Team", url: "/team", icon: UserCog },
  { title: "Players", url: "/players", icon: Users },
  { title: "Payroll", url: "/payroll", icon: DollarSign },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Matches", url: "/matches", icon: Calendar },
  { title: "Tournaments", url: "/tournaments", icon: Trophy },
  { title: "Marcom", url: "/marcom", icon: Megaphone },
  { title: "Finance", url: "/finance", icon: Wallet },
  { title: "Contracts", url: "/contracts", icon: FileText },
  { title: "Audit Log", url: "/audit", icon: Shield },
  { title: "Settings", url: "/settings", icon: Settings },
];

const adminMenuItems = [
  { title: "Admin Dashboard", url: "/admin", icon: Crown },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Billing", url: "/admin/billing", icon: DollarSign },
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
  { title: "Content", url: "/admin/content", icon: FileText },
  { title: "Settings", url: "/admin/settings", icon: Settings },
  { title: "Logs", url: "/admin/logs", icon: Shield },
  { title: "Communication", url: "/admin/communication", icon: Megaphone },
  { title: "Security", url: "/admin/security", icon: Shield },
  { title: "Roles", url: "/admin/roles", icon: UserCog },
  { title: "Marketing", url: "/admin/marketing", icon: Wallet },
  { title: "Reports", url: "/admin/reports", icon: FileText },
];

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const menuItems = user?.isSuperAdmin ? adminMenuItems : clubMenuItems;

  return (
    <Sidebar collapsible="icon" variant="inset">
      {/* Header: keep only the icon (hide text/labels) */}
      <SidebarHeader className="p-3">
        <div className="flex items-center justify-center">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-heading font-bold text-xl">N</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      data-testid={`link-${item.title.toLowerCase()}`}
                    >
                      <Link href={item.url} title={item.title}>
                        <item.icon className="w-4 h-4" />
                        <span className="group-data-[collapsible=icon]:hidden md:inline">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {/* Footer: place BottomProfile at the very bottom of the sidebar */}
      <SidebarFooter className="mt-auto p-0 relative group-data-[collapsible=icon]:p-0">
        {/* Anchor container ensures absolute positioning within footer area */}
        <div className="relative w-full">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full group-data-[collapsible=icon]:w-auto px-2 pb-2">
            <div className="flex justify-center">
              <BottomProfile />
            </div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

