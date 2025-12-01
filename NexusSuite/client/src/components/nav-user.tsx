'use client';

import { Bell, ChevronsUpDown, CreditCard, LogOut, User } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';

export function NavUser({
  user,
}: {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
}) {
  const { isMobile } = useSidebar();
  const { logout } = useAuth();
  const [location, setLocation] = useLocation();

  function go(path: string) {
    try {
      console.log(`[NavUser] navigate: ${path}`);
      setLocation(path);
    } catch (e) {
      console.warn('[NavUser] navigation failed, falling back to window.location', e);

      window.location.assign(path);
    }
  }

  async function handleLogout() {
    try {
      console.log('[NavUser] Logout clicked');
      await logout();
    } catch (e) {
      console.error('[NavUser] Logout failed', e);
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu onOpenChange={() => {}}>
          <DropdownMenuTrigger asChild>
            {/* Wrapper element to hold the Radix ref. This avoids the React warning and ensures proper positioning/visibility. */}
            <div className="w-full" data-testid="navuser-trigger-wrapper">
              <SidebarMenuButton
                size="lg"
                className="rounded-md transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">
                    {getInitials(user.name, user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="z-[9999] w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg border border-sidebar-border/60 max-h-[100vh] opacity-100"
            side={isMobile ? 'bottom' : 'right'}
            align={isMobile ? 'end' : 'start'}
            sideOffset={6}
            collisionPadding={8}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">
                    {getInitials(user.name, user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onSelect={() => {
                  console.log('[NavUser] Profile clicked');
                  go('/profile');
                }}
              >
                <User />
                Profile
              </DropdownMenuItem>
              {(user as any)?.role === 'owner' ||
              (user as any)?.role === 'club_owner' ||
              ((user as any)?.permissions ?? []).includes('finance') ||
              ((user as any)?.permissions ?? []).includes('billing') ? (
                <DropdownMenuItem
                  onSelect={() => {
                    console.log('[NavUser] Billing clicked');
                    // Navigate to organization-scoped Billing page
                    go('/dashboard/org/billing');
                  }}
                >
                  <CreditCard />
                  Billing
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem
                onSelect={() => {
                  console.log('[NavUser] Notifications clicked');
                  // Route to Settings as a placeholder for notifications management
                  go('/settings');
                }}
              >
                <Bell />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleLogout}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
function getInitials(name: string, email: string): string {
  const base = (name && name.trim()) || (email || 'user').split('@')[0];
  const parts = base.split(/\s+|_/).filter(Boolean);
  const initials = parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : `${base[0] ?? 'U'}`;
  return initials.toUpperCase();
}
