import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, User, Settings, ChevronUp } from 'lucide-react';
import { useLocation } from 'wouter';
import { tweakcn } from '@/lib/tweakcn';
import { useSidebar } from '@/components/ui/sidebar';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function BottomProfile() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const { state: sidebarState } = useSidebar();

  // Dropdown accessibility is handled by shadcn/ui DropdownMenu

  const handleLogout = async () => {
    try {
      await logout();
      setIsOpen(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleProfileClick = () => {
    setLocation('/profile');

    setIsOpen(false);
  };

  const handleSettingsClick = () => {
    setLocation('/settings');

    setIsOpen(false);
  };

  // Keyboard handling is built-in via DropdownMenu

  if (!user) return null;

  const isCollapsed = sidebarState === 'collapsed';

  return (
    <div
      className={tweakcn(
        // Render statically; footer wrapper handles absolute bottom-center
        'z-50',
        'transition-all duration-300 ease-in-out',
        'data-[sidebar-state=collapsed]:w-16 data-[sidebar-state=expanded]:w-auto'
      )}
      data-sidebar-state={sidebarState}
      role="complementary"
      aria-label={`User profile section - ${isCollapsed ? 'collapsed' : 'expanded'}`}
    >
      {/* Main Profile Card */}
      <div
        className={tweakcn(
          'group relative bg-background/95 backdrop-blur-sm border border-border/50',
          'rounded-xl shadow-lg transition-all duration-300 ease-in-out',
          'hover:shadow-xl hover:border-border/70 hover:bg-background',
          // Ensure inner content can center precisely
          'flex items-center',
          'data-[sidebar-state=collapsed]:justify-center data-[sidebar-state=expanded]:justify-center',
          isCollapsed ? 'px-2 py-2' : 'px-3 py-3'
        )}
        data-sidebar-state={sidebarState}
        aria-expanded={!isCollapsed}
        aria-label={`User profile ${sidebarState === 'collapsed' ? 'collapsed' : 'expanded'}`}
      >
        {/* Profile Dropdown using shadcn/ui */}
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <button
              className={tweakcn(
                // Center children both axes within button
                'flex items-center justify-center gap-3 rounded-xl transition-all duration-300 ease-in-out',
                'hover:bg-muted/60',
                'active:scale-[0.98] active:bg-muted/80',
                'touch-manipulation select-none',
                isCollapsed ? 'p-1.5' : 'justify-center gap-3 p-3 sm:p-2 lg:p-3'
              )}
              aria-expanded={isOpen}
              aria-haspopup="menu"
              aria-label={`User menu for ${user.firstName} ${user.lastName} - ${isCollapsed ? 'collapsed' : 'expanded'}`}
              aria-describedby="profile-description"
              disabled={isCollapsed}
            >
              {/* Avatar */}
              <div className="grid place-items-center">
                <Avatar
                  className={tweakcn(
                    'ring-2 transition-all duration-300 ease-in-out',
                    'ring-border/30 group-hover:ring-border/50 group-hover:scale-105',
                    'group-active:scale-95',
                    isCollapsed ? 'w-7 h-7 sm:w-8 sm:h-8' : 'w-9 h-9 sm:w-10 sm:h-10'
                  )}
                >
                  <AvatarImage
                    src={user?.profileImageUrl || undefined}
                    alt={`${user.firstName} ${user.lastName}`}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-medium flex items-center justify-center">
                    {user?.firstName?.[0]}
                    {user?.lastName?.[0] || user?.email?.[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Screen reader description */}
              <span id="profile-description" className="sr-only">
                {isCollapsed
                  ? 'User profile collapsed - expand sidebar for full profile options'
                  : 'Click to open user menu with profile, settings, and logout options'}
              </span>

              {/* User Info */}
              <div
                className={tweakcn(
                  // Align text block left relative to avatar when expanded
                  'flex flex-col justify-center items-start min-w-0 transition-all duration-300 ease-in-out',
                  isCollapsed ? 'hidden opacity-0 w-0' : 'flex opacity-100'
                )}
              >
                <span className="text-sm font-medium text-foreground truncate max-w-32 lg:max-w-40 text-left">
                  {user.firstName} {user.lastName}
                </span>
                <span className="text-xs text-muted-foreground truncate max-w-32 lg:max-w-40 text-left">
                  {user.email}
                </span>
              </div>

              {/* Chevron Icon */}
              <ChevronUp
                className={tweakcn(
                  'w-4 h-4 text-muted-foreground transition-all duration-300 ease-in-out flex-shrink-0',
                  isCollapsed ? 'hidden opacity-0' : 'block opacity-100',
                  isOpen ? 'rotate-180' : ''
                )}
              />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="w-56" align="start" sideOffset={8}>
            <DropdownMenuItem onClick={handleProfileClick} className="text-sm">
              <User className="w-4 h-4 mr-3 text-muted-foreground" />
              View Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSettingsClick} className="text-sm">
              <Settings className="w-4 h-4 mr-3 text-muted-foreground" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-sm text-destructive focus:text-destructive"
            >
              <LogOut className="w-4 h-4 mr-3" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Dropdown rendered above via DropdownMenu */}
      </div>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-[-1] md:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
