import React from "react";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { OrganizationSelector } from "@/components/OrganizationSelector";

/**
 * DashboardLayout
 * Wraps all authenticated dashboard routes with the App Shell:
 * - Left sidebar navigation (AppSidebar)
 * - Top navbar with sidebar trigger and organization selector
 * - Content inset area for route pages
 */
export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Top navbar */}
        <div className="flex h-14 items-center gap-3 border-b bg-background/95 px-4">
          <SidebarTrigger />
          <div className="flex items-center gap-3">
            <span className="font-semibold">NexusSuite</span>
            <span className="text-xs text-muted-foreground">Dashboard</span>
          </div>
          <div className="ml-auto">
            <OrganizationSelector showCreateButton showSettings />
          </div>
        </div>

        {/* Main content */}
        <div className="container mx-auto px-4 py-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default DashboardLayout;