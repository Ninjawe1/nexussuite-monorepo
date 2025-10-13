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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";

const clubMenuItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Team", url: "/team", icon: UserCog },
  { title: "Staff", url: "/staff", icon: Users },
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
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const menuItems = user?.isSuperAdmin ? adminMenuItems : clubMenuItems;

  return (
    <Sidebar>
      <SidebarHeader className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-heading font-bold text-xl">N</span>
          </div>
          <div>
            <h2 className="font-heading font-semibold text-base">Nexus Suite</h2>
            <p className="text-xs text-muted-foreground">Esports Management</p>
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
                    <SidebarMenuButton asChild isActive={isActive} data-testid={`link-${item.title.toLowerCase()}`}>
                      <Link href={item.url}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3 p-2 rounded-lg hover-elevate active-elevate-2">
          <Avatar className="w-8 h-8">
            <AvatarImage src={user?.profileImageUrl || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {user?.firstName?.[0]}{user?.lastName?.[0] || user?.email?.[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user?.firstName} {user?.lastName || user?.email}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.isSuperAdmin ? "Super Admin" : user?.role}
            </p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
