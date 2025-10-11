import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import Dashboard from "@/pages/dashboard";
import Staff from "@/pages/staff";
import Payroll from "@/pages/payroll";
import Analytics from "@/pages/analytics";
import Matches from "@/pages/matches";
import Marcom from "@/pages/marcom";
import Contracts from "@/pages/contracts";
import Audit from "@/pages/audit";
import Settings from "@/pages/settings";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/staff" component={Staff} />
      <Route path="/payroll" component={Payroll} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/matches" component={Matches} />
      <Route path="/marcom" component={Marcom} />
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
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
              <header className="flex items-center justify-between p-4 border-b border-border bg-background">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <ThemeToggle />
              </header>
              <main className="flex-1 overflow-auto">
                <Router />
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
