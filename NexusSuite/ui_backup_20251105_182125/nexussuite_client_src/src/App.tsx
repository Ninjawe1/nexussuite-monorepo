import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { BottomProfile } from "@/components/bottom-profile";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useEffect } from "react";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Staff from "@/pages/staff";
import Team from "@/pages/team";
import Players from "@/pages/players";
import Payroll from "@/pages/payroll";
import Analytics from "@/pages/analytics";
import Matches from "@/pages/matches";
import Tournaments from "@/pages/tournaments";
import Marcom from "@/pages/marcom";
import Finance from "@/pages/finance";
import Contracts from "@/pages/contracts";
import Audit from "@/pages/audit";
import Settings from "@/pages/settings";
import Admin from "@/pages/admin";
import InviteAccept from "@/pages/invite-accept";
import Profile from "@/pages/profile";
// Admin section pages
import AdminUsersPage from "@/pages/admin/users";
import AdminBillingPage from "@/pages/admin/billing";
import AdminAnalyticsPage from "@/pages/admin/analytics";
import AdminContentPage from "@/pages/admin/content";
import AdminSettingsPage from "@/pages/admin/settings";
import AdminLogsPage from "@/pages/admin/logs";
import AdminCommunicationPage from "@/pages/admin/communication";
import AdminSecurityPage from "@/pages/admin/security";
import AdminRolesPage from "@/pages/admin/roles";
import AdminMarketingPage from "@/pages/admin/marketing";
import AdminReportsPage from "@/pages/admin/reports";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Allow access to invite page without auth
  if (window.location.pathname.startsWith('/invite/')) {
    return (
      <Switch>
        <Route path="/invite/:token" component={InviteAccept} />
      </Switch>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/register" component={Register} />
        <Route path="/login" component={Login} />
        <Route path="/" component={Landing} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/" component={user?.isSuperAdmin ? Admin : Dashboard} />
      <Route path="/admin" component={Admin} />
      {/* Super Admin nested sections */}
      <Route path="/admin/users" component={AdminUsersPage} />
      <Route path="/admin/billing" component={AdminBillingPage} />
      <Route path="/admin/analytics" component={AdminAnalyticsPage} />
      <Route path="/admin/content" component={AdminContentPage} />
      <Route path="/admin/settings" component={AdminSettingsPage} />
      <Route path="/admin/logs" component={AdminLogsPage} />
      <Route path="/admin/communication" component={AdminCommunicationPage} />
      <Route path="/admin/security" component={AdminSecurityPage} />
      <Route path="/admin/roles" component={AdminRolesPage} />
      <Route path="/admin/marketing" component={AdminMarketingPage} />
      <Route path="/admin/reports" component={AdminReportsPage} />

      <Route path="/dashboard" component={Dashboard} />
      {/* removed Staff route */}
      <Route path="/team" component={Team} />
      <Route path="/players" component={Players} />
      <Route path="/payroll" component={Payroll} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/matches" component={Matches} />
      <Route path="/tournaments" component={Tournaments} />
      <Route path="/marcom" component={Marcom} />
      <Route path="/finance" component={Finance} />
      <Route path="/contracts" component={Contracts} />
      <Route path="/profile" component={Profile} />
      {/* Files page removed */}
      <Route path="/audit" component={Audit} />
      <Route path="/settings" component={Settings} />
    </Switch>
  );
}

export default function App() {
  // Align global CSS variables with SidebarProvider defaults.
  // Desktop sidebar width bumped to 18rem for better spacing on larger screens.
  const style = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppWithFlags style={style as React.CSSProperties} />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function AppWithFlags({ style }: { style: React.CSSProperties }) {
  // Redesign feature flags and theme selector.
  // Usage:
  //   ?nova=1                         -> enables nova theme
  //   ?aqua=1                         -> enables aqua theme (teal)
  //   ?atomic=1                       -> enables atomic theme (deep teal)
  //   ?theme=nova|aqua|atomic         -> explicit theme selection
  // Persists in localStorage under `design:theme`.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const themeParam = params.get("theme");
      const useNova = params.get("nova") === "1";
      const useAqua = params.get("aqua") === "1";
      const useAtomic = params.get("atomic") === "1";

      let theme = themeParam === "aqua" || themeParam === "nova" || themeParam === "atomic" ? themeParam : undefined;
      if (!theme) theme = useNova ? "nova" : useAqua ? "aqua" : useAtomic ? "atomic" : undefined;
      if (theme) localStorage.setItem("design:theme", theme);

      const saved = localStorage.getItem("design:theme") || "nova"; // default nova to match requested dark dashboard
      document.documentElement.classList.remove("nova", "aqua", "atomic");
      document.documentElement.classList.add(saved);
    } catch (_) {
      // no-op
    }
  }, []);

  return <AuthenticatedApp style={style} />;
}

function AuthenticatedApp({ style }: { style: React.CSSProperties }) {
  const { isAuthenticated, isLoading, logout } = useAuth();

  // If unauthenticated (or still loading), render Router without the app shell.
  // This ensures the public Landing page is NOT wrapped by the sidebar/layout.
  if (isLoading || !isAuthenticated) {
    return <Router />;
  }

  // Authenticated users get the full application shell with sidebar.
  return (
    <SidebarProvider style={style}>
      <AppSidebar />
      <SidebarInset>
         <div className="relative">
           <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 border-b border-border bg-background">
             <SidebarTrigger data-testid="button-sidebar-toggle" />
             <div className="flex items-center gap-2">
               <Button
                 variant="ghost"
                 size="sm"
                 data-testid="button-logout"
                 onClick={() => logout()}
               >
                 <LogOut className="w-4 h-4 mr-2" />
                 Logout
               </Button>
               <ThemeToggle />
             </div>
           </header>
           <main className="min-h-screen p-4 overflow-auto">
             <Router />
           </main>
         </div>
       </SidebarInset>
    </SidebarProvider>
  );
}

