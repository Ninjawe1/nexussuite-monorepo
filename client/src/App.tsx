import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useEffect } from "react";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Staff from "@/pages/staff";
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
        <Route path="/" component={Login} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/" component={user?.isSuperAdmin ? Admin : Dashboard} />
      <Route path="/admin" component={Admin} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/staff" component={Staff} />
      <Route path="/payroll" component={Payroll} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/matches" component={Matches} />
      <Route path="/tournaments" component={Tournaments} />
      <Route path="/marcom" component={Marcom} />
      <Route path="/finance" component={Finance} />
      <Route path="/contracts" component={Contracts} />
      <Route path="/audit" component={Audit} />
      <Route path="/settings" component={Settings} />
    </Switch>
  );
}

export default function App() {
  const style = {
    "--sidebar-width": "280px",
    "--sidebar-width-icon": "80px",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthenticatedApp style={style as React.CSSProperties} />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function AuthenticatedApp({ style }: { style: React.CSSProperties }) {
  const { isAuthenticated, isLoading } = useAuth();

  // Check for pending invite token after login - runs once when auth completes
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const pendingToken = sessionStorage.getItem("pendingInviteToken");
      if (pendingToken) {
        // Redirect to invite page with token
        window.location.href = `/invite/${pendingToken}`;
      }
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading || !isAuthenticated) {
    return <Router />;
  }

  return (
    <SidebarProvider style={style}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between p-4 border-b border-border bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                data-testid="button-logout"
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  window.location.href = "/login";
                }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
