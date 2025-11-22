import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogOut, User, Settings, ChevronUp } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";

export function BottomProfile() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { state: sidebarState } = useSidebar();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown when pressing Escape and handle keyboard navigation
  useEffect(() => {
    function handleKeyboard(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
      
      // Handle keyboard navigation in dropdown
      if (isOpen && event.key === "ArrowDown") {
        event.preventDefault();
        const menuItems = dropdownRef.current?.querySelectorAll('[role="menuitem"]');
        if (menuItems && menuItems.length > 0) {
          (menuItems[0] as HTMLElement).focus();
        }
      }
      
      if (isOpen && event.key === "ArrowUp") {
        event.preventDefault();
        const menuItems = dropdownRef.current?.querySelectorAll('[role="menuitem"]');
        if (menuItems && menuItems.length > 0) {
          (menuItems[menuItems.length - 1] as HTMLElement).focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyboard);
    return () => document.removeEventListener("keydown", handleKeyboard);
  }, [isOpen]);

  const handleLogout = async () => {
    try {
      await logout();
      setIsOpen(false);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleProfileClick = () => {
    setLocation("/profile");
    setIsOpen(false);
  };

  const handleSettingsClick = () => {
    setLocation("/settings");
    setIsOpen(false);
  };

  const handleMenuKeyDown = (event: React.KeyboardEvent, currentIndex: number) => {
    const menuItems = dropdownRef.current?.querySelectorAll('[role="menuitem"]');
    if (!menuItems) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        const nextIndex = (currentIndex + 1) % menuItems.length;
        (menuItems[nextIndex] as HTMLElement).focus();
        break;
      case 'ArrowUp':
        event.preventDefault();
        const prevIndex = currentIndex === 0 ? menuItems.length - 1 : currentIndex - 1;
        (menuItems[prevIndex] as HTMLElement).focus();
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        (event.target as HTMLElement).click();
        break;
    }
  };

  if (!user) return null;

  const isCollapsed = sidebarState === "collapsed";

  return (
    <div 
      className={cn(
        // Render statically; footer wrapper handles absolute bottom-center
        "z-50",
        "transition-all duration-300 ease-in-out",
        "data-[sidebar-state=collapsed]:w-16 data-[sidebar-state=expanded]:w-auto"
      )}
      data-sidebar-state={sidebarState}
      ref={dropdownRef}
      role="complementary"
      aria-label={`User profile section - ${isCollapsed ? 'collapsed' : 'expanded'}`}
    >
      {/* Main Profile Card */}
      <div
        className={cn(
          "group relative bg-background/95 backdrop-blur-sm border border-border/50",
          "rounded-xl shadow-lg transition-all duration-300 ease-in-out",
          "hover:shadow-xl hover:border-border/70 hover:bg-background",
          // Ensure inner content can center precisely
          "flex items-center",
          "data-[sidebar-state=collapsed]:justify-center data-[sidebar-state=expanded]:justify-center",
          isCollapsed ? "px-2 py-2" : "px-3 py-3"
        )}
        data-sidebar-state={sidebarState}
        aria-expanded={!isCollapsed}
        aria-label={`User profile ${sidebarState === "collapsed" ? "collapsed" : "expanded"}`}
      >
        {/* Profile Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            // Center children both axes within button
            "flex items-center justify-center gap-3 rounded-xl transition-all duration-300 ease-in-out",
            "hover:bg-muted/60",
            "active:scale-[0.98] active:bg-muted/80",
            "touch-manipulation select-none",
            isCollapsed ? "p-1.5" : "justify-center gap-3 p-3 sm:p-2 lg:p-3"
          )}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          aria-label={`User menu for ${user.firstName} ${user.lastName} - ${isCollapsed ? 'collapsed' : 'expanded'}`}
          aria-describedby="profile-description"
          disabled={isCollapsed}
        >
          {/* Avatar */}
          <div className="grid place-items-center">
            <Avatar className={cn(
              "ring-2 transition-all duration-300 ease-in-out",
              "ring-border/30 group-hover:ring-border/50 group-hover:scale-105",
              "group-active:scale-95",
              isCollapsed ? "w-7 h-7 sm:w-8 sm:h-8" : "w-9 h-9 sm:w-10 sm:h-10"
            )}>
              <AvatarImage 
                src={user?.profileImageUrl || undefined} 
                alt={`${user.firstName} ${user.lastName}`}
                className="object-cover"
              />
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-medium flex items-center justify-center">
                {user?.firstName?.[0]}{user?.lastName?.[0] || user?.email?.[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {/* Online indicator removed for clean UI */}
          </div>
          
          {/* Screen reader description */}
          <span id="profile-description" className="sr-only">
            {isCollapsed 
              ? "User profile collapsed - click to expand sidebar for full profile options" 
              : "Click to open user menu with profile, settings, and logout options"}
          </span>

          {/* User Info */}
          <div className={cn(
            // Align text block left relative to avatar when expanded
            "flex flex-col justify-center items-start min-w-0 transition-all duration-300 ease-in-out",
            isCollapsed ? "hidden opacity-0 w-0" : "flex opacity-100"
          )}>
            <span className="text-sm font-medium text-foreground truncate max-w-32 lg:max-w-40 text-left">
              {user.firstName} {user.lastName}
            </span>
            <span className="text-xs text-muted-foreground truncate max-w-32 lg:max-w-40 text-left">
              {user.email}
            </span>
          </div>

          {/* Chevron Icon */}
          <ChevronUp className={cn(
            "w-4 h-4 text-muted-foreground transition-all duration-300 ease-in-out flex-shrink-0",
            isCollapsed ? "hidden opacity-0" : "block opacity-100",
            isOpen ? "rotate-180" : ""
          )} />
        </button>

        {/* Dropdown Menu */}
        <div
          className={cn(
            "absolute bottom-full mb-2 w-56 origin-bottom",
            "bg-popover border border-border rounded-xl shadow-xl backdrop-blur-sm",
            "transition-all duration-200 ease-in-out",
            "before:content-[''] before:absolute before:top-full before:w-0 before:h-0",
            "before:border-l-8 before:border-r-8 before:border-t-8",
            "before:border-l-transparent before:border-r-transparent before:border-t-border",
            "data-[sidebar-state=collapsed]:before:left-6 data-[sidebar-state=expanded]:before:left-4",
            "data-[sidebar-state=collapsed]:left-0 data-[sidebar-state=collapsed]:w-48",
            "data-[sidebar-state=expanded]:left-0 data-[sidebar-state=expanded]:w-56",
            isOpen 
              ? "opacity-100 scale-100 translate-y-0" 
              : "opacity-0 scale-95 translate-y-2 pointer-events-none"
          )}
          role="menu"
          aria-hidden={!isOpen}
          data-sidebar-state={sidebarState}
        >
          <div className="p-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleProfileClick}
              className="w-full justify-start text-sm hover:bg-muted/50 focus:bg-muted/60"
              role="menuitem"
              tabIndex={isOpen ? 0 : -1}
              onKeyDown={(e) => handleMenuKeyDown(e, 0)}
            >
              <User className="w-4 h-4 mr-3 text-muted-foreground" />
              View Profile
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSettingsClick}
              className="w-full justify-start text-sm hover:bg-muted/50 focus:bg-muted/60"
              role="menuitem"
              tabIndex={isOpen ? 0 : -1}
              onKeyDown={(e) => handleMenuKeyDown(e, 1)}
            >
              <Settings className="w-4 h-4 mr-3 text-muted-foreground" />
              Settings
            </Button>
            <div className="my-1.5 h-px bg-border/50" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full justify-start text-sm text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10"
              role="menuitem"
              tabIndex={isOpen ? 0 : -1}
              onKeyDown={(e) => handleMenuKeyDown(e, 2)}
            >
              <LogOut className="w-4 h-4 mr-3" />
              Sign Out
            </Button>
          </div>
        </div>
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

