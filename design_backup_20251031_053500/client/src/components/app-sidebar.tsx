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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";

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
      {/* Footer: user avatar with dropdown menu (Profile, Logout) */}
      <SidebarFooter className="mt-auto p-3 group-data-[collapsible=icon]:p-1">
        <div className="flex items-center justify-center p-2 rounded-lg group-data-[collapsible=icon]:p-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button aria-label="User menu" className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user?.profileImageUrl || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {user?.firstName?.[0]}{user?.lastName?.[0] || user?.email?.[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem data-testid="menu-profile" onClick={() => setLocation("/profile")}>Profile</DropdownMenuItem>
              <DropdownMenuItem
                data-testid="menu-logout"
                onClick={async () => {
                  try {
                    await fetch("/api/auth/logout", { method: "POST" });
                  } finally {
                    window.location.href = "/login";
                  }
                }}
              >
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
