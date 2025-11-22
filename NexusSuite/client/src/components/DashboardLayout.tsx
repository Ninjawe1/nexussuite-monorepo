import React from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { OrganizationSelector } from "@/components/OrganizationSelector";

/**
 * DashboardLayout
 * Wraps authenticated dashboard pages with the App Shell (Sidebar + Topbar)
 */
export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset>
          <div className="flex h-12 items-center gap-2 border-b bg-background px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="ml-auto">
              <OrganizationSelector />
            </div>
          </div>
          {/* Content area: add balanced horizontal padding and max width */}
          <div className="min-h-[calc(100vh-3rem)] bg-background">
            <div className="container mx-auto px-6 md:px-8 py-6">
              {children}
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};