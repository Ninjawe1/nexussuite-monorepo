import {
  Home,
  Users,
  DollarSign,
  BarChart3,
  Calendar,
  Trophy,
  Megaphone,
  Wallet,
  FileText,
  Shield,
  Settings,
  Crown,
  UserCog,
} from "lucide-react";
import { useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { OrgSelector } from "@/components/OrgSelector";
import { useOrganization } from "@/contexts/OrganizationContext";

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
  const { currentMembership } = useOrganization();
  const menuItems = user?.isSuperAdmin ? adminMenuItems : clubMenuItems;
  let baseNavItems = menuItems.map((item) => ({

    ...item,
    isActive: location === item.url,
  }));

  // Conditionally add "My Organisation" group with Org Settings and Members
  const canSeeOrgSection = ["admin", "owner"].includes(
    (currentMembership?.role || "").toLowerCase()
  );

  const orgSection = {
    title: "My Organisation",
    url: "#",
    icon: Settings,
    isActive: location.startsWith("/dashboard/org"),
    items: [
      {
        title: "Organization Settings",
        url: "/dashboard/org/settings",
        icon: Settings,
        isActive: location === "/dashboard/org/settings",
      },
      {
        title: "Team / Members",
        url: "/dashboard/org/members",
        icon: Users,
        isActive: location === "/dashboard/org/members",
      },
      {
        title: "Billing",
        url: "/dashboard/org/billing",
        icon: DollarSign,
        isActive: location === "/dashboard/org/billing",

      },
    ],
  };

  const navItems = canSeeOrgSection
    ? [orgSection, ...baseNavItems]
    : baseNavItems;


  return (
    <Sidebar collapsible="icon" variant="inset">
      {/* Header: OrgSelector as the single top element (clean shadcn style) */}
      <SidebarHeader className="p-0">
        <OrgSelector />
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <ScrollArea className="h-full">
          {/* Render main navigation (includes its own group label) */}
          <NavMain items={navItems} />
        </ScrollArea>
      </SidebarContent>
      {/* Footer: use official ShadCN NavUser pattern; align with inset spacing */}
      <SidebarFooter className="px-2 pb-2 pt-0">
        <NavUser
          user={{
            name:
              (user as any)?.name?.toString?.() ||
              (user?.email ? user.email.split("@")[0] : "User"),
            email: user?.email ?? "",
            avatar: (user as any)?.profileImageUrl ?? "",

          }}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
