"use client";
import React, { useState } from "react";

/* SidebarMenuButton replaces Button for TeamSwitcher parity */
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ChevronsUpDown, Loader2, Plus } from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";


type OrgSelectorProps = {
  className?: string;
};

/**
 * OrgSelector
 * Compact organization selector designed for the sidebar header.
 * Uses existing OrganizationContext (Better Auth integration under-the-hood)
 * to list and switch organizations.
 */
export function OrgSelector({ className = "" }: OrgSelectorProps) {
  const { isMobile, state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const {
    organizations,
    currentOrganization,
    currentMembership,
    isLoading,
    isSwitching,
    selectOrganization,
  } = useOrganization();

  const [pendingOrgId, setPendingOrgId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");

  const [isCreating, setIsCreating] = useState(false);

  const handleSwitch = async (orgId: string) => {
    if (!orgId || orgId === currentOrganization?.id) return;
    setPendingOrgId(orgId);
    try {
      await selectOrganization(orgId);
    } finally {
      setPendingOrgId(null);
    }
  };

  // Loading shimmer to match shadcn Team Switcher skeleton style
  if (isLoading) {
    return (
      <div className={`h-[45px] w-full rounded-lg bg-muted/40 animate-pulse ${className}`} />
    );

  }

  if (!currentOrganization) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" className={`h-[45px] px-2 py-1.5 ${className}`} disabled>
            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square h-8 w-8 items-center justify-center rounded-lg">
              <span className="text-[10px]">--</span>
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">No organization</span>
              <span className="truncate text-xs">—</span>
            </div>
            <ChevronsUpDown className="ml-auto h-4 w-4 opacity-60" />
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  const isPending = Boolean(pendingOrgId) || isSwitching;

  const initials = (name: string) => name?.trim().slice(0, 2).toUpperCase();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <TooltipProvider disableHoverableContent>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <div className="w-full">
                    {isCollapsed ? (
                      <SidebarMenuButton
                        size="icon"
                        className={`h-[45px] w-full justify-center transition-all data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground ${className} ${isPending ? "opacity-60" : ""}`}

                        disabled={isPending}
                      >
                        {isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin opacity-70" />
                        ) : (
                          <Avatar className="h-8 w-8 shrink-0 rounded-full">
                            <AvatarImage src={(currentOrganization as any)?.avatarUrl || ""} alt={currentOrganization.name} />

                            <AvatarFallback className="text-[11px] font-medium leading-none">
                              {initials(currentOrganization.name)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </SidebarMenuButton>
                    ) : (
                      <SidebarMenuButton
                        size="lg"
                        className={`h-[45px] w-full justify-start px-2.5 gap-2 transition-all data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground ${className} ${isPending ? "opacity-80" : ""}`}
                        disabled={isPending}
                      >
                        <Avatar className="h-8 w-8 shrink-0 rounded-lg">
                          <AvatarImage src={(currentOrganization as any)?.avatarUrl || ""} alt={currentOrganization.name} />

                          <AvatarFallback className="text-[11px] font-medium leading-none">
                            {initials(currentOrganization.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="grid flex-1 text-left text-sm leading-tight overflow-hidden">
                          <span className="truncate font-medium">{currentOrganization.name}</span>
                          <span className="truncate text-xs text-muted-foreground">{currentMembership?.role ?? ""}</span>

                        </div>
                        {isPending ? (
                          <Loader2 className="ml-auto h-4 w-4 animate-spin opacity-70" />
                        ) : (
                          <ChevronsUpDown className="ml-auto h-4 w-4 opacity-70" />
                        )}
                      </SidebarMenuButton>
                    )}
                  </div>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right" align="center" sideOffset={8}>
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{currentOrganization.name}</span>
                    <span className="text-xs text-muted-foreground">{currentMembership?.role ?? ""}</span>

                  </div>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}

            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Organizations
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {organizations.map((org, index) => (
              <DropdownMenuItem
                key={org.id}
                onClick={() => handleSwitch(org.id)}
                className="gap-2 p-2"
                disabled={isPending}
              >
                <Avatar className="h-6 w-6 rounded-md border">
                  <AvatarImage src={(org as any)?.avatarUrl || ""} alt={org.name} />

                  <AvatarFallback className="text-[10px] leading-none">
                    {initials(org.name)}
                  </AvatarFallback>
                </Avatar>
                {org.name}
                <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            {organizations.length === 0 && (
              <div className="px-2 py-2 text-center text-xs text-muted-foreground">
                No organizations found
              </div>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2" onClick={() => { setIsCreateOpen(true); }}>

              <div className="flex h-6 w-6 items-center justify-center rounded-md border">
                <Plus className="h-4 w-4" />
              </div>
              <span className="text-muted-foreground font-medium">Add organization</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>

      {/* Create Organization Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Organization</DialogTitle>
            <DialogDescription>
              Enter a name for your new organization. You will switch to it automatically after creation.

            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <label htmlFor="org-name" className="text-sm font-medium">Organization Name</label>

              <Input
                id="org-name"
                placeholder="e.g. TechGear Inc."
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}

                disabled={isCreating}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isCreating}>

                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!newOrgName.trim()) return;
                  try {
                    setIsCreating(true);
                    await createOrganization(newOrgName.trim());
                    setIsCreateOpen(false);
                    setNewOrgName("");

                  } finally {
                    setIsCreating(false);
                  }
                }}
                disabled={isCreating || !newOrgName.trim()}
              >
                {isCreating ? (
                  <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Creating…</span>
                ) : (
                  "Create"

                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </SidebarMenu>
  );
}

export default OrgSelector;

